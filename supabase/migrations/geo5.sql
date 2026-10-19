-- geo5: travel by road for visits at the client's place (doc 35). Run before installing the kit.
--   1. A business can charge travel by distance: a base, a price per km, a minimum and a maximum
--      (businesses.travel_*). Off, the service's own travel fee stands, as before.
--   2. The client picks their address from Google: the places function asks Google for the driving
--      distance and time from the shop's pin and keeps a quote (travel_quotes) for 2 hours. The
--      quote's id goes with the free times, the price and the booking, which checks it again here.
--   3. The drive there and back blocks the calendar: a visit keeps its driving minutes
--      (appointments.travel_minutes), and free times leave that room before and after it.
-- Safe to run again.

BEGIN;

-- 1. The business's travel price.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS travel_base numeric CHECK (travel_base IS NULL OR travel_base >= 0);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS travel_per_km numeric CHECK (travel_per_km IS NULL OR travel_per_km >= 0);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS travel_min numeric CHECK (travel_min IS NULL OR travel_min >= 0);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS travel_max numeric CHECK (travel_max IS NULL OR travel_max >= 0);

-- 3. A visit's drive, each way, and its length.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS travel_minutes integer CHECK (travel_minutes IS NULL OR travel_minutes BETWEEN 0 AND 180);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS travel_km numeric CHECK (travel_km IS NULL OR travel_km >= 0);

-- 2. Quotes by road, kept 2 hours. Written only by travel_quote_make (the places function).
CREATE TABLE IF NOT EXISTS public.travel_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  place_id text NOT NULL CHECK (char_length(place_id) BETWEEN 10 AND 300),
  km numeric NOT NULL CHECK (km >= 0),
  minutes integer NOT NULL CHECK (minutes BETWEEN 0 AND 180),
  fee numeric CHECK (fee IS NULL OR fee >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours'
);
CREATE INDEX IF NOT EXISTS travel_quotes_expires ON public.travel_quotes (expires_at);
ALTER TABLE public.travel_quotes ENABLE ROW LEVEL SECURITY;
-- No policies: only the functions here read or write it.

-- The fee for a drive: base plus per km, within the minimum and maximum, rounded the way the currency
-- is paid (naira to 100, euro to 50 cents). Null when the business does not charge by distance.
CREATE OR REPLACE FUNCTION public.travel_fee_for(p_business uuid, p_km numeric)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN b.travel_per_km IS NULL THEN NULL ELSE
           (SELECT round(x / step) * step FROM (
              SELECT least(greatest(coalesce(b.travel_base, 0) + b.travel_per_km * greatest(p_km, 0), coalesce(b.travel_min, 0)),
                           coalesce(b.travel_max, 'Infinity'::numeric)) AS x,
                     CASE WHEN b.currency = 'NGN' THEN 100 ELSE 0.5 END AS step) y) END
    FROM public.businesses b WHERE b.id = p_business;
$$;

