-- geo1b: search inside a state or district (Browse, More options; "barber in Lagos"). Same engine as
-- geo1, plus one filter: when p_zone is one of the country's states or districts (the lists in
-- constants/locations.js), only businesses there are searched, and nobody there is said as nobody
-- there. Any other place (a city like Lisbon, an area) still only lifts. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.engine_match(p_market text, p_query text, p_mode text DEFAULT NULL::text, p_dates date[] DEFAULT NULL::date[], p_window text DEFAULT 'any'::text, p_at time without time zone DEFAULT NULL::time without time zone, p_people integer DEFAULT 1, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_zone text DEFAULT NULL::text, p_max_price numeric DEFAULT NULL::numeric, p_order text DEFAULT NULL::text)
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
  v_alts text[];
  i integer;
  v_o jsonb;
  v_span numeric;
  -- Words for children: a service named for them is only offered first when the search asks for them.
  v_kid_words constant text[] := ARRAY['kid', 'kids', 'child', 'children', 'junior', 'jr', 'crianca', 'criancas', 'infantil', 'menino', 'menina', 'boy', 'boys', 'girl', 'girls', 'baby', 'toddler'];
  v_for_kids boolean := false;
  v_country text;
  v_region text;
BEGIN
  SELECT m.timezone INTO v_tz FROM public.markets m WHERE m.code = p_market;
  -- geo1: a country ('ng', 'pt') searches every business in it; a city code still searches that city.
  v_country := CASE WHEN p_market IN ('ng', 'pt') THEN public.market_country(p_market) END;
  -- geo1b: a state or district named or picked ("in Lagos", "Braga") keeps the search inside it. A
  -- visit at the client's place keeps p_zone as their area.
  IF v_country IS NOT NULL AND p_zone IS NOT NULL AND coalesce(p_mode, '') <> 'at_client'
     AND lower(btrim(p_zone)) = ANY (CASE v_country
       WHEN 'NG' THEN ARRAY['abia', 'adamawa', 'akwa ibom', 'anambra', 'bauchi', 'bayelsa', 'benue', 'borno', 'cross river', 'delta', 'ebonyi', 'edo', 'ekiti', 'enugu',
                            'fct', 'gombe', 'imo', 'jigawa', 'kaduna', 'kano', 'katsina', 'kebbi', 'kogi', 'kwara', 'lagos', 'nasarawa', 'niger', 'ogun', 'ondo',
                            'osun', 'oyo', 'plateau', 'rivers', 'sokoto', 'taraba', 'yobe', 'zamfara']
       ELSE ARRAY['aveiro', 'beja', 'braga', 'bragança', 'castelo branco', 'coimbra', 'évora', 'faro', 'guarda', 'leiria', 'lisboa', 'portalegre', 'porto',
                  'santarém', 'setúbal', 'viana do castelo', 'vila real', 'viseu', 'azores', 'madeira'] END) THEN
    v_region := lower(btrim(p_zone));
  END IF;
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
  IF v_tokens IS NOT NULL THEN
    -- The words asked and their same-meaning words, to tell "Haircut" from "Kids cut (under 12)".
    SELECT v_tokens || coalesce(array_agg(DISTINCT w2.word), '{}') INTO v_alts
      FROM public.engine_words w1 JOIN public.engine_words w2 ON w2.grp = w1.grp
     WHERE w1.word = ANY (v_tokens);
  END IF;
  v_for_kids := coalesce(v_alts && v_kid_words, false);
  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Say what you need, like "haircut" or "nails"' USING ERRCODE = '22023';
  END IF;

  IF p_at IS NOT NULL THEN
    v_from := (p_at - interval '90 minutes')::time;
    v_to := (p_at + interval '90 minutes')::time;
    IF p_at < time '01:30' THEN v_from := time '00:00'; END IF;
    IF p_at > time '22:29' THEN v_to := time '23:59'; END IF;
  ELSIF coalesce(p_window, '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]-([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    -- A range read from the words: "after 17:00" is 17:00-23:59, "lunchtime" 11:30-14:00.
    v_from := split_part(p_window, '-', 1)::time;
    v_to := split_part(p_window, '-', 2)::time;
    IF v_to < v_from THEN v_to := time '23:59'; END IF;
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
    CREATE TEMP TABLE engine_fits (sid uuid, bid uuid, fit numeric, km numeric, extra integer) ON COMMIT DROP;
  END IF;
  TRUNCATE pg_temp.engine_fits;

  -- Services that fit the words, the format, the place and the group.
  WITH svc AS (
    SELECT s.id AS sid, b.id AS bid, public.engine_fit(v_tokens, s.service_name, b.category) AS fit,
           CASE WHEN p_lat IS NOT NULL AND b.lat IS NOT NULL THEN public.km_between(b.lat, b.lng, p_lat, p_lng) END AS km,
           b.is_demo
      FROM public.services s
      JOIN public.businesses b ON b.id = s.business_id
     WHERE b.is_active = true AND s.is_active = true
       AND (b.market = p_market OR (v_country IS NOT NULL AND upper(b.country) = v_country))
       AND (v_region IS NULL OR lower(b.region) = v_region)
       AND v_people <= s.max_people
       AND (p_max_price IS NULL OR coalesce(CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END, 0) <= p_max_price)
       AND (p_mode IS NULL OR p_mode = ANY (s.modes))
       AND (p_mode IS DISTINCT FROM 'at_client' OR (
             (p_zone IS NOT NULL AND p_zone = ANY (b.service_zones))
             OR (b.service_radius_km IS NOT NULL AND b.lat IS NOT NULL AND p_lat IS NOT NULL
                 AND public.km_between(b.lat, b.lng, p_lat, p_lng) <= b.service_radius_km)))
  ),
  fit AS (
    SELECT * FROM svc WHERE fit > 0 ORDER BY fit DESC, is_demo NULLS FIRST LIMIT 25
  )
  INSERT INTO pg_temp.engine_fits (sid, bid, fit, km, extra)
  SELECT f.sid, f.bid, f.fit, f.km,
         (SELECT count(*) FROM unnest(regexp_split_to_array(public.engine_fold(s.service_name), '[^a-z0-9]+')) AS w
           WHERE length(w) >= 2 AND w <> ALL (v_alts))::integer
         + CASE WHEN NOT v_for_kids AND regexp_split_to_array(public.engine_fold(s.service_name), '[^a-z0-9]+') && v_kid_words THEN 5 ELSE 0 END
    FROM fit f JOIN public.services s ON s.id = f.sid;

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
  -- Minutes from now to the end of the last day searched: "soon" is measured across the whole window,
  -- so times next Friday still rank by how early they are.
  v_span := greatest(extract(epoch FROM (((SELECT max(d) FROM unnest(v_dates) AS d) + 1)::timestamp - v_now)) / 60, 60);

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
           coalesce(NULLIF(btrim(b.neighbourhood), ''), b.city) AS area, b.base_zone,
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
    SELECT e.sid, e.bid, e.fit, ef.extra, e.km, e.day, e.at, st.business_name, st.slug, st.city, st.area, st.base_zone, st.logo_url, st.is_demo, st.currency,
           st.rating, st.reviews, st.rebook_pct, st.reliability, st.kept_pct, st.reliable, st.regular, s.service_name, s.price, s.price_per, s.modes, s.duration_minutes, s.extra_person_minutes,
           0.5 * CASE WHEN p_at IS NOT NULL
                   THEN 1 - least(abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at)) / 60) / 90, 1)
                   ELSE 1 - least(greatest(extract(epoch FROM (e.day + e.at) - v_now) / 60, 0) / v_span, 1) END
         + 0.2 * CASE WHEN e.km IS NOT NULL THEN 1 - least(e.km / 15, 1) ELSE 0.5 END
         + 0.1 * CASE WHEN st.reviews >= 5 THEN greatest(0, least(1, (st.rating - 3) / 2)) ELSE 0.5 END
         + 0.1 * CASE WHEN st.rebook_pct IS NOT NULL THEN least(st.rebook_pct / 100, 1) ELSE 0.5 END
         + 0.1 * coalesce(st.reliability, 0.8)
         + 0.02 * least(e.fit, 6) / 6
         + CASE WHEN st.regular THEN 0.25 ELSE 0 END
         -- The area asked, for a visit at their place: a business there first.
         + CASE WHEN p_zone IS NOT NULL AND coalesce(p_mode, '') <> 'at_client'
                     AND (lower(coalesce(st.base_zone, '')) = lower(p_zone) OR lower(coalesce(st.area, '')) = lower(p_zone)
                          OR lower(coalesce(st.city, '')) = lower(p_zone)) THEN 0.15 ELSE 0 END
         - CASE WHEN st.is_demo THEN 1 ELSE 0 END
         + random() * 0.01 AS score
      FROM pg_temp.engine_slots e
      JOIN stats st ON st.bid = e.bid
      JOIN public.services s ON s.id = e.sid
      JOIN pg_temp.engine_fits ef ON ef.sid = e.sid
     WHERE e.in_window
  ),
  best AS (
    -- Per business: the service that fits the words best, then the one closest to them (fewest other
    -- words: "Haircut" before "Kids cut (under 12)"), then its earliest free time, or the one closest to
    -- the hour asked. Time never picks the service, and the time is never a tie broken at random.
    SELECT DISTINCT ON (bid) * FROM scored
     ORDER BY bid, fit DESC, extra,
              CASE WHEN p_at IS NOT NULL THEN abs(extract(epoch FROM (day + at) - (day + p_at))) ELSE extract(epoch FROM (day + at)) END,
              score DESC
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'business_id', bid, 'business_name', business_name, 'slug', slug, 'city', city, 'area', area, 'logo_url', logo_url,
           'service_id', sid, 'service_name', service_name, 'people', v_people,
           'price', CASE WHEN price_per = 'person' THEN price * v_people ELSE price END, 'price_per', price_per, 'currency', currency,
           'minutes', duration_minutes + (v_people - 1) * coalesce(extra_person_minutes, duration_minutes),
           'mode', coalesce(p_mode, modes[1]),
           'date', day, 'time', to_char(at, 'HH24:MI'), 'starts', (day + at),
           'km', round(km, 1), 'rating', CASE WHEN reviews > 0 THEN rating END, 'reviews', reviews,
           'rebook_pct', rebook_pct, 'kept_pct', kept_pct, 'reliable', reliable, 'verified', public.verification_gold(bid), 'regular', regular, 'score', round(score::numeric, 4)
         ) ORDER BY CASE WHEN p_order = 'price' THEN coalesce(CASE WHEN price_per = 'person' THEN price * v_people ELSE price END, 0) END, score DESC), '[]'::jsonb)
    INTO v_rows
    FROM best;

  -- Three options, three different reasons.
  IF jsonb_array_length(v_rows) > 0 THEN
    v_first := v_rows->0;
    v_pick := jsonb_build_array(v_first || jsonb_build_object('label', CASE WHEN p_order = 'price' THEN 'cheapest' WHEN (v_first->>'regular')::boolean THEN 'regular' ELSE 'best' END));
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
                 'area', coalesce(NULLIF(btrim(b.neighbourhood), ''), b.city), 'logo_url', b.logo_url,
                 'minutes', s.duration_minutes + (v_people - 1) * coalesce(s.extra_person_minutes, s.duration_minutes),
                 'service_name', s.service_name, 'people', v_people, 'mode', coalesce(p_mode, s.modes[1]),
                 'date', e.day, 'time', to_char(e.at, 'HH24:MI'), 'starts', (e.day + e.at), 'km', round(e.km, 1),
                 'price', CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END, 'currency', b.currency,
                 'label', 'later') AS o
          FROM pg_temp.engine_slots e
          JOIN public.businesses b ON b.id = e.bid
          JOIN public.services s ON s.id = e.sid
          JOIN pg_temp.engine_fits ef ON ef.sid = e.sid
         ORDER BY e.bid, ef.fit DESC, ef.extra,
                  CASE WHEN p_at IS NOT NULL THEN abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at))) ELSE extract(epoch FROM (e.day + e.at)) END
      ) y
     LIMIT 2;
    SELECT coalesce(jsonb_agg(z), '[]'::jsonb) INTO v_later FROM (SELECT z FROM jsonb_array_elements(v_later) z LIMIT 2) q;
  END IF;

  -- Every option carries more of the same business: its other free times that day for that service
  -- (up to 8), and its other services that fit the words, each with its first free time (up to 3), soonest first.
  FOR i IN 0 .. jsonb_array_length(v_pick) - 1 LOOP
    v_o := v_pick->i;
    v_pick := jsonb_set(v_pick, ARRAY[i::text], v_o || jsonb_build_object(
      'times', (SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb) FROM (
                 SELECT DISTINCT to_char(e.at, 'HH24:MI') AS t FROM pg_temp.engine_slots e
                  WHERE e.sid = (v_o->>'service_id')::uuid AND e.day = (v_o->>'date')::date AND e.in_window
                  ORDER BY 1 LIMIT 8) x),
      'others', (SELECT coalesce(jsonb_agg(z.j ORDER BY z.fit DESC, z.starts), '[]'::jsonb) FROM (
                 SELECT y.* FROM (
                 SELECT DISTINCT ON (e.sid) ef.fit, ef.extra, e.day + e.at AS starts,
                        jsonb_build_object('service_id', e.sid, 'service_name', s.service_name, 'date', e.day, 'time', to_char(e.at, 'HH24:MI'),
                                           'price', CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END,
                                           'minutes', s.duration_minutes + (v_people - 1) * coalesce(s.extra_person_minutes, s.duration_minutes)) AS j
                   FROM pg_temp.engine_slots e
                   JOIN public.services s ON s.id = e.sid
                   JOIN pg_temp.engine_fits ef ON ef.sid = e.sid
                  WHERE e.bid = (v_o->>'business_id')::uuid AND e.sid <> (v_o->>'service_id')::uuid AND e.in_window
                  ORDER BY e.sid, e.day, e.at) y
                 ORDER BY y.fit DESC, y.starts
                 LIMIT 3) z)));
  END LOOP;
  FOR i IN 0 .. coalesce(jsonb_array_length(v_later), 0) - 1 LOOP
    v_o := v_later->i;
    v_later := jsonb_set(v_later, ARRAY[i::text], v_o || jsonb_build_object(
      'times', (SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb) FROM (
                 SELECT DISTINCT to_char(e.at, 'HH24:MI') AS t FROM pg_temp.engine_slots e
                  WHERE e.sid = (v_o->>'service_id')::uuid AND e.day = (v_o->>'date')::date
                  ORDER BY 1 LIMIT 8) x),
      'others', '[]'::jsonb));
  END LOOP;

  RETURN jsonb_build_object(
    'options', v_pick,
    'later', coalesce(v_later, '[]'::jsonb),
    'matched', v_matched,
    'offered', v_offered,
    'soonest', v_soonest,
    'ahead', v_ahead,
    'for_kids', v_for_kids,
    'max_price', p_max_price,
    'words', to_jsonb(v_tokens),
    'dates', to_jsonb(v_dates),
    'timezone', v_tz
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text, numeric, text) TO anon, authenticated, service_role;

COMMIT;
