-- Saved cards leave with the person. When a Locappoint account is deleted (or a business, or a
-- stale link), the Stripe customer it pointed to is queued here before our row disappears, and the
-- payments-webhook function deletes that customer on the business's Stripe account, which removes
-- the cards saved under it. Payments and refunds stay on the business's account: the business keeps
-- its records. The deletion itself never waits for Stripe. Needs saved-cards.sql. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.payment_customers') IS NULL OR to_regprocedure('public.payment_refunds_kick()') IS NULL THEN
    RAISE EXCEPTION 'Run pay-at-booking.sql and saved-cards.sql first';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.payment_cleanup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'paystack')),
  account_ref text NOT NULL CHECK (char_length(account_ref) BETWEEN 3 AND 100),
  customer_ref text NOT NULL CHECK (char_length(customer_ref) BETWEEN 3 AND 100),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'done', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_cleanup_open ON public.payment_cleanup (created_at) WHERE status IN ('queued', 'sending');

ALTER TABLE public.payment_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_cleanup FROM anon, authenticated;

DROP TRIGGER IF EXISTS update_payment_cleanup_updated_at ON public.payment_cleanup;
CREATE TRIGGER update_payment_cleanup_updated_at BEFORE UPDATE ON public.payment_cleanup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Every way a payment_customers row goes (account deleted, business deleted, link replaced) queues
-- its Stripe customer first.
CREATE OR REPLACE FUNCTION public.payment_customers_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.payment_cleanup (provider, account_ref, customer_ref)
  VALUES (OLD.provider, OLD.account_ref, OLD.customer_ref);
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_customers_cleanup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS payment_customers_cleanup ON public.payment_customers;
CREATE TRIGGER payment_customers_cleanup
  BEFORE DELETE ON public.payment_customers
  FOR EACH ROW EXECUTE FUNCTION public.payment_customers_cleanup();

-- A customer replaced in place (the business's Stripe account changed) is cleaned up too.
CREATE OR REPLACE FUNCTION public.payment_customers_replaced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.customer_ref IS DISTINCT FROM OLD.customer_ref THEN
    INSERT INTO public.payment_cleanup (provider, account_ref, customer_ref)
    VALUES (OLD.provider, OLD.account_ref, OLD.customer_ref);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_customers_replaced() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS payment_customers_replaced ON public.payment_customers;
CREATE TRIGGER payment_customers_replaced
  BEFORE UPDATE ON public.payment_customers
  FOR EACH ROW EXECUTE FUNCTION public.payment_customers_replaced();

-- Wake the sender, the same way a refund does.
DROP TRIGGER IF EXISTS payment_cleanup_kick ON public.payment_cleanup;
CREATE TRIGGER payment_cleanup_kick
  AFTER INSERT ON public.payment_cleanup
  FOR EACH STATEMENT EXECUTE FUNCTION public.payment_refunds_kick();

CREATE OR REPLACE FUNCTION public.claim_cleanups(p_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, provider text, account_ref text, customer_ref text, attempts integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.payment_cleanup c
     SET status = 'sending', attempts = c.attempts + 1
   WHERE c.id IN (
     SELECT x.id FROM public.payment_cleanup x
      WHERE x.status = 'queued' OR (x.status = 'sending' AND x.updated_at < now() - interval '10 minutes')
      ORDER BY x.created_at
      LIMIT greatest(1, least(p_limit, 50))
      FOR UPDATE SKIP LOCKED)
  RETURNING c.id, c.provider, c.account_ref, c.customer_ref, c.attempts;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_done(p_id uuid, p_ok boolean, p_error text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.payment_cleanup
     SET status = CASE WHEN p_ok THEN 'done' WHEN attempts >= 8 THEN 'failed' ELSE 'queued' END,
         done_at = CASE WHEN p_ok THEN now() ELSE NULL END,
         last_error = CASE WHEN p_ok THEN NULL ELSE left(p_error, 500) END
   WHERE id = p_id AND status = 'sending';
$$;

REVOKE EXECUTE ON FUNCTION public.claim_cleanups(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_done(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_cleanups(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_done(uuid, boolean, text) TO service_role;

-- The every-minute job now also wakes the sender for queued cleanups.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'payments-every-minute';

SELECT cron.schedule(
  'payments-every-minute',
  '* * * * *',
  $job$
  SELECT public.release_payment_holds();
  SELECT net.http_post(
    url := public.payments_url(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_secret')
    ),
    body := '{"reason":"cron"}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.payment_refunds WHERE status IN ('queued', 'sending'))
     OR EXISTS (SELECT 1 FROM public.payment_cleanup WHERE status IN ('queued', 'sending'));
  $job$
);

COMMIT;
