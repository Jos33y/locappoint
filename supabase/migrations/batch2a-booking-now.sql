BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;


-- Businesses keep their own clock, so "past" and "today" are judged in the business's city.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Lisbon';


-- Each booking remembers its length, so later service edits never move existing bookings.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

UPDATE public.appointments a
   SET duration_minutes = s.duration_minutes
  FROM public.services s
 WHERE s.id = a.service_id;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_duration_check CHECK (duration_minutes BETWEEN 5 AND 720);


-- Overlaps are refused by the database. Cancelled and completed bookings do not hold the slot.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_business_id_appointment_date_appointment_time_key;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    business_id WITH =,
    tsrange(
      appointment_date + appointment_time,
      appointment_date + appointment_time + duration_minutes * interval '1 minute',
      '[)'
    ) WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));


-- Busy times for one business and day. Times only, never who booked.

CREATE OR REPLACE FUNCTION public.get_busy_slots(p_business_id uuid, p_date date)
RETURNS TABLE (start_time time, end_time time)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.appointment_time,
         (a.appointment_time + a.duration_minutes * interval '1 minute')::time
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
   WHERE a.business_id = p_business_id
     AND a.appointment_date = p_date
     AND a.status IN ('pending', 'confirmed')
     AND b.is_active = true
   ORDER BY a.appointment_time
$$;


CREATE OR REPLACE FUNCTION public.book_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_time time,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_duration integer;
  v_start timestamp;
  v_end_time time;
  v_local_now timestamp;
  v_name text := trim(p_client_name);
  v_email text := lower(trim(p_client_email));
  v_phone text := trim(p_client_phone);
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to book' USING ERRCODE = '28000';
  END IF;

  SELECT b.timezone INTO v_tz
    FROM public.businesses b
   WHERE b.id = p_business_id AND b.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This business is not taking bookings' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.duration_minutes INTO v_duration
    FROM public.services s
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

  v_start := p_date + p_time;
  v_end_time := p_time + v_duration * interval '1 minute';
  v_local_now := now() AT TIME ZONE v_tz;

  IF v_start <= v_local_now THEN
    RAISE EXCEPTION 'That time has already passed' USING ERRCODE = '22023';
  END IF;
  IF v_start > v_local_now + interval '90 days' THEN
    RAISE EXCEPTION 'Bookings open up to 90 days ahead' USING ERRCODE = '22023';
  END IF;

  IF v_end_time <= p_time OR NOT EXISTS (
    SELECT 1 FROM public.availability av
     WHERE av.business_id = p_business_id
       AND av.is_active = true
       AND av.day_of_week = extract(dow FROM p_date)::int
       AND av.start_time <= p_time
       AND v_end_time <= av.end_time
  ) THEN
    RAISE EXCEPTION 'That time is outside opening hours' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.appointments (
      business_id, client_id, service_id, appointment_date, appointment_time,
      duration_minutes, status, client_name, client_email, client_phone, notes
    ) VALUES (
      p_business_id, v_uid, p_service_id, p_date, p_time,
      v_duration, 'pending', v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000)
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;

  RETURN v_id;
END;
$$;


-- Analytics sessions: writes go through two functions, so the table can close to the public.

CREATE OR REPLACE FUNCTION public.analytics_session_start(p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.analytics_sessions;
BEGIN
  r := jsonb_populate_record(NULL::public.analytics_sessions, p_data);
  IF r.session_id IS NULL OR length(r.session_id) > 64 THEN
    RETURN;
  END IF;

  INSERT INTO public.analytics_sessions (
    session_id, country, country_name, region, city, timezone,
    device_type, browser, browser_version, os, os_version,
    screen_width, screen_height, referrer, referrer_domain,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, language
  ) VALUES (
    r.session_id, left(r.country, 8), left(r.country_name, 80), left(r.region, 80), left(r.city, 80), left(r.timezone, 64),
    left(r.device_type, 16), left(r.browser, 32), left(r.browser_version, 16), left(r.os, 32), left(r.os_version, 16),
    r.screen_width, r.screen_height, left(r.referrer, 500), left(r.referrer_domain, 200),
    left(r.utm_source, 100), left(r.utm_medium, 100), left(r.utm_campaign, 100), left(r.utm_term, 100), left(r.utm_content, 100),
    left(r.language, 8)
  )
  ON CONFLICT (session_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_session_update(p_session_id text, p_updates jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.analytics_sessions
     SET total_time_seconds = COALESCE(LEAST((p_updates->>'total_time_seconds')::int, 86400), total_time_seconds),
         is_bounce = is_bounce AND COALESCE((p_updates->>'is_bounce')::boolean, true),
         waitlist_opened = waitlist_opened OR COALESCE((p_updates->>'waitlist_opened')::boolean, false),
         waitlist_submitted = waitlist_submitted OR COALESCE((p_updates->>'waitlist_submitted')::boolean, false),
         partnership_opened = partnership_opened OR COALESCE((p_updates->>'partnership_opened')::boolean, false),
         partnership_submitted = partnership_submitted OR COALESCE((p_updates->>'partnership_submitted')::boolean, false),
         whatsapp_clicked = whatsapp_clicked OR COALESCE((p_updates->>'whatsapp_clicked')::boolean, false),
         last_seen_at = now()
   WHERE session_id = p_session_id
$$;


REVOKE ALL ON FUNCTION public.get_busy_slots(uuid, date) FROM public;
REVOKE ALL ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.analytics_session_start(jsonb) FROM public;
REVOKE ALL ON FUNCTION public.analytics_session_update(text, jsonb) FROM public;

GRANT EXECUTE ON FUNCTION public.get_busy_slots(uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_session_start(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_session_update(text, jsonb) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
