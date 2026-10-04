-- Formats, part 1: online sessions. A service is offered in person, online, or both (services.modes,
-- set per service). An online booking carries the business's meeting link, which the client sees
-- once the booking is confirmed (manage page, emails, calendar invite) and never an address.
-- Visits at the client's place come in part 2. Needs pay-at-booking.sql. Safe to run again.

BEGIN;

-- 1. Booking: the client says where (p_mode); the old ten-argument version goes.
DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text)
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

  SELECT s.duration_minutes, s.price, s.modes INTO v_duration, v_price, v_modes FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

  -- Where it happens: one of the ways the service is offered; the first one when the client did not say.
  v_mode := coalesce(NULLIF(trim(p_mode), ''), v_modes[1], 'at_business');
  IF NOT (v_mode = ANY (coalesce(v_modes, ARRAY['at_business']))) THEN
    RAISE EXCEPTION 'This service is not offered that way. Pick again.' USING ERRCODE = '22023';
  END IF;
  IF v_mode = 'at_client' THEN
    RAISE EXCEPTION 'Visits at your place open soon. Pick another way.' USING ERRCODE = '22023';
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
  ELSE
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
      duration_minutes, status, source, client_name, client_email, client_phone, notes, addons, price,
      client_fee, business_fee, payment_status, hold_until, mode
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END,
      v_mode
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

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text) TO anon, authenticated, service_role;

-- 2. Emails, the bell and push know where it happens, and the link for online sessions.
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
    'service_name', s.service_name,
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
    'meeting_url', CASE WHEN a.mode = 'online' THEN coalesce(a.meeting_url, b.meeting_url) END
  )
    FROM public.businesses b
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE b.id = a.business_id;
$function$;

-- 3. The manage page: the link only once the business has confirmed.
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
    'meeting_url', CASE WHEN a.mode = 'online' AND a.status = 'confirmed' THEN coalesce(a.meeting_url, b.meeting_url) END,
    'payment_status', a.payment_status,
    'total', a.total,
    'client_fee', a.client_fee,
    'currency', a.currency,
    'refund', (SELECT sum(f.amount) FROM public.payment_refunds f WHERE f.appointment_id = a.id AND f.status <> 'failed'),
    'policy', (SELECT jsonb_build_object('free_hours', r.free_cancel_hours, 'keep_pct', r.late_cancel_fee_max_pct)
                 FROM public.market_rules r WHERE r.market = b.market),
    'services', jsonb_build_object('id', s.id, 'service_name', s.service_name, 'duration_minutes', s.duration_minutes, 'price', s.price),
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

COMMIT;
