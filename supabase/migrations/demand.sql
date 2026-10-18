-- geo0: every search is kept, so we can see where people want Locappoint (doc 35). A search from
-- the website, the app or WhatsApp adds one row: what was asked, where for, where the person is (a
-- country, never an address), and how much we found. "Tell me when" keeps a contact for a search we
-- could not answer. Admins read it all in /admin, Demand. Safe to run again.

-- 0. Stop if an older table of the same name is in the way, rather than writing into it.
DO $$
BEGIN
  IF to_regclass('public.search_log') IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_log' AND column_name = 'matched') THEN
    RAISE EXCEPTION 'A different public.search_log already exists. Check what uses it before running this.';
  END IF;
  IF to_regclass('public.search_wish') IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_wish' AND column_name = 'told_at') THEN
    RAISE EXCEPTION 'A different public.search_wish already exists. Check what uses it before running this.';
  END IF;
END;
$$;

-- 1. The searches. Places are kept to the area, or a pin rounded to about 1 km.
CREATE TABLE IF NOT EXISTS public.search_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL CHECK (channel IN ('web', 'app', 'whatsapp')),
  query text NOT NULL CHECK (length(query) BETWEEN 1 AND 120),
  market text,
  target_country text CHECK (target_country ~ '^[A-Z]{2}$'),
  zone text CHECK (length(zone) <= 80),
  lat numeric(5,2),
  lng numeric(5,2),
  mode text CHECK (mode IN ('at_business', 'at_client', 'online')),
  people integer CHECK (people BETWEEN 1 AND 50),
  origin_country text CHECK (origin_country ~ '^[A-Z]{2}$'),
  origin_tz text CHECK (length(origin_tz) <= 64),
  options integer NOT NULL DEFAULT 0 CHECK (options >= 0),
  later integer NOT NULL DEFAULT 0 CHECK (later >= 0),
  matched integer NOT NULL DEFAULT 0 CHECK (matched >= 0),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS search_log_created ON public.search_log (created_at DESC);
ALTER TABLE public.search_log ENABLE ROW LEVEL SECURITY;
-- No policies: only the functions below read or write it.

