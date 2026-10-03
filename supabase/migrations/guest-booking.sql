-- Booking without an account. A guest books with name, email and phone. Every online booking gets
-- a private manage link (emailed) to see, move or cancel it without signing in. When the person
-- later confirms an account with the same email, their guest bookings move into it.
-- Needs booking-lifecycle.sql and booking-notifications.sql first. Safe to run again.

BEGIN;

-- Private manage links. Only database functions read this table.
CREATE TABLE IF NOT EXISTS public.booking_links (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_links FROM anon, authenticated;

-- Links for bookings made before this file.
INSERT INTO public.booking_links (appointment_id)
SELECT a.id FROM public.appointments a
 WHERE a.status IN ('pending', 'confirmed')
ON CONFLICT (appointment_id) DO NOTHING;


-- Who is acting: the client (signed in as themselves, or through their manage link) or the business.
CREATE OR REPLACE FUNCTION public.acting_as_client(p_business_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT current_setting('locappoint.actor', true) = 'client'
      OR (auth.uid() IS NOT NULL AND auth.uid() = p_client_id AND NOT public.is_business_member(p_business_id));
$$;

REVOKE EXECUTE ON FUNCTION public.acting_as_client(uuid, uuid) FROM PUBLIC, anon, authenticated;


-- Same as before, with "who cancelled" read through acting_as_client, so a cancel from a manage link counts as the client's.
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
    NEW.cancelled_by := CASE WHEN public.acting_as_client(OLD.business_id, OLD.client_id) THEN 'client' ELSE 'business' END;
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


-- Every online booking gets its manage link the moment it exists.
CREATE OR REPLACE FUNCTION public.appointments_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.booking_links (appointment_id) VALUES (NEW.id) ON CONFLICT (appointment_id) DO NOTHING;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointments_link() FROM PUBLIC, anon, authenticated;

-- Named so it runs before notify_booking_change (triggers fire in name order), so the first email carries the link.
DROP TRIGGER IF EXISTS appointments_link ON public.appointments;
CREATE TRIGGER appointments_link
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_link();


-- The email payload now carries the manage link and whether the client has an account.
CREATE OR REPLACE FUNCTION public.booking_notice_payload(a public.appointments)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
    'manage_token', (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = a.id)
  )
    FROM public.businesses b
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE b.id = a.business_id;
$$;


-- Same rules as before; "by the client" now includes the manage link.
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_by_client boolean;
  v_key text;
BEGIN
  BEGIN
    v_by_client := public.acting_as_client(NEW.business_id, NEW.client_id);

    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('pending', 'confirmed') THEN
        RETURN NULL;
      END IF;
      v_key := NEW.id::text;
      IF NEW.status = 'confirmed' THEN
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
        IF v_by_client OR NEW.source = 'web' THEN
          PERFORM public.send_booking_notice(NEW, 'business', 'booking_new', v_key);
        END IF;
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_requested', v_key);
        PERFORM public.send_booking_notice(NEW, 'business', 'booking_request', v_key);
      END IF;
      RETURN NULL;
    END IF;

    IF NEW.rescheduled_at IS NOT NULL AND NEW.rescheduled_at IS DISTINCT FROM OLD.rescheduled_at
       AND NEW.status IN ('pending', 'confirmed') THEN
      v_key := NEW.id || ':' || extract(epoch FROM NEW.rescheduled_at)::bigint;
      IF v_by_client THEN
        PERFORM public.send_booking_notice(NEW, 'business',
          CASE WHEN NEW.status = 'pending' THEN 'booking_request' ELSE 'booking_moved' END, 'moved:' || v_key);
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_moved', v_key);
      END IF;
      RETURN NULL;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NULL;
    END IF;

    v_key := NEW.id || ':' || extract(epoch FROM coalesce(NEW.rescheduled_at, NEW.created_at))::bigint;

    IF NEW.status = 'confirmed' AND OLD.status = 'pending' AND NOT v_by_client THEN
      PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
      IF NEW.cancelled_by = 'client' THEN
        PERFORM public.send_booking_notice(NEW, 'business', 'booking_cancelled', v_key);
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client',
          CASE WHEN OLD.status = 'pending' THEN 'booking_declined' ELSE 'booking_cancelled' END, v_key);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;


-- Booking from the public page, signed in or not. Guests give name, email and phone.
-- Limits: two upcoming bookings per person per business (by account, email or phone), and five
-- upcoming guest bookings per email across LocAppoint, so nobody can fill a calendar with fake bookings.
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
  v_digits text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_id uuid;
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
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id) s
   WHERE s.slot_time = p_time
   LIMIT 1;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
  END IF;

  PERFORM set_config('locappoint.actor', 'client', true);
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
    PERFORM set_config('locappoint.actor', '', true);
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.actor', '', true);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid) TO anon, authenticated;


