-- Search that plans ahead (18 October 2026). Built on the live engine_match (travel version, read
-- from the database on 18 October), so free times still keep travel between visits.
--   1. No day asked: the soonest free times, found day by day from today, up to 3 weeks ahead.
--   2. Days asked (up to a week, "next week"): those days. Nobody free at all on them: the next free
--      times after them, day by day, up to 3 weeks from today. Never a dead end when someone offers it.
--   3. "offered": how many businesses offer it at all, free or not, so "nobody offers this" is only
--      said when it is true. Day words (Tuesday, sabado, next week) are never read as what is wanted.
--   4. The search log keeps "offered", and Demand tells "nobody offers it" from "nobody free".
-- Needs demand.sql. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.engine_match(p_market text, p_query text, p_mode text DEFAULT NULL::text, p_dates date[] DEFAULT NULL::date[], p_window text DEFAULT 'any'::text, p_at time without time zone DEFAULT NULL::time without time zone, p_people integer DEFAULT 1, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_zone text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_now timestamp;
  v_dates date[];
  v_people integer := greatest(1, least(coalesce(p_people, 1), 50));
  v_tokens text[];
  v_from time;
  v_to time;
  v_matched integer;
  v_rows jsonb;
  v_later jsonb;
  v_pick jsonb := '[]'::jsonb;
  v_used uuid[] := '{}';
  r jsonb;
  v_first jsonb;
  v_offered integer := 0;
  v_soonest boolean := false;
  v_ahead boolean := false;
  v_day date;
BEGIN
  SELECT m.timezone INTO v_tz FROM public.markets m WHERE m.code = p_market;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Pick a city' USING ERRCODE = '22023';
  END IF;
  IF p_mode IS NOT NULL AND p_mode NOT IN ('at_business', 'at_client', 'online') THEN
    RAISE EXCEPTION 'Pick where it happens' USING ERRCODE = '22023';
  END IF;
  IF p_mode = 'at_client' AND p_zone IS NULL AND p_lat IS NULL THEN
    RAISE EXCEPTION 'Tell us where you are, so we only show people who come to you' USING ERRCODE = '22023';
  END IF;

  -- A brake on repeated searches: per visitor when signed out, per person when signed in.
  IF v_uid IS NULL THEN
    IF NOT public.rate_ok(CASE WHEN public.request_origin() IS NOT NULL THEN 'engine:ip:' || public.request_origin() END, 60, 600) THEN
      RAISE EXCEPTION 'Lots of searches from here. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NOT public.rate_ok('engine:user:' || v_uid, 120, 600) THEN
    RAISE EXCEPTION 'Lots of searches. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
  END IF;

  v_now := now() AT TIME ZONE v_tz;
  v_today := v_now::date;
  -- The days asked for, up to a week of them ("next week"). None asked: the soonest free times,
  -- found day by day from today.
  SELECT array_agg(d ORDER BY d)
    INTO v_dates
    FROM (SELECT DISTINCT d FROM unnest(coalesce(p_dates, '{}'::date[])) AS d
           WHERE d BETWEEN v_today AND v_today + 90 ORDER BY d LIMIT 7) x;
  IF v_dates IS NULL THEN
    v_soonest := true;
    v_dates := ARRAY[v_today];
  END IF;

  SELECT array_agg(DISTINCT tok) INTO v_tokens
    FROM unnest(string_to_array(public.engine_fold(p_query), ' ')) AS tok
   WHERE length(tok) >= 3
     AND tok <> ALL (ARRAY['and', 'the', 'for', 'with', 'please', 'book', 'need', 'want', 'some', 'someone', 'today', 'tomorrow',
                           'para', 'com', 'uma', 'uns', 'umas', 'por', 'favor', 'quero', 'preciso', 'marcar', 'hoje', 'amanha', 'meu', 'minha',
                           -- Days and parts of the day are when, not what.
                           'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun',
                           'weekend', 'week', 'next', 'this', 'morning', 'afternoon', 'evening', 'tonight',
                           'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo', 'feira', 'semana', 'proxima', 'proximo', 'que', 'vem', 'fim', 'manha', 'tarde', 'noite']);
  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Say what you need, like "haircut" or "nails"' USING ERRCODE = '22023';
  END IF;

  IF p_at IS NOT NULL THEN
    v_from := (p_at - interval '90 minutes')::time;
    v_to := (p_at + interval '90 minutes')::time;
    IF p_at < time '01:30' THEN v_from := time '00:00'; END IF;
    IF p_at > time '22:29' THEN v_to := time '23:59'; END IF;
  ELSE
    v_from := CASE p_window WHEN 'afternoon' THEN time '12:00' WHEN 'evening' THEN time '17:00' ELSE time '00:00' END;
    v_to := CASE p_window WHEN 'morning' THEN time '11:59' WHEN 'afternoon' THEN time '16:59' ELSE time '23:59' END;
  END IF;

  IF to_regclass('pg_temp.engine_slots') IS NULL THEN
    CREATE TEMP TABLE engine_slots (
      sid uuid, bid uuid, fit numeric, km numeric, day date, at time, in_window boolean
    ) ON COMMIT DROP;
  END IF;
  TRUNCATE pg_temp.engine_slots;
  IF to_regclass('pg_temp.engine_fits') IS NULL THEN
    CREATE TEMP TABLE engine_fits (sid uuid, bid uuid, fit numeric, km numeric) ON COMMIT DROP;
  END IF;
  TRUNCATE pg_temp.engine_fits;

  -- Services that fit the words, the format, the place and the group.
  WITH svc AS (
    SELECT s.id AS sid, b.id AS bid, public.engine_fit(v_tokens, s.service_name, b.category) AS fit,
           CASE WHEN p_lat IS NOT NULL AND b.lat IS NOT NULL THEN public.km_between(b.lat, b.lng, p_lat, p_lng) END AS km,
           b.is_demo
      FROM public.services s
      JOIN public.businesses b ON b.id = s.business_id
     WHERE b.is_active = true AND b.market = p_market AND s.is_active = true
       AND v_people <= s.max_people
       AND (p_mode IS NULL OR p_mode = ANY (s.modes))
       AND (p_mode IS DISTINCT FROM 'at_client' OR (
             (p_zone IS NOT NULL AND p_zone = ANY (b.service_zones))
             OR (b.service_radius_km IS NOT NULL AND b.lat IS NOT NULL AND p_lat IS NOT NULL
                 AND public.km_between(b.lat, b.lng, p_lat, p_lng) <= b.service_radius_km)))
  ),
  fit AS (
    SELECT * FROM svc WHERE fit > 0 ORDER BY fit DESC, is_demo NULLS FIRST LIMIT 25
  )
  INSERT INTO pg_temp.engine_fits (sid, bid, fit, km)
  SELECT f.sid, f.bid, f.fit, f.km FROM fit f;

  -- How many businesses offer it at all, free or not: "nobody offers this" only when this is 0.
  SELECT count(DISTINCT bid) INTO v_offered FROM pg_temp.engine_fits;

  IF v_offered > 0 THEN
    IF v_soonest THEN
      -- Day by day from today until three businesses (or every one that offers it) are free, up to 3 weeks.
      v_dates := '{}';
      v_day := v_today;
      LOOP
        INSERT INTO pg_temp.engine_slots (sid, bid, fit, km, day, at, in_window)
        SELECT f.sid, f.bid, f.fit, f.km, v_day, sl.slot_time, sl.slot_time BETWEEN v_from AND v_to
          FROM pg_temp.engine_fits f
         CROSS JOIN LATERAL public.get_available_slots(f.bid, f.sid, v_day, NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END, p_mode, p_zone) sl;
        v_dates := v_dates || v_day;
        EXIT WHEN v_day >= v_today + 20
               OR (SELECT count(DISTINCT bid) FROM pg_temp.engine_slots WHERE in_window) >= least(3, v_offered);
        v_day := v_day + 1;
      END LOOP;
    ELSE
      FOREACH v_day IN ARRAY v_dates LOOP
        INSERT INTO pg_temp.engine_slots (sid, bid, fit, km, day, at, in_window)
        SELECT f.sid, f.bid, f.fit, f.km, v_day, sl.slot_time, sl.slot_time BETWEEN v_from AND v_to
          FROM pg_temp.engine_fits f
         CROSS JOIN LATERAL public.get_available_slots(f.bid, f.sid, v_day, NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END, p_mode, p_zone) sl;
      END LOOP;
    END IF;
  END IF;

  SELECT count(DISTINCT sid) INTO v_matched FROM pg_temp.engine_slots;

  -- Nobody free at all on the days asked: the next free times after them, day by day, up to 3 weeks
  -- from today, from up to two businesses. Never a dead end when someone offers it.
  IF v_offered > 0 AND NOT EXISTS (SELECT 1 FROM pg_temp.engine_slots) THEN
    v_day := (SELECT max(d) FROM unnest(v_dates) AS d) + 1;
    WHILE v_day <= v_today + 20 LOOP
      INSERT INTO pg_temp.engine_slots (sid, bid, fit, km, day, at, in_window)
        SELECT f.sid, f.bid, f.fit, f.km, v_day, sl.slot_time, false
          FROM pg_temp.engine_fits f
         CROSS JOIN LATERAL public.get_available_slots(f.bid, f.sid, v_day, NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END, p_mode, p_zone) sl;
      EXIT WHEN (SELECT count(DISTINCT bid) FROM pg_temp.engine_slots) >= least(2, v_offered);
      v_day := v_day + 1;
    END LOOP;
    v_ahead := EXISTS (SELECT 1 FROM pg_temp.engine_slots);
  END IF;

  -- One option per business: its best service and time, scored.
  WITH stats AS (
    SELECT b.id AS bid, b.business_name, b.slug, b.city, b.logo_url, b.is_demo, b.currency,
           (SELECT round(avg(rv.rating)::numeric, 1) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS rating,
           (SELECT count(*) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS reviews,
           (SELECT CASE WHEN count(*) >= 5 THEN round(100.0 * count(*) FILTER (WHERE x.visits >= 2) / count(*)) END
              FROM (SELECT count(*) AS visits FROM public.appointments a
                     WHERE a.business_id = b.id AND a.status = 'completed' AND a.client_email IS NOT NULL
                       AND a.appointment_date > v_today - 365
                     GROUP BY lower(a.client_email)) x) AS rebook_pct,
           rl.score / 100.0 AS reliability, rl.kept_pct, coalesce(rl.badge, false) AS reliable,
           (v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.business_id = b.id AND a.client_id = v_uid AND a.status = 'completed')) AS regular
      FROM public.businesses b
      LEFT JOIN public.business_reliability rl ON rl.business_id = b.id AND (rl.shown OR rl.badge)
     WHERE b.id IN (SELECT DISTINCT bid FROM pg_temp.engine_slots)
  ),
  scored AS (
    SELECT e.sid, e.bid, e.fit, e.km, e.day, e.at, st.business_name, st.slug, st.city, st.logo_url, st.is_demo, st.currency,
           st.rating, st.reviews, st.rebook_pct, st.reliability, st.kept_pct, st.reliable, st.regular, s.service_name, s.price, s.price_per, s.modes, s.duration_minutes, s.extra_person_minutes,
           0.5 * CASE WHEN p_at IS NOT NULL
                   THEN 1 - least(abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at)) / 60) / 90, 1)
                   ELSE 1 - least(greatest(extract(epoch FROM (e.day + e.at) - v_now) / 60, 0) / (72 * 60), 1) END
         + 0.2 * CASE WHEN e.km IS NOT NULL THEN 1 - least(e.km / 15, 1) ELSE 0.5 END
         + 0.1 * CASE WHEN st.reviews >= 5 THEN greatest(0, least(1, (st.rating - 3) / 2)) ELSE 0.5 END
         + 0.1 * CASE WHEN st.rebook_pct IS NOT NULL THEN least(st.rebook_pct / 100, 1) ELSE 0.5 END
         + 0.1 * coalesce(st.reliability, 0.8)
         + 0.02 * least(e.fit, 6) / 6
         + CASE WHEN st.regular THEN 0.25 ELSE 0 END
         - CASE WHEN st.is_demo THEN 1 ELSE 0 END
         + random() * 0.01 AS score
      FROM pg_temp.engine_slots e
      JOIN stats st ON st.bid = e.bid
      JOIN public.services s ON s.id = e.sid
     WHERE e.in_window
  ),
  best AS (
    SELECT DISTINCT ON (bid) * FROM scored ORDER BY bid, score DESC
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'business_id', bid, 'business_name', business_name, 'slug', slug, 'city', city, 'logo_url', logo_url,
           'service_id', sid, 'service_name', service_name, 'people', v_people,
           'price', CASE WHEN price_per = 'person' THEN price * v_people ELSE price END, 'price_per', price_per, 'currency', currency,
           'minutes', duration_minutes + (v_people - 1) * coalesce(extra_person_minutes, duration_minutes),
           'mode', coalesce(p_mode, modes[1]),
           'date', day, 'time', to_char(at, 'HH24:MI'), 'starts', (day + at),
           'km', round(km, 1), 'rating', CASE WHEN reviews > 0 THEN rating END, 'reviews', reviews,
           'rebook_pct', rebook_pct, 'kept_pct', kept_pct, 'reliable', reliable, 'verified', public.verification_gold(bid), 'regular', regular, 'score', round(score::numeric, 4)
         ) ORDER BY score DESC), '[]'::jsonb)
    INTO v_rows
    FROM best;

  -- Three options, three different reasons.
  IF jsonb_array_length(v_rows) > 0 THEN
    v_first := v_rows->0;
    v_pick := jsonb_build_array(v_first || jsonb_build_object('label', CASE WHEN (v_first->>'regular')::boolean THEN 'regular' ELSE 'best' END));
    v_used := ARRAY[(v_first->>'business_id')::uuid];

    -- Earliest, when earlier than the best match.
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'starts') < (v_first->>'starts')
     ORDER BY x->>'starts', (x->>'score')::numeric DESC LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "earliest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END IF;

    -- Closest, when distance is known; otherwise top rated (5 reviews or more).
    r := NULL;
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND x->>'km' IS NOT NULL
     ORDER BY (x->>'km')::numeric LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "closest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    ELSE
      SELECT x INTO r FROM jsonb_array_elements(v_rows) x
       WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'reviews')::int >= 5
       ORDER BY (x->>'rating')::numeric DESC, (x->>'score')::numeric DESC LIMIT 1;
      IF r IS NOT NULL THEN
        v_pick := v_pick || jsonb_build_array(r || '{"label": "top_rated"}');
        v_used := v_used || (r->>'business_id')::uuid;
      END IF;
    END IF;

    -- Fill to three by score.
    FOR r IN SELECT x FROM jsonb_array_elements(v_rows) x WHERE (x->>'business_id')::uuid <> ALL (v_used) LOOP
      EXIT WHEN jsonb_array_length(v_pick) >= 3;
      v_pick := v_pick || jsonb_build_array(r || '{"label": "another"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END LOOP;
  END IF;

  -- Nothing in the window: the nearest times outside it, from up to two businesses.
  IF jsonb_array_length(v_pick) = 0 THEN
    SELECT coalesce(jsonb_agg(o ORDER BY o->>'starts'), '[]'::jsonb) INTO v_later
      FROM (
        SELECT DISTINCT ON (e.bid) jsonb_build_object(
                 'business_id', e.bid, 'business_name', b.business_name, 'slug', b.slug, 'service_id', e.sid,
                 'service_name', s.service_name, 'people', v_people, 'mode', coalesce(p_mode, s.modes[1]),
                 'date', e.day, 'time', to_char(e.at, 'HH24:MI'), 'starts', (e.day + e.at), 'km', round(e.km, 1),
                 'price', CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END, 'currency', b.currency,
                 'label', 'later') AS o
          FROM pg_temp.engine_slots e
          JOIN public.businesses b ON b.id = e.bid
          JOIN public.services s ON s.id = e.sid
         ORDER BY e.bid,
                  CASE WHEN p_at IS NOT NULL THEN abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at))) ELSE extract(epoch FROM (e.day + e.at)) END
      ) y
     LIMIT 2;
    SELECT coalesce(jsonb_agg(z), '[]'::jsonb) INTO v_later FROM (SELECT z FROM jsonb_array_elements(v_later) z LIMIT 2) q;
  END IF;

  RETURN jsonb_build_object(
    'options', v_pick,
    'later', coalesce(v_later, '[]'::jsonb),
    'matched', v_matched,
    'offered', v_offered,
    'soonest', v_soonest,
    'ahead', v_ahead,
    'words', to_jsonb(v_tokens),
    'dates', to_jsonb(v_dates),
    'timezone', v_tz
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) TO anon, authenticated, service_role;

