-- Formats, part 2: visits at the client's place. A service can be offered at the client's place
-- (services.modes), with its own travel fee; the business says which municipalities it covers
-- (businesses.service_zones, from market_zones). The client picks their area, gives the address
-- and optional directions. The business sees the area at once and the full address only after it
-- confirms; the address is cleared from the booking 30 days after the visit.
-- A radius in km waits for a geocoding provider. Needs formats-online.sql and receipts.sql. Safe to run again.

BEGIN;

-- 1. Municipalities a business can cover, Porto and Lisbon metropolitan areas.
INSERT INTO public.market_zones (market, name, sort_order)
SELECT 'porto', z, n FROM unnest(ARRAY[
  'Porto', 'Vila Nova de Gaia', 'Matosinhos', 'Maia', 'Gondomar', 'Valongo', 'Espinho',
  'Vila do Conde', 'Póvoa de Varzim', 'Santo Tirso', 'Trofa', 'Paredes', 'Santa Maria da Feira'
]) WITH ORDINALITY AS t(z, n)
ON CONFLICT (market, name) DO NOTHING;

INSERT INTO public.market_zones (market, name, sort_order)
SELECT 'lisbon', z, n FROM unnest(ARRAY[
  'Lisboa', 'Oeiras', 'Cascais', 'Sintra', 'Amadora', 'Odivelas', 'Loures', 'Almada',
  'Seixal', 'Barreiro', 'Vila Franca de Xira', 'Mafra', 'Setúbal'
]) WITH ORDINALITY AS t(z, n)
ON CONFLICT (market, name) DO NOTHING;

-- 2. Booking: where the visit happens, for visits at the client's place.
DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text);

CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text, p_client_address text DEFAULT NULL::text, p_client_landmark text DEFAULT NULL::text, p_client_zone text DEFAULT NULL::text)
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

  SELECT s.duration_minutes, s.price, s.modes, s.travel_fee INTO v_duration, v_price, v_modes, v_travel FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

  -- Where it happens: one of the ways the service is offered; the first one when the client did not say.
  v_mode := coalesce(NULLIF(trim(p_mode), ''), v_modes[1], 'at_business');
  IF NOT (v_mode = ANY (coalesce(v_modes, ARRAY['at_business']))) THEN
    RAISE EXCEPTION 'This service is not offered that way. Pick again.' USING ERRCODE = '22023';
  END IF;
  -- At the client's place: inside the areas the business covers, with an address it can find.
  IF v_mode = 'at_client' THEN
    SELECT b.service_zones INTO v_zones FROM public.businesses b WHERE b.id = p_business_id;
    IF cardinality(coalesce(v_zones, '{}')) = 0 THEN
      RAISE EXCEPTION 'This business has not said where it travels yet. Pick another way.' USING ERRCODE = '22023';
    END IF;
    IF v_zone IS NULL OR NOT (v_zone = ANY (v_zones)) THEN
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
      client_fee, business_fee, payment_status, hold_until, mode,
      client_address, client_landmark, client_zone, travel_fee
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END,
      v_mode,
      v_address, v_landmark, v_zone, coalesce(v_travel, 0)
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

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text) TO anon, authenticated, service_role;

-- 3. The quote includes the travel fee for a visit at the client's place.
DROP FUNCTION IF EXISTS public.payment_quote(uuid, uuid, uuid[]);

CREATE OR REPLACE FUNCTION public.payment_quote(p_business_id uuid, p_service_id uuid, p_addon_ids uuid[] DEFAULT NULL, p_mode text DEFAULT NULL)
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

REVOKE EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[], text) TO anon, authenticated, service_role;

-- 4. Emails, the bell and push: the area always, the address once confirmed.
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

-- 5. The manage page: the client's own address and the travel fee.
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

-- 6. Receipts list the travel fee.
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

-- 7. Addresses do not outlive the visit: cleared 30 days after it, every night.
CREATE OR REPLACE FUNCTION public.clear_visit_addresses()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.appointments
     SET client_address = NULL, client_landmark = NULL
   WHERE (client_address IS NOT NULL OR client_landmark IS NOT NULL)
     AND appointment_date < current_date - 30;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_visit_addresses() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'clear-visit-addresses';
SELECT cron.schedule('clear-visit-addresses', '17 3 * * *', $job$SELECT public.clear_visit_addresses();$job$);

COMMIT;