-- One booking, read through its manage link.
CREATE OR REPLACE FUNCTION public.booking_by_link(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.booking_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_by_link(text) TO anon, authenticated;


-- Cancel through the manage link: same cut-off as a signed-in client.
CREATE OR REPLACE FUNCTION public.cancel_by_link(p_token text)
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
  SELECT ap.* INTO a
    FROM public.booking_links l JOIN public.appointments ap ON ap.id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32
   FOR UPDATE OF ap;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'We could not find this booking' USING ERRCODE = 'P0002';
  END IF;
  IF a.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled' USING ERRCODE = '22023';
  END IF;
  SELECT b.timezone, b.cancel_cutoff_minutes INTO v_tz, v_cutoff FROM public.businesses b WHERE b.id = a.business_id;
  IF a.appointment_date + a.appointment_time - v_cutoff * interval '1 minute' <= now() AT TIME ZONE v_tz THEN
    RAISE EXCEPTION 'It is too late to cancel this booking online. Message the business.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('locappoint.actor', 'client', true);
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.appointments SET status = 'cancelled' WHERE id = a.id;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  PERFORM set_config('locappoint.actor', '', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_by_link(text) TO anon, authenticated;


-- Move through the manage link: same rules as a signed-in client moving their own booking.
CREATE OR REPLACE FUNCTION public.reschedule_by_link(p_token text, p_date date, p_time time)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_tz text;
  v_auto boolean;
  v_cutoff integer;
  v_staff uuid;
BEGIN
  SELECT ap.* INTO a
    FROM public.booking_links l JOIN public.appointments ap ON ap.id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32
   FOR UPDATE OF ap;
  IF NOT FOUND OR a.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'That booking cannot be moved' USING ERRCODE = 'P0002';
  END IF;
  IF a.appointment_date = p_date AND a.appointment_time = p_time THEN
    RAISE EXCEPTION 'That is already the time of this booking' USING ERRCODE = '22023';
  END IF;
  SELECT b.timezone, b.auto_confirm, b.cancel_cutoff_minutes INTO v_tz, v_auto, v_cutoff
    FROM public.businesses b WHERE b.id = a.business_id;
  IF a.appointment_date + a.appointment_time - v_cutoff * interval '1 minute' <= now() AT TIME ZONE v_tz THEN
    RAISE EXCEPTION 'It is too late to change this booking online. Message the business.' USING ERRCODE = '22023';
  END IF;
  IF a.service_id IS NULL THEN
    RAISE EXCEPTION 'This service is no longer offered. Message the business.' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.staff_id INTO v_staff
    FROM public.get_available_slots(a.business_id, a.service_id, p_date, a.staff_id, a.id) s
   WHERE s.slot_time = p_time LIMIT 1;
  IF v_staff IS NULL THEN
    SELECT s.staff_id INTO v_staff
      FROM public.get_available_slots(a.business_id, a.service_id, p_date, NULL, a.id) s
     WHERE s.slot_time = p_time LIMIT 1;
  END IF;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
  END IF;

  PERFORM set_config('locappoint.actor', 'client', true);
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  BEGIN
    UPDATE public.appointments
       SET appointment_date = p_date,
           appointment_time = p_time,
           staff_id = v_staff,
           status = CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END,
           rescheduled_from = a.appointment_date + a.appointment_time,
           rescheduled_at = now()
     WHERE id = a.id;
  EXCEPTION WHEN exclusion_violation THEN
    PERFORM set_config('locappoint.trusted_write', 'off', true);
    PERFORM set_config('locappoint.actor', '', true);
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  PERFORM set_config('locappoint.actor', '', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reschedule_by_link(text, date, time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_by_link(text, date, time) TO anon, authenticated;


-- Guest bookings join the account once its email is confirmed. Only confirmed emails, so nobody
-- can claim someone else's bookings by signing up with their address.
CREATE OR REPLACE FUNCTION public.claim_guest_bookings(p_user_id uuid, p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_email IS NULL OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id) THEN
    RETURN 0;
  END IF;
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.appointments a
     SET client_id = p_user_id
   WHERE a.client_id IS NULL
     AND a.source = 'web'
     AND lower(a.client_email) = lower(p_email);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_guest_bookings(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    BEGIN
      PERFORM public.claim_guest_bookings(NEW.id, NEW.email);
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_on_confirm() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS claim_on_confirm ON auth.users;
CREATE TRIGGER claim_on_confirm
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_on_confirm();

-- The profile row can arrive after the confirmation; claim then too.
CREATE OR REPLACE FUNCTION public.claim_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT au.email INTO v_email FROM auth.users au WHERE au.id = NEW.id AND au.email_confirmed_at IS NOT NULL;
  IF v_email IS NOT NULL THEN
    BEGIN
      PERFORM public.claim_guest_bookings(NEW.id, v_email);
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_on_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS claim_on_profile ON public.users;
CREATE TRIGGER claim_on_profile
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.claim_on_profile();

NOTIFY pgrst, 'reload schema';

COMMIT;
