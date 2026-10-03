-- Push notifications on the phone apps. Safe to run twice.
--
-- Every booking event already lands in public.inbox (the bell). A push rides on those rows:
-- an inbox row of a pushed kind, for a person who has the app and has not switched push off,
-- adds one 'push' row to the notification queue, and the notify function sends it through Firebase.
--
-- Owners hear: new booking, booking request, cancellation, move.
-- Clients hear: confirmed, not accepted, cancelled, moved, and both reminders.
-- Nobody gets a push for their own action, because the inbox never has those rows.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.inbox') IS NULL OR to_regclass('public.notification_queue') IS NULL THEN
    RAISE EXCEPTION 'Run notification-queue.sql and booking-notifications.sql first';
  END IF;
END;
$$;

-- One switch per person, on until they turn it off.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;

-- One row per phone. A phone that changes account moves to the new one.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  token text PRIMARY KEY CHECK (length(token) BETWEEN 20 AND 4096),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  app_version text CHECK (app_version IS NULL OR length(app_version) <= 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user ON public.push_tokens (user_id, last_seen_at DESC);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_tokens FROM PUBLIC, anon, authenticated;

ALTER TABLE public.notification_queue DROP CONSTRAINT IF EXISTS notification_queue_channel_check;
ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_channel_check
  CHECK (channel IN ('email', 'whatsapp', 'in_app', 'push'));


CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text, p_app_version text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  IF p_platform NOT IN ('android', 'ios') OR length(coalesce(p_token, '')) NOT BETWEEN 20 AND 4096 THEN
    RAISE EXCEPTION 'Not a phone token' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
    RETURN;
  END IF;

  INSERT INTO public.push_tokens (token, user_id, platform, app_version)
  VALUES (p_token, v_uid, p_platform, left(p_app_version, 40))
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
        app_version = EXCLUDED.app_version, last_seen_at = now();

  -- Ten phones is plenty; the oldest go first.
  DELETE FROM public.push_tokens
   WHERE user_id = v_uid
     AND token <> p_token
     AND token NOT IN (SELECT token FROM public.push_tokens WHERE user_id = v_uid ORDER BY token = p_token DESC, last_seen_at DESC LIMIT 10);
END;
$$;

-- Signing out forgets this phone. No token means every phone, for "sign out everywhere".
CREATE OR REPLACE FUNCTION public.forget_push_token(p_token text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  DELETE FROM public.push_tokens
   WHERE user_id = auth.uid()
     AND (p_token IS NULL OR token = p_token);
$$;

CREATE OR REPLACE FUNCTION public.set_push_enabled(p_on boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  UPDATE public.users SET push_enabled = coalesce(p_on, true) WHERE id = auth.uid();
  RETURN coalesce(p_on, true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_push_token(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.forget_push_token(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_push_enabled(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.forget_push_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_push_enabled(boolean) TO authenticated;


-- Inbox row in, push row out. Wrapped so a push problem can never stop a booking.
CREATE OR REPLACE FUNCTION public.queue_push_from_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  BEGIN
    IF NOT (
         (NEW.audience = 'business' AND NEW.kind IN ('booking_new', 'booking_request', 'booking_cancelled', 'booking_moved'))
      OR (NEW.audience = 'client' AND NEW.kind IN ('booking_confirmed', 'booking_declined', 'booking_cancelled', 'booking_moved', 'booking_reminder'))
    ) THEN
      RETURN NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.push_enabled)
       OR NOT EXISTS (SELECT 1 FROM public.push_tokens t WHERE t.user_id = NEW.user_id) THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.notification_queue (kind, channel, recipient_user, business_id, appointment_id, payload, dedupe_key)
    VALUES (
      NEW.kind, 'push', NEW.user_id, NEW.business_id, NEW.appointment_id,
      NEW.payload || jsonb_build_object('audience', NEW.audience, 'inbox_id', NEW.id),
      'push:' || NEW.id
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.queue_push_from_inbox() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS queue_push_from_inbox ON public.inbox;
CREATE TRIGGER queue_push_from_inbox
  AFTER INSERT ON public.inbox
  FOR EACH ROW EXECUTE FUNCTION public.queue_push_from_inbox();

COMMIT;