CREATE OR REPLACE FUNCTION public.travel_quote_make(p_business uuid, p_place_id text, p_metres integer, p_seconds integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_km numeric := round(greatest(coalesce(p_metres, 0), 0) / 1000.0, 1);
  -- Rounded up to 5 minutes, at most 3 hours each way.
  v_min integer := least(ceil(greatest(coalesce(p_seconds, 0), 0) / 300.0)::integer * 5, 180);
  v_id uuid;
  v_fee numeric;
BEGIN
  IF p_place_id IS NULL OR char_length(p_place_id) NOT BETWEEN 10 AND 300 THEN
    RAISE EXCEPTION 'Pick the address again' USING ERRCODE = '22023';
  END IF;
  v_fee := public.travel_fee_for(p_business, v_km);
  INSERT INTO public.travel_quotes (business_id, place_id, km, minutes, fee)
  VALUES (p_business, p_place_id, v_km, v_min, v_fee)
  RETURNING id INTO v_id;
  -- Old quotes go now and then.
  IF random() < 0.05 THEN
    DELETE FROM public.travel_quotes WHERE expires_at < now() - interval '1 day';
  END IF;
  RETURN jsonb_build_object('quote_id', v_id, 'km', v_km, 'minutes', v_min, 'fee', v_fee);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.travel_fee_for(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.travel_quote_make(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.travel_quote_make(uuid, text, integer, integer) TO service_role;

-- 3. Free times leave room for the drive.
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer, text, text);

CREATE OR REPLACE FUNCTION public.get_available_slots(p_business_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_people integer DEFAULT NULL::integer, p_mode text DEFAULT NULL::text, p_zone text DEFAULT NULL::text, p_travel_minutes integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_time time without time zone, staff_id uuid, staff_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  WITH biz AS (
    SELECT b.id, (now() AT TIME ZONE b.timezone) AS local_now, b.buffer_minutes * interval '1 minute' AS buf,
           b.market, b.base_zone,
           EXISTS (SELECT 1 FROM public.market_regions r WHERE r.market = b.market) AS travels
      FROM public.businesses b
     WHERE b.id = p_business_id
       AND (b.is_active = true OR public.is_business_member(b.id))
  ),
  -- Where this booking happens: as asked, as booked when it is being moved, or the service's first way.
  way AS (
    SELECT coalesce(NULLIF(p_mode, ''),
                    (SELECT ap.mode FROM public.appointments ap WHERE ap.id = p_ignore_appointment),
                    (SELECT s.modes[1] FROM public.services s WHERE s.id = p_service_id),
                    'at_business') AS mode
  ),
  here AS (
    SELECT public.visit_place(way.mode,
             coalesce(NULLIF(btrim(p_zone), ''),
                      (SELECT ap.client_zone FROM public.appointments ap WHERE ap.id = p_ignore_appointment))) AS place,
           -- geo5: the drive there for a visit at the client's place (Google, from the quote), each way;
           -- a booking being moved keeps its own.
           CASE WHEN way.mode = 'at_client'
                THEN least(greatest(coalesce(p_travel_minutes,
                                             (SELECT ap.travel_minutes FROM public.appointments ap WHERE ap.id = p_ignore_appointment), 0), 0), 180)
                ELSE 0 END AS trip
      FROM way
  ),
  -- Extras picked with the service; a booking being moved keeps the extras it was booked with.
  extras AS (
    SELECT s.id, s.duration_minutes
      FROM public.services s
     WHERE s.business_id = p_business_id AND s.is_active = true AND s.is_addon = true AND s.id <> p_service_id
       AND s.id = ANY (coalesce(p_addon_ids, ARRAY(
             SELECT (x->>'id')::uuid FROM public.appointments ap, jsonb_array_elements(ap.addons) x
              WHERE ap.id = p_ignore_appointment)))
  ),
  moved AS (
    SELECT coalesce(sum((x->>'minutes')::int), 0) AS minutes
      FROM public.appointments ap, jsonb_array_elements(ap.addons) x
     WHERE ap.id = p_ignore_appointment AND p_addon_ids IS NULL
  ),
  -- How many people: as asked, or as booked when a booking is being moved. One staff member does
  -- them one after another; each extra person adds their own time (the service's, unless set).
  party AS (
    SELECT greatest(1, coalesce(p_people, (SELECT ap.people FROM public.appointments ap WHERE ap.id = p_ignore_appointment), 1)) AS people
  ),
  svc AS (
    SELECT s.id, (s.duration_minutes + CASE WHEN p_addon_ids IS NULL THEN (SELECT minutes FROM moved)
                                            ELSE coalesce((SELECT sum(e.duration_minutes) FROM extras e), 0) END
                  + ((SELECT people FROM party) - 1) * coalesce(s.extra_person_minutes, s.duration_minutes)) * interval '1 minute' AS dur
      FROM public.services s
     WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true
       AND (SELECT people FROM party) <= s.max_people
  ),
  staff AS (
    SELECT m.id, m.display_name, m.sort_order, m.created_at
      FROM public.business_members m
     WHERE m.business_id = p_business_id
       AND m.status = 'active' AND m.is_bookable = true
       AND (p_staff_id IS NULL OR m.id = p_staff_id)
       AND (NOT EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id)
            OR (EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = p_service_id)
                AND NOT EXISTS (SELECT 1 FROM extras e
                                 WHERE NOT EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = e.id))))
  ),
  windows AS (
    SELECT st.id AS staff_id, st.display_name, st.sort_order, st.created_at, a.start_time, a.end_time
      FROM staff st
      JOIN public.availability a
        ON a.business_id = p_business_id
       AND a.is_active = true
       AND a.day_of_week = extract(dow FROM p_date)::int
       AND (a.staff_id = st.id
            OR (a.staff_id IS NULL
                AND NOT EXISTS (SELECT 1 FROM public.availability own
                                 WHERE own.staff_id = st.id AND own.is_active = true)))
  ),
  candidates AS (
    SELECT w.staff_id, w.display_name, w.sort_order, w.created_at, g.slot_start, g.slot_start + svc.dur AS slot_end, biz.buf
      FROM windows w
     CROSS JOIN svc
     CROSS JOIN biz
     CROSS JOIN here
     CROSS JOIN LATERAL generate_series(
       -- A visit's drive there is working time: it starts once the day opens (times stay on the quarter hour).
       p_date + w.start_time + ceil(here.trip / 15.0) * interval '15 minutes',
       p_date + w.end_time - svc.dur,
       interval '15 minutes'
     ) AS g(slot_start)
     WHERE g.slot_start - here.trip * interval '1 minute' > biz.local_now
       AND g.slot_start <= biz.local_now + interval '90 days'
  ),
  -- Bookings already in the staff member's day, with where they happen.
  taken AS (
    SELECT ap.staff_id,
           ap.appointment_date + ap.appointment_time AS starts,
           ap.appointment_date + ap.appointment_time + ap.duration_minutes * interval '1 minute' AS ends,
           public.visit_place(ap.mode, ap.client_zone) AS place,
           CASE WHEN ap.mode = 'at_client' THEN coalesce(ap.travel_minutes, 0) ELSE 0 END AS trip
      FROM public.appointments ap
     WHERE ap.business_id = p_business_id
       AND ap.status IN ('pending', 'confirmed')
       AND (p_ignore_appointment IS NULL OR ap.id <> p_ignore_appointment)
       AND ap.appointment_date BETWEEN p_date - 1 AND p_date + 1
  ),
  free AS (
    SELECT c.*
      FROM candidates c
     CROSS JOIN biz
     CROSS JOIN here
     WHERE NOT EXISTS (
             SELECT 1 FROM taken t
              WHERE t.staff_id = c.staff_id
                -- Rough cut first: nothing within 5 hours either side can clash.
                AND t.starts < c.slot_end + c.buf + interval '8 hours'
                AND c.slot_start < t.ends + c.buf + interval '8 hours'
                -- A visit's drive there and back is time taken (geo5); the city area table only counts
                -- between visits that have no drive of their own.
                AND tsrange(t.starts - t.trip * interval '1 minute',
                            t.ends + c.buf + t.trip * interval '1 minute'
                            + CASE WHEN biz.travels AND t.trip = 0 AND here.trip = 0 THEN public.travel_minutes(biz.market, biz.base_zone, t.place, here.place, t.ends) ELSE 0 END * interval '1 minute', '[)')
                    && tsrange(c.slot_start - here.trip * interval '1 minute',
                               c.slot_end + c.buf + here.trip * interval '1 minute'
                               + CASE WHEN biz.travels AND t.trip = 0 AND here.trip = 0 THEN public.travel_minutes(biz.market, biz.base_zone, here.place, t.place, c.slot_end) ELSE 0 END * interval '1 minute', '[)'))
       AND NOT EXISTS (
             SELECT 1 FROM public.time_blocks tb
              WHERE tb.business_id = p_business_id
                AND (tb.staff_id = c.staff_id OR tb.staff_id IS NULL)
                AND tsrange(tb.starts_at, tb.ends_at, '[)') && tsrange(c.slot_start, c.slot_end, '[)'))
  )
  SELECT DISTINCT ON (f.slot_start, CASE WHEN p_staff_id IS NULL THEN NULL ELSE f.staff_id END)
         f.slot_start::time, f.staff_id, f.display_name
    FROM free f
   ORDER BY f.slot_start, CASE WHEN p_staff_id IS NULL THEN NULL ELSE f.staff_id END, f.sort_order, f.created_at
$$;

REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer, text, text, integer) TO anon, authenticated, service_role;