-- The search log keeps how many businesses offer it (NULL on searches made before this).
ALTER TABLE public.search_log ADD COLUMN IF NOT EXISTS offered integer CHECK (offered >= 0);

DROP FUNCTION IF EXISTS public.search_note(text, text, text, text, double precision, double precision, text, integer, text, text, integer, integer, integer);
CREATE OR REPLACE FUNCTION public.search_note(
  p_channel text, p_query text, p_market text DEFAULT NULL, p_zone text DEFAULT NULL,
  p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL,
  p_mode text DEFAULT NULL, p_people integer DEFAULT 1,
  p_origin_country text DEFAULT NULL, p_origin_tz text DEFAULT NULL,
  p_options integer DEFAULT 0, p_later integer DEFAULT 0, p_matched integer DEFAULT 0, p_offered integer DEFAULT NULL)
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
                                 origin_country, origin_tz, options, later, matched, offered, user_id)
  VALUES (p_channel, v_query, lower(nullif(btrim(p_market), '')), public.market_country(p_market),
          left(nullif(btrim(p_zone), ''), 80),
          CASE WHEN p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 THEN round(p_lat::numeric, 2) END,
          CASE WHEN p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180 THEN round(p_lng::numeric, 2) END,
          CASE WHEN p_mode IN ('at_business', 'at_client', 'online') THEN p_mode END,
          greatest(1, least(coalesce(p_people, 1), 50)),
          CASE WHEN v_origin ~ '^[A-Z]{2}$' AND v_origin NOT IN ('XX', 'T1') THEN v_origin END,
          left(nullif(btrim(p_origin_tz), ''), 64),
          greatest(coalesce(p_options, 0), 0), greatest(coalesce(p_later, 0), 0), greatest(coalesce(p_matched, 0), 0), CASE WHEN p_offered >= 0 THEN p_offered END,
          v_uid);
  -- Searches are kept 13 months (privacy policy); about one call in a hundred clears older ones.
  IF random() < 0.01 THEN
    DELETE FROM public.search_log WHERE created_at < now() - interval '13 months';
  END IF;
