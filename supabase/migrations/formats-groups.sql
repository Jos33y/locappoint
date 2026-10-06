-- Formats, part 3: groups. A service can take a group (services.max_people, off at 1): one person
-- books for several, one staff member does them one after another in a single booking. Each extra
-- person adds their own time (services.extra_person_minutes, or the service's own when empty). The
-- price is per person or for the whole group (services.price_per). Extras stay one-person: a group
-- booking has none. Decisions and how to change them: claude/18-decision-log.md.
-- Needs maps-radius.sql. Safe to run again.

BEGIN;

-- 1. Free times fit the whole group.
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.get_available_slots(p_business_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_people integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_time time without time zone, staff_id uuid, staff_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH biz AS (
    SELECT b.id, (now() AT TIME ZONE b.timezone) AS local_now, b.buffer_minutes * interval '1 minute' AS buf
      FROM public.businesses b
     WHERE b.id = p_business_id
       AND (b.is_active = true OR public.is_business_member(b.id))
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
     CROSS JOIN LATERAL generate_series(
       p_date + w.start_time,
       p_date + w.end_time - svc.dur,
       interval '15 minutes'
     ) AS g(slot_start)
     WHERE g.slot_start > biz.local_now
       AND g.slot_start <= biz.local_now + interval '90 days'
  ),
  free AS (
    SELECT c.*
      FROM candidates c
     WHERE NOT EXISTS (
             SELECT 1 FROM public.appointments ap
              WHERE ap.staff_id = c.staff_id
                AND ap.status IN ('pending', 'confirmed')
                AND (p_ignore_appointment IS NULL OR ap.id <> p_ignore_appointment)
                AND tsrange(ap.appointment_date + ap.appointment_time,
                            ap.appointment_date + ap.appointment_time + ap.duration_minutes * interval '1 minute' + c.buf, '[)')
                    && tsrange(c.slot_start, c.slot_end + c.buf, '[)'))
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
$function$;

REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer) TO anon, authenticated, service_role;

-- 2. Booking for a group.
DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text);

CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text, p_client_address text DEFAULT NULL::text, p_client_landmark text DEFAULT NULL::text, p_client_zone text DEFAULT NULL::text, p_client_lat double precision DEFAULT NULL::double precision, p_client_lng double precision DEFAULT NULL::double precision, p_client_place_id text DEFAULT NULL::text, p_people integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_auto boolean;
  v_duration integer;
  v_local_now timestamp;
  v_staff uuid;
  v_name text := trim(p_client_name);
  v_email text := lower(trim(p_client_email));
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
  IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
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
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id, NULL, CASE WHEN cardinality(v_ids) > 0 THEN v_ids END, v_people) s
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
      client_address, client_landmark, client_zone, travel_fee, client_place_id, people
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END,
      v_mode,
      v_address, v_landmark, v_zone, coalesce(v_travel, 0), v_place, v_people
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    PERFORM set_config('locappoint.actor', '', true);
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.actor', '', true);

  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer) TO anon, authenticated, service_role;


-- 3. The quote prices the group.
DROP FUNCTION IF EXISTS public.payment_quote(uuid, uuid, uuid[], text);

CREATE OR REPLACE FUNCTION public.payment_quote(p_business_id uuid, p_service_id uuid, p_addon_ids uuid[] DEFAULT NULL, p_mode text DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
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

REVOKE EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[], text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[], text, integer) TO anon, authenticated, service_role;


-- 4. Emails, the bell, push and receipts say how many people.
CREATE OR REPLACE FUNCTION public.booking_notice_payload(a appointments)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'business_name', b.business_name,
    'slug', b.slug,
    'address', b.address,
    'city', b.city,
    'country', b.country,
    'timezone', b.timezone,
    'business_phone', b.phone,
    'business_whatsapp', b.whatsapp,
    'auto_confirm', b.auto_confirm,
    'cancel_cutoff_minutes', b.cancel_cutoff_minutes,
    'service_name', s.service_name || CASE WHEN a.people > 1 THEN ' for ' || a.people || ' people' ELSE '' END,
    'people', a.people,
    'staff_name', m.display_name,
    'date', a.appointment_date,
    'time', to_char(a.appointment_time, 'HH24:MI'),
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'status', a.status,
    'client_name', a.client_name,
    'client_phone', a.client_phone,
    'notes', a.notes,
    'cancelled_by', a.cancelled_by,
    'moved_from', to_char(a.rescheduled_from, 'YYYY-MM-DD"T"HH24:MI'),
    'has_account', a.client_id IS NOT NULL,
    'manage_token', (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = a.id),
    'payment_status', a.payment_status,
    'total', a.total,
    'client_fee', a.client_fee,
    'currency', a.currency,
    'refund', (SELECT sum(f.amount) FROM public.payment_refunds f WHERE f.appointment_id = a.id AND f.status <> 'failed'),
    'mode', a.mode,
    'meeting_url', CASE WHEN a.mode = 'online' THEN coalesce(a.meeting_url, b.meeting_url) END,
    'client_zone', a.client_zone,
    'travel_fee', a.travel_fee,
    -- The address goes to the business only once it has confirmed the visit.
    'client_address', CASE WHEN a.mode = 'at_client' AND a.status IN ('confirmed', 'completed') THEN a.client_address END,
    'client_landmark', CASE WHEN a.mode = 'at_client' AND a.status IN ('confirmed', 'completed') THEN a.client_landmark END
  )
    FROM public.businesses b
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE b.id = a.business_id;
$function$;


