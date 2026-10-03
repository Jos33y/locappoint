-- Guard: limits on what anyone without an account can write, internal functions closed, old data trimmed, and an intake for app crashes.
-- Safe to run twice.

-- 1. Counting hits per connection or per business, in fixed windows

CREATE TABLE IF NOT EXISTS public.rate_hits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, window_start)
);
ALTER TABLE public.rate_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_hits FROM PUBLIC, anon, authenticated;

-- The caller's address as Supabase's edge sees it, hashed so no plain address is stored.
-- Cloudflare's header cannot be set by the client; x-forwarded-for is the fallback.
CREATE OR REPLACE FUNCTION public.request_origin()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
DECLARE
  h json;
BEGIN
  BEGIN
    h := NULLIF(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  RETURN md5(NULLIF(trim(COALESCE(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1))), ''));
END;
$$;

-- Anyone signed out, as opposed to a signed-in person or a server job.
CREATE OR REPLACE FUNCTION public.request_is_anon()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  ) = 'anon'
$$;

-- Counts one hit and says whether the bucket is still under its limit. The hit rolls back with a failed request.
CREATE OR REPLACE FUNCTION public.rate_ok(p_bucket text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_start timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
BEGIN
  IF p_bucket IS NULL THEN
    RETURN true;
  END IF;
  INSERT INTO public.rate_hits AS r (bucket, window_start, hits)
  VALUES (p_bucket, v_start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING hits INTO v_hits;
  RETURN v_hits <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_origin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_is_anon() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rate_ok(text, integer, integer) FROM PUBLIC, anon, authenticated;

-- 2. Guest bookings: a flood from one connection, or onto one business, has to sign in.
-- Generous for a real shop: six from one connection in ten minutes (phones share addresses on mobile networks), eight onto one business in fifteen, forty in a day.

CREATE OR REPLACE FUNCTION public.appointments_guest_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_ip text;
BEGIN
  IF auth.uid() IS NOT NULL OR NOT public.request_is_anon() THEN
    RETURN NEW;
  END IF;
  v_ip := public.request_origin();
  IF NOT public.rate_ok(CASE WHEN v_ip IS NOT NULL THEN 'book:ip:' || v_ip END, 6, 600)
     OR NOT public.rate_ok('book:biz:' || NEW.business_id, 8, 900)
     OR NOT public.rate_ok('book:bizday:' || NEW.business_id, 40, 86400) THEN
    RAISE EXCEPTION 'Lots of bookings are coming in right now. Sign in to book, or try again in a few minutes.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_guest_guard ON public.appointments;
CREATE TRIGGER appointments_guest_guard
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_guest_guard();

-- 3. Waitlist, contact and partnership forms: a handful per connection per hour.

CREATE OR REPLACE FUNCTION public.form_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_ip text := public.request_origin();
  v_limit integer := CASE TG_TABLE_NAME WHEN 'waitlist' THEN 5 ELSE 3 END;
BEGIN
  IF v_ip IS NULL OR NOT public.request_is_anon() THEN
    RETURN NEW;
  END IF;
  IF NOT public.rate_ok('form:' || TG_TABLE_NAME || ':' || v_ip, v_limit, 3600) THEN
    RAISE EXCEPTION 'Too many sent from this connection. Try again in an hour.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waitlist_form_guard ON public.waitlist;
CREATE TRIGGER waitlist_form_guard BEFORE INSERT ON public.waitlist FOR EACH ROW EXECUTE FUNCTION public.form_guard();
DROP TRIGGER IF EXISTS contact_form_guard ON public.contact_messages;
CREATE TRIGGER contact_form_guard BEFORE INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.form_guard();
DROP TRIGGER IF EXISTS partnership_form_guard ON public.partnership_requests;
CREATE TRIGGER partnership_form_guard BEFORE INSERT ON public.partnership_requests FOR EACH ROW EXECUTE FUNCTION public.form_guard();

-- Sizes, so a form cannot be used to store megabytes. NOT VALID: old rows are left alone, new ones are checked.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_messages_sizes') THEN
    ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_sizes CHECK (
      length(name) <= 200 AND length(email) <= 254 AND COALESCE(length(phone), 0) <= 40
      AND COALESCE(length(subject), 0) <= 200 AND length(message) <= 5000
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnership_requests_sizes') THEN
    ALTER TABLE public.partnership_requests ADD CONSTRAINT partnership_requests_sizes CHECK (
      COALESCE(length(first_name), 0) <= 200 AND COALESCE(length(last_name), 0) <= 200 AND COALESCE(length(email), 0) <= 254
      AND COALESCE(length(phone), 0) <= 40 AND COALESCE(length(organization_type), 0) <= 200 AND COALESCE(length(organization_name), 0) <= 200
      AND COALESCE(length(city), 0) <= 200 AND COALESCE(length(country), 0) <= 200 AND COALESCE(length(partnership_interest), 0) <= 5000
    ) NOT VALID;
  END IF;
END;
$$;

-- 4. Visitor counting: past a sensible rate from one connection, extra rows are dropped quietly so the numbers stay honest.

CREATE OR REPLACE FUNCTION public.stats_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_ip text := public.request_origin();
BEGIN
  IF v_ip IS NULL OR NOT public.request_is_anon() THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'page_stats' THEN
    IF NOT public.rate_ok('stats:' || v_ip || ':' || NEW.business_id, 60, 3600) THEN
      RETURN NULL;
    END IF;
  ELSIF NOT public.rate_ok('stats:' || TG_TABLE_NAME || ':' || v_ip, 120, 3600) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_stats_guard ON public.page_stats;
CREATE TRIGGER page_stats_guard BEFORE INSERT ON public.page_stats FOR EACH ROW EXECUTE FUNCTION public.stats_guard();
DROP TRIGGER IF EXISTS analytics_sessions_guard ON public.analytics_sessions;
CREATE TRIGGER analytics_sessions_guard BEFORE INSERT ON public.analytics_sessions FOR EACH ROW EXECUTE FUNCTION public.stats_guard();
DROP TRIGGER IF EXISTS analytics_events_guard ON public.analytics_events;
CREATE TRIGGER analytics_events_guard BEFORE INSERT ON public.analytics_events FOR EACH ROW EXECUTE FUNCTION public.stats_guard();

-- 5. App crashes, reported by the app itself. One row per distinct error, counted, capped.

CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  message text NOT NULL,
  stack text,
  app text,
  path text,
  release text,
  user_agent text,
  user_id uuid,
  count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_errors FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.client_errors TO authenticated;
DROP POLICY IF EXISTS client_errors_admin_read ON public.client_errors;
CREATE POLICY client_errors_admin_read ON public.client_errors FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS client_errors_admin_clear ON public.client_errors;
CREATE POLICY client_errors_admin_clear ON public.client_errors FOR DELETE TO authenticated USING (public.is_admin());
CREATE INDEX IF NOT EXISTS client_errors_recent ON public.client_errors (last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.report_client_error(p_message text, p_stack text, p_app text, p_path text, p_release text, p_user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_ip text := public.request_origin();
  v_message text := left(COALESCE(NULLIF(trim(p_message), ''), 'Unknown error'), 500);
  v_stack text := left(p_stack, 4000);
  v_release text := left(p_release, 40);
  -- Same error in the same release is one row: message plus the first frame of the stack.
  v_fp text := md5(v_message || '|' || COALESCE(split_part(v_stack, E'\n', 2), '') || '|' || COALESCE(v_release, ''));
BEGIN
  IF NOT public.rate_ok(CASE WHEN v_ip IS NOT NULL THEN 'errors:' || v_ip END, 20, 3600) THEN
    RETURN;
  END IF;
  UPDATE public.client_errors
     SET count = count + 1, last_seen_at = now(), path = left(p_path, 300)
   WHERE fingerprint = v_fp;
  IF FOUND THEN
    RETURN;
  END IF;
  -- A runaway bug should not fill the database.
  IF (SELECT count(*) FROM public.client_errors) >= 2000 THEN
    RETURN;
  END IF;
  INSERT INTO public.client_errors (fingerprint, message, stack, app, path, release, user_agent, user_id)
  VALUES (v_fp, v_message, v_stack, left(p_app, 20), left(p_path, 300), v_release, left(p_user_agent, 300), auth.uid())
  ON CONFLICT (fingerprint) DO UPDATE SET count = public.client_errors.count + 1, last_seen_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.report_client_error(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_error(text, text, text, text, text, text) TO anon, authenticated;

-- 6. Trigger functions are not meant to be called over the API. Triggers still run them.

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prorettype = 'trigger'::regtype
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END;
$$;

-- 7. The demo business is marked, so clients are not fooled into booking a real visit there.

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE public.businesses SET is_demo = true WHERE slug = 'femtos-barbearia' AND NOT is_demo;

-- 8. Nightly trim. Personal details leave old emails after 90 days; the rows stay so nothing is ever sent twice.

CREATE OR REPLACE FUNCTION public.trim_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.rate_hits WHERE window_start < now() - interval '2 days';
  DELETE FROM public.client_errors WHERE last_seen_at < now() - interval '60 days';
  DELETE FROM public.analytics_events WHERE created_at < now() - interval '13 months';
  DELETE FROM public.analytics_sessions WHERE created_at < now() - interval '13 months';
  UPDATE public.notification_queue
     SET payload = '{}'::jsonb, recipient_email = NULL, last_error = NULL
   WHERE status NOT IN ('pending', 'sending')
     AND created_at < now() - interval '90 days'
     AND (payload <> '{}'::jsonb OR recipient_email IS NOT NULL);
  -- The periods the Privacy Policy promises.
  DELETE FROM public.contact_messages WHERE created_at < now() - interval '24 months';
  DELETE FROM public.partnership_requests WHERE created_at < now() - interval '24 months';
  DELETE FROM public.waitlist w
   WHERE w.created_at < now() - interval '24 months'
     AND NOT EXISTS (SELECT 1 FROM public.users u WHERE lower(u.email) = lower(w.email));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trim_old_data() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'trim-old-data';
SELECT cron.schedule('trim-old-data', '23 3 * * *', 'SELECT public.trim_old_data()');