END;
$$;


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
      -- miss: nobody offers it. no_time: someone does, nobody is free in 3 weeks. Older searches (no
      -- offered count) are counted, never sorted.
      SELECT *, coalesce(offered = 0, false) AS miss, coalesce(offered > 0 AND options = 0 AND later = 0, false) AS no_time
        FROM public.search_log WHERE created_at >= v_since
    )
    SELECT jsonb_build_object(
      'days', greatest(1, least(coalesce(p_days, 30), 365)),
      'searches', (SELECT count(*) FROM s),
      'misses', (SELECT count(*) FILTER (WHERE miss) FROM s),
      'full', (SELECT count(*) FILTER (WHERE no_time) FROM s),
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
      'booked_out', coalesce((SELECT jsonb_agg(x ORDER BY x.times DESC) FROM (
          SELECT lower(query) AS query, market, count(*) AS times
            FROM s WHERE no_time GROUP BY lower(query), market ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'latest_wishes', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
          SELECT w.created_at, w.query, w.market, w.zone, w.target_country, w.origin_country, w.email, w.phone, w.told_at
            FROM public.search_wish w ORDER BY w.created_at DESC LIMIT 50) x), '[]'::jsonb)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_note(text, text, text, text, double precision, double precision, text, integer, text, text, integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_note(text, text, text, text, double precision, double precision, text, integer, text, text, integer, integer, integer, integer) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.admin_demand(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_demand(integer) TO authenticated;

COMMIT;