-- 2. The price with the drive.
DROP FUNCTION IF EXISTS public.payment_quote(uuid, uuid, uuid[], text, integer);

CREATE OR REPLACE FUNCTION public.payment_quote(p_business_id uuid, p_service_id uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text, p_people integer DEFAULT 1, p_travel_quote uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_price numeric;
  v_travel numeric := 0;
  t record;
BEGIN
  SELECT s.price + coalesce((
           SELECT sum(x.price) FROM public.services x
            WHERE x.id = ANY (coalesce(p_addon_ids, '{}')) AND x.id <> s.id
              AND x.business_id = p_business_id AND x.is_active AND x.is_addon), 0)
    INTO v_price
    FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active;
  IF v_price IS NULL THEN
    RETURN jsonb_build_object('online', false);
  END IF;
  -- A group priced per person pays the price once for each of them; extras are never in a group.
  IF coalesce(p_people, 1) > 1 THEN
    SELECT CASE WHEN s.price_per = 'person' THEN s.price * p_people ELSE s.price END INTO v_price
      FROM public.services s WHERE s.id = p_service_id AND p_people <= s.max_people;
    IF v_price IS NULL THEN
      RETURN jsonb_build_object('online', false);
    END IF;
  END IF;
  -- A visit at the client's place carries the service's travel fee; fees are worked out on the price alone.
  IF p_mode = 'at_client' THEN
    SELECT s.travel_fee INTO v_travel FROM public.services s WHERE s.id = p_service_id;
    -- geo5: by road for this address, when a fresh quote for this business is given.
    IF p_travel_quote IS NOT NULL THEN
      v_travel := coalesce((SELECT tq.fee FROM public.travel_quotes tq
                             WHERE tq.id = p_travel_quote AND tq.business_id = p_business_id AND tq.expires_at > now()), v_travel);
    END IF;
  END IF;

  SELECT * INTO t FROM public.payment_terms(p_business_id, v_price);
  IF NOT coalesce(t.online, false) THEN
    RETURN jsonb_build_object('online', false);
  END IF;

  RETURN jsonb_build_object(
    'online', true,
    'provider', t.provider,
    'currency', t.currency,
    'price', v_price,
    'client_fee', t.client_fee,
    'travel_fee', coalesce(v_travel, 0),
    'total', v_price + coalesce(v_travel, 0) + t.client_fee,
    'methods', to_jsonb(t.methods),
    'hold_minutes', t.hold_minutes,
    'policy', jsonb_build_object('free_hours', t.free_hours, 'keep_pct', t.keep_pct, 'no_show_keep_pct', t.no_show_keep_pct)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[], text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[], text, integer, uuid) TO anon, authenticated, service_role;

-- 2 and 3. The booking takes the quote: its fee, its drive.
DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer);

CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text, p_client_address text DEFAULT NULL::text, p_client_landmark text DEFAULT NULL::text, p_client_zone text DEFAULT NULL::text, p_client_lat double precision DEFAULT NULL::double precision, p_client_lng double precision DEFAULT NULL::double precision, p_client_place_id text DEFAULT NULL::text, p_people integer DEFAULT 1, p_travel_quote uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_auto boolean;
  v_duration integer;
  v_local_now timestamp;
  v_staff uuid;
  v_name text := trim(p_client_name);
  v_email text := NULLIF(lower(trim(p_client_email)), '');
  -- Booked from WhatsApp by the whatsapp function (service role only): the phone is the client and
  -- the email may be left out.
  v_wa boolean := coalesce(current_setting('locappoint.channel', true), '') = 'whatsapp'
                  AND coalesce(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role';
  v_phone text := trim(p_client_phone);
  v_digits text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_id uuid;
  v_ids uuid[] := ARRAY(SELECT DISTINCT unnest(coalesce(p_addon_ids, '{}')));
  v_addons jsonb := '[]';
  v_extra integer := 0;
  v_price numeric;
  v_service_price numeric;
  v_base numeric;
  v_terms record;
  v_online boolean := false;
  v_modes text[];
  v_mode text;
  v_travel numeric := 0;
  v_zones text[];
  v_address text := NULLIF(trim(p_client_address), '');
  v_landmark text := NULLIF(trim(p_client_landmark), '');
  v_zone text := NULLIF(trim(p_client_zone), '');
  v_place text := NULLIF(trim(p_client_place_id), '');
  v_radius numeric;
  v_blat double precision;
  v_blng double precision;
  v_market text;
  v_by_zone boolean;
  v_by_km boolean;
  v_km numeric;
  v_people integer := coalesce(p_people, 1);
  v_max integer;
  v_price_per text;
  v_each integer;
  v_trip integer;
  v_trip_km numeric;
  q record;
BEGIN
  IF v_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_uid) THEN
    v_uid := NULL;
  END IF;

  SELECT b.timezone, b.auto_confirm INTO v_tz, v_auto
    FROM public.businesses b WHERE b.id = p_business_id AND b.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This business is not taking bookings' USING ERRCODE = 'P0002';
  END IF;
  IF v_uid IS NOT NULL AND public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'This is your own business. Add bookings from your calendar.' USING ERRCODE = '42501';
  END IF;

  SELECT s.duration_minutes, s.price, s.modes, s.travel_fee, s.max_people, s.price_per, coalesce(s.extra_person_minutes, s.duration_minutes)
    INTO v_duration, v_price, v_modes, v_travel, v_max, v_price_per, v_each
    FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

  -- A group: one booking, one staff member, everyone one after another. Extras stay one-person.
  IF v_people < 1 OR v_people > coalesce(v_max, 1) THEN
    RAISE EXCEPTION 'This service is for up to % %', coalesce(v_max, 1), CASE WHEN coalesce(v_max, 1) = 1 THEN 'person' ELSE 'people' END USING ERRCODE = '22023';
  END IF;
  IF v_people > 1 AND cardinality(v_ids) > 0 THEN
    RAISE EXCEPTION 'Extras are for one person. Book them on their own.' USING ERRCODE = '22023';
  END IF;
  IF v_people > 1 THEN
    v_duration := v_duration + (v_people - 1) * v_each;
    IF v_price_per = 'person' THEN
      v_price := v_price * v_people;
    END IF;
  END IF;

  -- Where it happens: one of the ways the service is offered; the first one when the client did not say.
  v_mode := coalesce(NULLIF(trim(p_mode), ''), v_modes[1], 'at_business');
  IF NOT (v_mode = ANY (coalesce(v_modes, ARRAY['at_business']))) THEN
    RAISE EXCEPTION 'This service is not offered that way. Pick again.' USING ERRCODE = '22023';
  END IF;
  -- At the client's place: inside the areas the business covers, or within the distance it travels
  -- from its shop (straight line), with an address it can find.
  IF v_mode = 'at_client' THEN
    SELECT b.service_zones, b.service_radius_km, b.lat, b.lng, b.market
      INTO v_zones, v_radius, v_blat, v_blng, v_market
      FROM public.businesses b WHERE b.id = p_business_id;
    v_by_zone := cardinality(coalesce(v_zones, '{}')) > 0;
    v_by_km := v_radius IS NOT NULL AND v_blat IS NOT NULL AND v_blng IS NOT NULL;
    IF NOT v_by_zone AND NOT v_by_km THEN
      RAISE EXCEPTION 'This business has not said where it travels yet. Pick another way.' USING ERRCODE = '22023';
    END IF;
    IF (p_client_lat IS NULL) <> (p_client_lng IS NULL)
       OR p_client_lat NOT BETWEEN -90 AND 90 OR p_client_lng NOT BETWEEN -180 AND 180 THEN
      RAISE EXCEPTION 'Pick your address again from the suggestions' USING ERRCODE = '22023';
    END IF;
    IF v_place IS NOT NULL AND (v_place !~ '^[A-Za-z0-9_-]+$' OR length(v_place) NOT BETWEEN 10 AND 300) THEN
      v_place := NULL;
    END IF;
    IF v_by_km AND p_client_lat IS NOT NULL THEN
      v_km := public.km_between(v_blat, v_blng, p_client_lat, p_client_lng);
    END IF;

    IF v_zone IS NOT NULL AND v_zone = ANY (coalesce(v_zones, '{}')) THEN
      NULL;
    ELSIF v_km IS NOT NULL AND v_km <= v_radius THEN
      -- Inside the distance: the area is kept only when it is one of the city's areas.
      IF v_zone IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.market_zones z WHERE z.market = v_market AND z.name = v_zone) THEN
        v_zone := NULL;
      END IF;
    ELSIF v_km IS NOT NULL THEN
      RAISE EXCEPTION 'That address is about % km away. This business travels up to % km%.',
        round(v_km, 1), trim_scale(v_radius), CASE WHEN v_by_zone THEN ' and to the areas it lists' ELSE '' END
        USING ERRCODE = '22023';
    ELSIF v_by_km AND NOT v_by_zone THEN
      RAISE EXCEPTION 'Pick your address from the suggestions' USING ERRCODE = '22023';
    ELSIF v_zone IS NOT NULL THEN
      RAISE EXCEPTION 'This business does not go to %. Pick another way.', left(v_zone, 60) USING ERRCODE = '22023';
    ELSE
      RAISE EXCEPTION 'Pick your area from the list' USING ERRCODE = '22023';
    END IF;
    IF v_address IS NULL OR length(v_address) NOT BETWEEN 5 AND 300 THEN
      RAISE EXCEPTION 'Enter the address where the visit happens' USING ERRCODE = '22023';
    END IF;
    IF v_landmark IS NOT NULL AND length(v_landmark) > 200 THEN
      RAISE EXCEPTION 'Keep the directions under 200 characters' USING ERRCODE = '22023';
    END IF;
    -- geo5: a fee and a drive worked out by road for this address (travel_quote_make). It must be this
    -- business's, for this address, and fresh; otherwise the service's own fee stands.
    IF p_travel_quote IS NOT NULL THEN
      SELECT * INTO q FROM public.travel_quotes tq
       WHERE tq.id = p_travel_quote AND tq.business_id = p_business_id AND tq.expires_at > now()
         AND tq.place_id IS NOT DISTINCT FROM v_place;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'The travel price changed. Pick your address again.' USING ERRCODE = '22023';
      END IF;
      v_travel := coalesce(q.fee, v_travel);
      v_trip := q.minutes;
      v_trip_km := q.km;
    END IF;
  ELSE
    v_address := NULL;
    v_landmark := NULL;
    v_zone := NULL;
    v_place := NULL;
    v_travel := 0;
  END IF;
  v_service_price := v_price;

  -- Extras: up to three, each offered as an extra by this business. Time and price add up.
  IF cardinality(v_ids) > 3 THEN
    RAISE EXCEPTION 'Add up to three extras' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_ids) > 0 THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.service_name, 'minutes', s.duration_minutes, 'price', s.price) ORDER BY s.sort_order, s.service_name), '[]'),
           coalesce(sum(s.duration_minutes), 0), v_price + coalesce(sum(s.price), 0)
      INTO v_addons, v_extra, v_price
      FROM public.services s
     WHERE s.id = ANY (v_ids) AND s.id <> p_service_id
       AND s.business_id = p_business_id AND s.is_active = true AND s.is_addon = true;
    IF jsonb_array_length(v_addons) <> cardinality(v_ids) THEN
      RAISE EXCEPTION 'One of the extras is not available. Pick again.' USING ERRCODE = 'P0002';
    END IF;
  ELSIF v_people = 1 THEN
    v_price := NULL;
  END IF;

  -- Paid online once the business has payouts on: the time is held while the client pays, and
  -- nobody is told about the booking until the payment arrives (payment_succeeded).
  v_base := CASE WHEN cardinality(v_ids) > 0 THEN v_price ELSE v_service_price END;
  SELECT * INTO v_terms FROM public.payment_terms(p_business_id, v_base);
  v_online := coalesce(v_terms.online, false);

  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter your name' USING ERRCODE = '22023';
  END IF;
  IF (v_email IS NULL AND NOT v_wa) OR (v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')) THEN
    RAISE EXCEPTION 'Enter a valid email' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NULL OR length(v_phone) NOT BETWEEN 5 AND 40 OR length(v_digits) < 6 THEN
    RAISE EXCEPTION 'Enter a valid phone number' USING ERRCODE = '22023';
  END IF;

  v_local_now := now() AT TIME ZONE v_tz;
  IF p_date + p_time <= v_local_now THEN
    RAISE EXCEPTION 'That time has already passed' USING ERRCODE = '22023';
  END IF;
  IF p_date + p_time > v_local_now + interval '90 days' THEN
    RAISE EXCEPTION 'Bookings open up to 90 days ahead' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.appointments a
       WHERE a.business_id = p_business_id
         AND a.status IN ('pending', 'confirmed')
         AND a.appointment_date + a.appointment_time > v_local_now
         AND ((v_uid IS NOT NULL AND a.client_id = v_uid)
              OR lower(a.client_email) = v_email
              OR (length(v_digits) >= 9 AND right(regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g'), 9) = right(v_digits, 9)))) >= 2 THEN
    RAISE EXCEPTION 'You already have two upcoming bookings here. Change or cancel one to book another.' USING ERRCODE = 'P0001';
  END IF;

  IF v_uid IS NULL AND (SELECT count(*) FROM public.appointments a
                         WHERE a.client_id IS NULL AND a.source = 'web'
                           AND lower(a.client_email) = v_email
                           AND a.status IN ('pending', 'confirmed')
                           AND a.appointment_date >= current_date) >= 5 THEN
    RAISE EXCEPTION 'This email already has five upcoming bookings. Create a free account to book more.' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.staff_id INTO v_staff
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id, NULL, CASE WHEN cardinality(v_ids) > 0 THEN v_ids END, v_people, v_mode, v_zone, v_trip) s
   WHERE s.slot_time = p_time
   LIMIT 1;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
  END IF;

  PERFORM set_config('locappoint.actor', 'client', true);
  BEGIN
    INSERT INTO public.appointments (
      business_id, staff_id, client_id, service_id, appointment_date, appointment_time,
      duration_minutes, status, source, client_name, client_email, client_phone, notes, addons, price,
      client_fee, business_fee, payment_status, hold_until, mode,
      client_address, client_landmark, client_zone, travel_fee, client_place_id, people, travel_minutes, travel_km
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, CASE WHEN v_wa THEN 'whatsapp' ELSE 'web' END,
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END,
      v_mode,
      v_address, v_landmark, v_zone, coalesce(v_travel, 0), v_place, v_people, v_trip, v_trip_km
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    PERFORM set_config('locappoint.actor', '', true);
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.actor', '', true);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer, uuid) TO anon, authenticated, service_role;

COMMIT;