CREATE OR REPLACE FUNCTION public.booking_by_link(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'appointment_date', a.appointment_date,
    'appointment_time', a.appointment_time,
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'notes', a.notes,
    'client_name', a.client_name,
    'client_email', a.client_email,
    'cancelled_by', a.cancelled_by,
    'rescheduled_from', a.rescheduled_from,
    'service_id', a.service_id,
    'has_account', a.client_id IS NOT NULL,
    'mode', a.mode,
    'people', a.people,
    'meeting_url', CASE WHEN a.mode = 'online' AND a.status = 'confirmed' THEN coalesce(a.meeting_url, b.meeting_url) END,
    'client_address', a.client_address,
    'client_landmark', a.client_landmark,
    'client_zone', a.client_zone,
    'travel_fee', a.travel_fee,
    'payment_status', a.payment_status,
    'total', a.total,
    'client_fee', a.client_fee,
    'currency', a.currency,
    'refund', (SELECT sum(f.amount) FROM public.payment_refunds f WHERE f.appointment_id = a.id AND f.status <> 'failed'),
    'policy', (SELECT jsonb_build_object('free_hours', r.free_cancel_hours, 'keep_pct', r.late_cancel_fee_max_pct)
                 FROM public.market_rules r WHERE r.market = b.market),
    'services', jsonb_build_object('id', s.id, 'service_name', s.service_name, 'duration_minutes', s.duration_minutes, 'price', s.price,
                                   'max_people', s.max_people, 'price_per', s.price_per, 'extra_person_minutes', s.extra_person_minutes),
    'businesses', jsonb_build_object(
      'id', b.id, 'business_name', b.business_name, 'slug', b.slug, 'address', b.address, 'city', b.city,
      'country', b.country, 'phone', b.phone, 'whatsapp', b.whatsapp, 'timezone', b.timezone,
      'banner_url', b.banner_url, 'logo_url', b.logo_url, 'category', b.category, 'category_detail', b.category_detail,
      'auto_confirm', b.auto_confirm, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes)
  )
    FROM public.booking_links l
    JOIN public.appointments a ON a.id = l.appointment_id
    JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.services s ON s.id = a.service_id
   WHERE l.token = p_token AND length(p_token) >= 32;
$function$;


