-- Extras and the 2-hour reminder.
-- An extra is a normal service the business also offers on top of another one (a beard trim with a cut).
-- Picked extras add their time and price to one booking in one slot, and the person booked must do all of them.
-- A moved booking keeps its extras. The 2-hour reminder reuses the reminder email with its own send key. Safe to run again.

BEGIN;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.get_available_slots(uuid, uuid, date, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[]);
CREATE FUNCTION public.get_available_slots(p_business_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[])
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
  svc AS (
    SELECT s.id, (s.duration_minutes + CASE WHEN p_addon_ids IS NULL THEN (SELECT minutes FROM moved)
                                            ELSE coalesce((SELECT sum(e.duration_minutes) FROM extras e), 0) END) * interval '1 minute' AS dur
      FROM public.services s
     WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true
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

DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid, uuid[]);
CREATE FUNCTION public.book_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_time time,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_notes text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_addon_ids uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  SELECT s.duration_minutes, s.price INTO v_duration, v_price FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

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
  ELSE
    v_price := NULL;
  END IF;

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
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id, NULL, CASE WHEN cardinality(v_ids) > 0 THEN v_ids END) s
   WHERE s.slot_time = p_time
   LIMIT 1;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
  END IF;

  PERFORM set_config('locappoint.actor', 'client', true);
  BEGIN
    INSERT INTO public.appointments (
      business_id, staff_id, client_id, service_id, appointment_date, appointment_time,
      duration_minutes, status, source, client_name, client_email, client_phone, notes, addons, price
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price
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

CREATE OR REPLACE FUNCTION public.send_booking_notice(a public.appointments, p_audience text, p_kind text, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload jsonb := public.booking_notice_payload(a);
  r record;
BEGIN
  -- Extras ride along in the service name, so every email and bell item shows the whole booking.
  IF jsonb_array_length(coalesce(a.addons, '[]')) > 0 THEN
    v_payload := v_payload || jsonb_build_object(
      'service_name', concat_ws(' + ', v_payload->>'service_name', (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(a.addons) x)));
  END IF;
  IF p_audience = 'client' THEN
    IF a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (a.client_id, 'client', p_kind, a.business_id, a.id, v_payload, p_kind || ':client:' || a.client_id || ':' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF a.client_email IS NOT NULL AND (a.client_id IS NOT NULL OR a.source = 'web') THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        p_kind,
        CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN a.client_id END,
        a.client_email, a.business_id, a.id,
        v_payload || jsonb_build_object('audience', 'client'),
        p_kind || ':client:email:' || lower(a.client_email) || ':' || p_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT ON (x.user_id) x.user_id, au.email, (pu.id IS NOT NULL) AS has_profile
      FROM (
        SELECT b.user_id FROM public.businesses b WHERE b.id = a.business_id
        UNION ALL
        SELECT m.user_id FROM public.business_members m
         WHERE m.id = a.staff_id AND m.status = 'active' AND m.user_id IS NOT NULL
      ) x
      LEFT JOIN auth.users au ON au.id = x.user_id
      LEFT JOIN public.users pu ON pu.id = x.user_id
     WHERE x.user_id IS NOT NULL
  LOOP
    IF r.has_profile THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (r.user_id, 'business', p_kind, a.business_id, a.id, v_payload, p_kind || ':business:' || r.user_id || ':' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF r.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        p_kind,
        CASE WHEN r.has_profile THEN r.user_id END,
        r.email, a.business_id, a.id,
        v_payload || jsonb_build_object('audience', 'business'),
        p_kind || ':business:email:' || r.user_id || ':' || p_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
BEGIN
  FOR a IN
    SELECT ap.*
      FROM public.appointments ap
      JOIN public.businesses b ON b.id = ap.business_id
     WHERE ap.status = 'confirmed'
       AND ap.appointment_date BETWEEN current_date - 1 AND current_date + 2
       AND ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours' <= now()
       AND ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '2 hours' > now()
       AND coalesce(ap.rescheduled_at, ap.created_at)
           <= ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours'
  LOOP
    BEGIN
      PERFORM public.send_booking_notice(a, 'client', 'booking_reminder',
        a.id || ':' || to_char(a.appointment_date + a.appointment_time, 'YYYYMMDDHH24MI'));
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;

  -- The same reminder again, about two hours before. Not for bookings made or moved in the last three hours.
  FOR a IN
    SELECT ap.*
      FROM public.appointments ap
      JOIN public.businesses b ON b.id = ap.business_id
     WHERE ap.status = 'confirmed'
       AND ap.appointment_date BETWEEN current_date - 1 AND current_date + 1
       AND ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '2 hours' <= now()
       AND ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '1 hour' > now()
       AND coalesce(ap.rescheduled_at, ap.created_at)
           <= ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '3 hours'
  LOOP
    BEGIN
      PERFORM public.send_booking_notice(a, 'client', 'booking_reminder',
        a.id || ':soon:' || to_char(a.appointment_date + a.appointment_time, 'YYYYMMDDHH24MI'));
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[]) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid, uuid[]) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_booking_notice(public.appointments, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_booking_reminders() FROM PUBLIC, anon, authenticated;

COMMIT;
