-- Notification queue for every message LocAppoint sends (email now, WhatsApp and in-app later).
-- Named notification_queue because an older public.notifications table already exists and is left alone.
-- Safe to run more than once. Needs Cron (Integrations) and pg_net (Database, Extensions) turned on first.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'Turn on Cron first: Integrations, Cron, enable. Then run this again.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'Turn on pg_net first: Database, Extensions, search pg_net, enable. Then run this again.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp', 'in_app')),
  recipient_user uuid REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email text,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  provider_id text,
  dedupe_key text UNIQUE,
  send_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_queue_due ON public.notification_queue (send_after) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS notification_queue_recipient ON public.notification_queue (recipient_user, created_at DESC);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_queue FROM anon, authenticated;


-- The sender claims a batch. Rows stuck in "sending" for 5 minutes are picked up again.

CREATE OR REPLACE FUNCTION public.claim_notifications(p_limit integer DEFAULT 20)
RETURNS SETOF public.notification_queue
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.notification_queue n
     SET status = 'sending', attempts = n.attempts + 1, locked_at = now()
   WHERE n.id IN (
           SELECT q.id FROM public.notification_queue q
            WHERE (q.status = 'pending' AND q.send_after <= now())
               OR (q.status = 'sending' AND q.locked_at < now() - interval '5 minutes')
            ORDER BY q.send_after
            LIMIT greatest(1, least(p_limit, 100))
            FOR UPDATE SKIP LOCKED
         )
  RETURNING n.*;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notifications(integer) TO service_role;


-- Wakes the sender straight away after new rows, so nobody waits for the next minute.
-- Never blocks the insert: if Vault is not set up yet, the every-minute job still sends.

CREATE OR REPLACE FUNCTION public.notification_queue_kick()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_secret')
      ),
      body := '{"reason":"insert"}'::jsonb
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notification_queue_kick() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_kick ON public.notification_queue;
CREATE TRIGGER notifications_kick
  AFTER INSERT ON public.notification_queue
  FOR EACH STATEMENT EXECUTE FUNCTION public.notification_queue_kick();


-- Welcome email, once per person, the moment their email is confirmed.
-- Wrapped so a problem here can never stop someone confirming their email.

CREATE OR REPLACE FUNCTION public.notify_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL OR NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, payload, dedupe_key)
    VALUES (
      CASE WHEN NEW.raw_user_meta_data->>'user_type' = 'business' THEN 'welcome_business' ELSE 'welcome_client' END,
      CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.id) THEN NEW.id END,
      NEW.email,
      jsonb_build_object('name', NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), '')),
      'welcome:' || NEW.id
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_welcome() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_welcome ON auth.users;
CREATE TRIGGER notify_welcome
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_welcome();


-- Every minute: replaced if it already exists.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'notify-every-minute';

SELECT cron.schedule(
  'notify-every-minute',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_secret')
    ),
    body := '{"reason":"cron"}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.notification_queue WHERE status IN ('pending', 'sending'));
  $job$
);

-- "You're live" email when a business first goes live.

CREATE OR REPLACE FUNCTION public.notify_business_live()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  BEGIN
    SELECT au.email, NULLIF(trim(coalesce(u.full_name, au.raw_user_meta_data->>'full_name')), '')
      INTO v_email, v_name
      FROM auth.users au
      LEFT JOIN public.users u ON u.id = au.id
     WHERE au.id = NEW.user_id;

    IF v_email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, payload, dedupe_key)
      VALUES (
        'business_live',
        CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id) THEN NEW.user_id END,
        v_email,
        NEW.id,
        jsonb_build_object('name', v_name, 'business_name', NEW.business_name, 'slug', NEW.slug, 'auto_confirm', NEW.auto_confirm),
        'business_live:' || NEW.id
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_business_live() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_business_live ON public.businesses;
CREATE TRIGGER notify_business_live
  AFTER UPDATE ON public.businesses
  FOR EACH ROW
  WHEN (OLD.launched_at IS NULL AND NEW.launched_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_business_live();

DROP TRIGGER IF EXISTS notify_business_live_insert ON public.businesses;
CREATE TRIGGER notify_business_live_insert
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  WHEN (NEW.launched_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_business_live();

COMMIT;