-- 2. "Tell me when": a contact for a search we could not answer, or for a country we are not in.
CREATE TABLE IF NOT EXISTS public.search_wish (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  query text CHECK (length(query) <= 120),
  market text,
  target_country text CHECK (target_country ~ '^[A-Z]{2}$'),
  zone text CHECK (length(zone) <= 80),
  origin_country text CHECK (origin_country ~ '^[A-Z]{2}$'),
  email text CHECK (email IS NULL OR (length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{7,15}$'),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  told_at timestamptz,
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS search_wish_created ON public.search_wish (created_at DESC);
ALTER TABLE public.search_wish ENABLE ROW LEVEL SECURITY;

-- The country a city is in, until cities become countries (geo1).
CREATE OR REPLACE FUNCTION public.market_country(p_market text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(coalesce(p_market, '')) WHEN 'lagos' THEN 'NG' WHEN 'porto' THEN 'PT' WHEN 'lisbon' THEN 'PT' END;
$$;

-- 3. One search, from the website or app (after the results show) or from WhatsApp (service role).
--    Never fails a search: bad values are dropped, and too many from one place are skipped quietly.
CREATE OR REPLACE FUNCTION public.search_note(
  p_channel text, p_query text, p_market text DEFAULT NULL, p_zone text DEFAULT NULL,
  p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL,
  p_mode text DEFAULT NULL, p_people integer DEFAULT 1,
  p_origin_country text DEFAULT NULL, p_origin_tz text DEFAULT NULL,
  p_options integer DEFAULT 0, p_later integer DEFAULT 0, p_matched integer DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_query text := left(btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')), 120);
  v_origin text := upper(btrim(coalesce(p_origin_country, '')));
BEGIN
  IF v_query = '' OR p_channel NOT IN ('web', 'app', 'whatsapp') THEN RETURN; END IF;
  -- Only our own server writes WhatsApp rows.
  IF p_channel = 'whatsapp' AND coalesce(auth.role(), '') <> 'service_role' THEN RETURN; END IF;
  IF p_channel <> 'whatsapp' THEN
    IF v_uid IS NULL THEN
      IF NOT public.rate_ok(CASE WHEN public.request_origin() IS NOT NULL THEN 'demand:ip:' || public.request_origin() END, 60, 600) THEN RETURN; END IF;
    ELSIF NOT public.rate_ok('demand:user:' || v_uid, 120, 600) THEN
      RETURN;
    END IF;
  END IF;
  INSERT INTO public.search_log (channel, query, market, target_country, zone, lat, lng, mode, people,
                                 origin_country, origin_tz, options, later, matched, user_id)
  VALUES (p_channel, v_query, lower(nullif(btrim(p_market), '')), public.market_country(p_market),
          left(nullif(btrim(p_zone), ''), 80),
          CASE WHEN p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 THEN round(p_lat::numeric, 2) END,
          CASE WHEN p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 THEN round(p_lng::numeric, 2) END,
          CASE WHEN p_mode IN ('at_business', 'at_client', 'online') THEN p_mode END,
          greatest(1, least(coalesce(p_people, 1), 50)),
          CASE WHEN v_origin ~ '^[A-Z]{2}$' AND v_origin NOT IN ('XX', 'T1') THEN v_origin END,
          left(nullif(btrim(p_origin_tz), ''), 64),
          greatest(coalesce(p_options, 0), 0), greatest(coalesce(p_later, 0), 0), greatest(coalesce(p_matched, 0), 0),
          v_uid);
  -- Searches are kept 13 months (privacy policy); about one call in a hundred clears older ones.
  IF random() < 0.01 THEN
    DELETE FROM public.search_log WHERE created_at < now() - interval '13 months';
  END IF;
END;
$$;

-- 4. "Tell me when". An email or a phone number; a country code for a country we are not in.
CREATE OR REPLACE FUNCTION public.search_wish_add(
  p_query text, p_market text DEFAULT NULL, p_zone text DEFAULT NULL, p_target_country text DEFAULT NULL,
  p_origin_country text DEFAULT NULL, p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_target text := upper(nullif(btrim(coalesce(p_target_country, '')), ''));
  v_origin text := upper(btrim(coalesce(p_origin_country, '')));
BEGIN
  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'Add an email or a WhatsApp number' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Check the email' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NOT NULL AND v_phone !~ '^\+?[0-9]{7,15}$' THEN
    RAISE EXCEPTION 'Check the number' USING ERRCODE = '22023';
  END IF;
  IF NOT public.rate_ok(CASE WHEN v_uid IS NOT NULL THEN 'wish:user:' || v_uid
                             WHEN public.request_origin() IS NOT NULL THEN 'wish:ip:' || public.request_origin() END, 10, 600) THEN
    RAISE EXCEPTION 'Lots of requests from here. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.search_wish (query, market, target_country, zone, origin_country, email, phone, user_id)
  VALUES (left(nullif(btrim(coalesce(p_query, '')), ''), 120), lower(nullif(btrim(p_market), '')),
          coalesce(CASE WHEN v_target ~ '^[A-Z]{2}$' THEN v_target END, public.market_country(p_market)),
          left(nullif(btrim(p_zone), ''), 80),
          CASE WHEN v_origin ~ '^[A-Z]{2}$' AND v_origin NOT IN ('XX', 'T1') THEN v_origin END,
          v_email, v_phone, v_uid);
  -- Contacts are kept 24 months at most (privacy policy).
  DELETE FROM public.search_wish WHERE created_at < now() - interval '24 months';
END;
$$;

-- 5. Admin: Demand. Searches and misses (nothing shown at all) by where people are and where they
--    asked for, the words we could not answer, and the latest "Tell me when" contacts.
CREATE OR REPLACE FUNCTION public.admin_demand(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH s AS (
      SELECT *, (options = 0 AND later = 0) AS miss FROM public.search_log WHERE created_at >= v_since
    )
    SELECT jsonb_build_object(
      'days', greatest(1, least(coalesce(p_days, 30), 365)),
      'searches', (SELECT count(*) FROM s),
      'misses', (SELECT count(*) FILTER (WHERE miss) FROM s),
      'people', (SELECT count(DISTINCT user_id) FROM s),
      'wishes', (SELECT count(*) FROM public.search_wish w WHERE w.created_at >= v_since),
      'by_channel', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT channel, count(*) AS searches, count(*) FILTER (WHERE miss) AS misses FROM s GROUP BY channel) x), '[]'::jsonb),
      'by_origin', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT origin_country AS country, count(*) AS searches, count(*) FILTER (WHERE miss) AS misses
            FROM s GROUP BY origin_country ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'by_place', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT market, zone, count(*) AS searches, count(*) FILTER (WHERE miss) AS misses
            FROM s GROUP BY market, zone ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'missed', coalesce((SELECT jsonb_agg(x ORDER BY x.times DESC) FROM (
          SELECT lower(query) AS query, market, count(*) AS times
            FROM s WHERE miss GROUP BY lower(query), market ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'latest_wishes', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
          SELECT w.created_at, w.query, w.market, w.zone, w.target_country, w.origin_country, w.email, w.phone, w.told_at
            FROM public.search_wish w ORDER BY w.created_at DESC LIMIT 50) x), '[]'::jsonb)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.market_country(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.market_country(text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.search_note(text, text, text, text, double precision, double precision, text, integer, text, text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_note(text, text, text, text, double precision, double precision, text, integer, text, text, integer, integer, integer) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.search_wish_add(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_wish_add(text, text, text, text, text, text, text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.admin_demand(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_demand(integer) TO authenticated;
