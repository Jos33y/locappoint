-- Booking lifecycle: automatic confirmation, client cancel and reschedule within a
-- per-business cut-off, who cancelled, the price at the time of booking, and a cap on
-- open bookings per client per business. Safe to run once; it stops if run twice.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'cancelled_by') THEN
    RAISE EXCEPTION 'booking-lifecycle.sql has already been run';
  END IF;
END;
$$;


-- Business settings. Every business, new and existing, confirms automatically.

ALTER TABLE public.businesses
  ADD COLUMN auto_confirm boolean NOT NULL DEFAULT true,
  ADD COLUMN cancel_cutoff_minutes integer NOT NULL DEFAULT 0
    CONSTRAINT businesses_cancel_cutoff_check CHECK (cancel_cutoff_minutes BETWEEN 0 AND 10080);


-- Appointment history. The price column takes the same type as services.price.

DO $$
DECLARE
  v_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_type
    FROM pg_attribute a
   WHERE a.attrelid = 'public.services'::regclass AND a.attname = 'price' AND NOT a.attisdropped;
  IF v_type IS NULL THEN
    RAISE EXCEPTION 'services.price was not found';
  END IF;
  EXECUTE format('ALTER TABLE public.appointments ADD COLUMN price %s', v_type);
END;
$$;

ALTER TABLE public.appointments
  ADD COLUMN cancelled_by text CONSTRAINT appointments_cancelled_by_check CHECK (cancelled_by IN ('client', 'business')),
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN rescheduled_from timestamp,
  ADD COLUMN rescheduled_at timestamptz;

UPDATE public.appointments a
   SET price = s.price
  FROM public.services s
 WHERE s.id = a.service_id AND a.price IS NULL;


-- Fills the price on every new booking, and records who cancelled and when.

CREATE OR REPLACE FUNCTION public.appointments_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.price IS NULL AND NEW.service_id IS NOT NULL THEN
      SELECT s.price INTO NEW.price FROM public.services s WHERE s.id = NEW.service_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.price IS DISTINCT FROM OLD.price THEN
    NEW.price := OLD.price;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := now();
    NEW.cancelled_by := CASE
      WHEN auth.uid() IS NOT NULL AND auth.uid() = OLD.client_id AND NOT public.is_business_member(OLD.business_id) THEN 'client'
      ELSE 'business'
    END;
  ELSIF NEW.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := NULL;
    NEW.cancelled_by := NULL;
  ELSE
    NEW.cancelled_at := OLD.cancelled_at;
    NEW.cancelled_by := OLD.cancelled_by;
  END IF;

  IF current_setting('locappoint.trusted_write', true) IS DISTINCT FROM 'on' THEN
    NEW.rescheduled_from := OLD.rescheduled_from;
    NEW.rescheduled_at := OLD.rescheduled_at;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointments_lifecycle() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_lifecycle
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_lifecycle();


-- Free slots can now leave out one booking, so a client can move a booking into a time
-- that overlaps its own current slot.

DROP FUNCTION public.get_available_slots(uuid, uuid, date, uuid);

CREATE FUNCTION public.get_available_slots(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid DEFAULT NULL,
  p_ignore_appointment uuid DEFAULT NULL
)
RETURNS TABLE (slot_time time, staff_id uuid, staff_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH biz AS (
    SELECT b.id, (now() AT TIME ZONE b.timezone) AS local_now
      FROM public.businesses b
     WHERE b.id = p_business_id
       AND (b.is_active = true OR public.is_business_member(b.id))
  ),
  svc AS (
    SELECT s.id, s.duration_minutes * interval '1 minute' AS dur
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
            OR EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = p_service_id))
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
    SELECT w.staff_id, w.display_name, w.sort_order, w.created_at, g.slot_start, g.slot_start + svc.dur AS slot_end
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
                            ap.appointment_date + ap.appointment_time + ap.duration_minutes * interval '1 minute', '[)')
                    && tsrange(c.slot_start, c.slot_end, '[)'))
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

REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid) TO anon, authenticated;


-- Booking from the public page: confirmed straight away when the business confirms
-- automatically, and at most two upcoming bookings per client per business.

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_time time,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_notes text DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
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
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to book' USING ERRCODE = '28000';
  END IF;

  SELECT b.timezone, b.auto_confirm INTO v_tz, v_auto
    FROM public.businesses b WHERE b.id = p_business_id AND b.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This business is not taking bookings' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.duration_minutes INTO v_duration FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter your name' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NULL OR length(v_phone) NOT BETWEEN 5 AND 40 THEN
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
         AND a.client_id = v_uid
         AND a.status IN ('pending', 'confirmed')
         AND a.appointment_date + a.appointment_time > v_local_now) >= 2 THEN
    RAISE EXCEPTION 'You already have two upcoming bookings here. Change or cancel one to book another.' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.staff_id INTO v_staff
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id) s
   WHERE s.slot_time = p_time
   LIMIT 1;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
  END IF;

  BEGIN
    INSERT INTO public.appointments (
      business_id, staff_id, client_id, service_id, appointment_date, appointment_time,
      duration_minutes, status, source, client_name, client_email, client_phone, notes
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000)
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;

  RETURN v_id;