CREATE OR REPLACE FUNCTION public.issue_receipt(p_appointment uuid, p_kind text, p_refund uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  b public.businesses;
  pay public.payments;
  f public.payment_refunds;
  v_service text;
  v_staff text;
  v_seq integer;
  v_prefix text;
  v_lines jsonb;
  v_total numeric;
  v_currency text;
  v_method text;
  v_refund_of text;
  v_id uuid;
  r public.receipts;
BEGIN
  BEGIN
    IF p_kind = 'refund' THEN
      SELECT * INTO f FROM public.payment_refunds WHERE id = p_refund;
      IF NOT FOUND OR f.status <> 'sent' THEN RETURN NULL; END IF;
      SELECT * INTO pay FROM public.payments WHERE id = f.payment_id;
      SELECT * INTO a FROM public.appointments WHERE id = coalesce(f.appointment_id, pay.appointment_id);
      SELECT * INTO b FROM public.businesses WHERE id = pay.business_id;
    ELSE
      SELECT * INTO a FROM public.appointments WHERE id = p_appointment;
      IF NOT FOUND THEN RETURN NULL; END IF;
      SELECT * INTO b FROM public.businesses WHERE id = a.business_id;
    END IF;
    IF b.id IS NULL THEN RETURN NULL; END IF;

    IF p_kind IN ('payment', 'visit') AND EXISTS (SELECT 1 FROM public.receipts x WHERE x.appointment_id = a.id AND x.kind = p_kind) THEN
      RETURN NULL;
    END IF;
    IF p_kind = 'refund' AND EXISTS (SELECT 1 FROM public.receipts x WHERE x.refund_id = f.id) THEN
      RETURN NULL;
    END IF;

    SELECT s.service_name INTO v_service FROM public.services s WHERE s.id = a.service_id;
    SELECT m.display_name INTO v_staff FROM public.business_members m WHERE m.id = a.staff_id;
    IF coalesce(a.people, 1) > 1 THEN
      v_service := coalesce(v_service, 'Booking') || ' for ' || a.people || ' people';
    END IF;
    IF jsonb_array_length(coalesce(a.addons, '[]')) > 0 THEN
      v_service := concat_ws(' + ', v_service, (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(a.addons) x));
    END IF;
    v_currency := coalesce(pay.currency, a.currency, CASE WHEN b.country = 'NG' THEN 'NGN' ELSE 'EUR' END);

    IF p_kind = 'payment' THEN
      SELECT * INTO pay FROM public.payments x
       WHERE x.appointment_id = a.id AND x.status IN ('paid', 'refunded', 'partly_refunded')
       ORDER BY x.paid_at DESC NULLS LAST LIMIT 1;
      IF NOT FOUND OR coalesce(a.total, 0) <= 0 THEN RETURN NULL; END IF;
      v_currency := pay.currency;
      v_total := pay.amount;
      v_method := coalesce(pay.method, a.payment_method, 'card');
      v_lines := jsonb_build_array(jsonb_build_object('label', coalesce(v_service, 'Booking'), 'amount', a.price))
        || CASE WHEN coalesce(a.travel_fee, 0) > 0 THEN jsonb_build_array(jsonb_build_object('label', 'Travel to you', 'amount', a.travel_fee)) ELSE '[]'::jsonb END
        || CASE WHEN coalesce(a.client_fee, 0) > 0 THEN jsonb_build_array(jsonb_build_object('label', 'Locappoint service fee', 'amount', a.client_fee)) ELSE '[]'::jsonb END;
    ELSIF p_kind = 'refund' THEN
      v_total := f.amount;
      v_method := coalesce(pay.method, 'card');
      SELECT x.number INTO v_refund_of FROM public.receipts x WHERE x.payment_id = pay.id AND x.kind = 'payment' LIMIT 1;
      v_lines := jsonb_build_array(jsonb_build_object(
        'label', CASE f.reason
          WHEN 'client_cancelled' THEN 'Cancelled in time, full refund'
          WHEN 'client_late_cancel' THEN 'Cancelled after free cancellation closed'
          WHEN 'business_cancelled' THEN 'Cancelled by the business, full refund'
          WHEN 'declined' THEN 'Not accepted by the business, full refund'
          WHEN 'no_show' THEN 'Missed visit'
          ELSE 'Paid after the time was released, full refund' END,
        'amount', f.amount));
    ELSE
      IF coalesce(a.price, 0) <= 0 OR a.payment_status <> 'at_visit' THEN RETURN NULL; END IF;
      v_total := a.price + coalesce(a.travel_fee, 0);
      v_method := 'at_visit';
      v_lines := jsonb_build_array(jsonb_build_object('label', coalesce(v_service, 'Visit'), 'amount', a.price))
        || CASE WHEN coalesce(a.travel_fee, 0) > 0 THEN jsonb_build_array(jsonb_build_object('label', 'Travel to you', 'amount', a.travel_fee)) ELSE '[]'::jsonb END;
    END IF;

    -- Numbered per business, in order, without gaps between concurrent issues.
    PERFORM pg_advisory_xact_lock(hashtext('receipts:' || b.id::text));
    SELECT coalesce(max(x.seq), 0) + 1 INTO v_seq FROM public.receipts x WHERE x.business_id = b.id;
    v_prefix := upper(left(regexp_replace(coalesce(b.slug, b.business_name, ''), '[^A-Za-z]', '', 'g'), 3));
    IF char_length(v_prefix) < 3 THEN v_prefix := 'LOC'; END IF;

    INSERT INTO public.receipts (business_id, appointment_id, payment_id, refund_id, kind, seq, number, client_name, client_email,
                                 business, booking, lines, total, currency, method, refund_of)
    VALUES (
      b.id, a.id, pay.id, f.id, p_kind, v_seq, v_prefix || '-' || lpad(v_seq::text, 5, '0'),
      a.client_name, a.client_email,
      jsonb_build_object('name', b.business_name, 'address', b.address, 'city', b.city, 'country', b.country, 'slug', b.slug),
      jsonb_build_object('service', coalesce(v_service, 'Booking'), 'staff', v_staff,
                         'date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'), 'duration_minutes', a.duration_minutes),
      v_lines, v_total, v_currency, v_method, v_refund_of
    )
    RETURNING * INTO r;
    v_id := r.id;

    -- Emailed under the same rule as booking emails: the client's own account, or a booking they made.
    IF current_setting('locappoint.receipts_quiet', true) IS DISTINCT FROM 'on' AND a.id IS NOT NULL AND a.client_email IS NOT NULL AND (a.client_id IS NOT NULL OR a.source = 'web') THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        'receipt',
        CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN a.client_id END,
        a.client_email, b.id, a.id,
        jsonb_build_object('audience', 'client', 'kind', r.kind, 'number', r.number, 'token', r.token, 'business', r.business,
                           'booking', r.booking, 'lines', r.lines, 'total', r.total, 'currency', r.currency, 'method', r.method,
                           'refund_of', r.refund_of, 'client_name', r.client_name, 'issued_at', r.issued_at),
        'receipt:' || r.id
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN v_id;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'receipt not issued for % (%): %', coalesce(p_appointment, p_refund), p_kind, SQLERRM;
    RETURN NULL;
  END;
END;
$$;


COMMIT;