END;
$$;


-- Moving a booking. Staff and owners as before. A client can move their own booking up
-- to the business cut-off; it stays confirmed when the business confirms automatically,
-- and goes back to pending otherwise.

CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id uuid,
  p_date date,
  p_time time,
  p_staff_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_my_member uuid;
  v_is_owner boolean;
  v_staff uuid;
  v_status text;
  v_tz text;
  v_auto boolean;
  v_cutoff integer;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR a.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'That booking cannot be moved' USING ERRCODE = 'P0002';
  END IF;
  IF a.appointment_date = p_date AND a.appointment_time = p_time AND p_staff_id IS NULL THEN
    RAISE EXCEPTION 'That is already the time of this booking' USING ERRCODE = '22023';
  END IF;

  SELECT b.timezone, b.auto_confirm, b.cancel_cutoff_minutes INTO v_tz, v_auto, v_cutoff
    FROM public.businesses b WHERE b.id = a.business_id;

  v_my_member := public.my_member_id(a.business_id);
  v_is_owner := public.is_business_owner(a.business_id);
  v_status := a.status;

  IF v_my_member IS NOT NULL THEN
    IF NOT v_is_owner AND a.staff_id <> v_my_member THEN
      RAISE EXCEPTION 'Staff can only move their own bookings' USING ERRCODE = '42501';
    END IF;
    v_staff := COALESCE(p_staff_id, a.staff_id);
    IF NOT v_is_owner AND v_staff <> v_my_member THEN
      RAISE EXCEPTION 'Staff can only move bookings within their own calendar' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.business_members m
                    WHERE m.id = v_staff AND m.business_id = a.business_id AND m.status = 'active') THEN
      RAISE EXCEPTION 'That team member is not available' USING ERRCODE = 'P0002';
    END IF;
  ELSIF a.client_id = auth.uid() THEN
    IF a.appointment_date + a.appointment_time - v_cutoff * interval '1 minute' <= now() AT TIME ZONE v_tz THEN
      RAISE EXCEPTION 'It is too late to change this booking online. Message the business.' USING ERRCODE = '22023';
    END IF;
    IF a.service_id IS NULL THEN
      RAISE EXCEPTION 'This service is no longer offered. Message the business.' USING ERRCODE = 'P0002';
    END IF;
    SELECT s.staff_id INTO v_staff
      FROM public.get_available_slots(a.business_id, a.service_id, p_date, COALESCE(p_staff_id, a.staff_id), a.id) s
     WHERE s.slot_time = p_time
     LIMIT 1;
    IF v_staff IS NULL THEN
      SELECT s.staff_id INTO v_staff
        FROM public.get_available_slots(a.business_id, a.service_id, p_date, NULL, a.id) s
       WHERE s.slot_time = p_time
       LIMIT 1;
    END IF;
    IF v_staff IS NULL THEN
      RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
    END IF;
    v_status := CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END;
  ELSE
    RAISE EXCEPTION 'You cannot move this booking' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('locappoint.trusted_write', 'on', true);
  BEGIN
    UPDATE public.appointments
       SET appointment_date = p_date,
           appointment_time = p_time,
           staff_id = v_staff,
           status = v_status,
           rescheduled_from = a.appointment_date + a.appointment_time,
           rescheduled_at = now()
     WHERE id = p_appointment_id;
  EXCEPTION WHEN exclusion_violation THEN
    PERFORM set_config('locappoint.trusted_write', 'off', true);
    RAISE EXCEPTION 'That time overlaps another booking' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
END;
$$;


-- Cancelling as a client: pending or confirmed, up to the business cut-off.

CREATE FUNCTION public.cancel_my_booking(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_tz text;
  v_cutoff integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to cancel' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR a.client_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'We could not find this booking' USING ERRCODE = 'P0002';
  END IF;
  IF a.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled' USING ERRCODE = '22023';
  END IF;

  SELECT b.timezone, b.cancel_cutoff_minutes INTO v_tz, v_cutoff
    FROM public.businesses b WHERE b.id = a.business_id;
  IF a.appointment_date + a.appointment_time - v_cutoff * interval '1 minute' <= now() AT TIME ZONE v_tz THEN
    RAISE EXCEPTION 'It is too late to cancel this booking online. Message the business.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.appointments SET status = 'cancelled' WHERE id = p_appointment_id;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_my_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_booking(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
