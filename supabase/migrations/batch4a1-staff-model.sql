BEGIN;

-- Members: everyone who takes bookings for a business. The owner is a member too.

CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('owner', 'staff')),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 80),
  invited_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'removed')),
  is_bookable boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS business_members_one_owner
  ON public.business_members (business_id) WHERE role = 'owner' AND status <> 'removed';
CREATE UNIQUE INDEX IF NOT EXISTS business_members_user_once
  ON public.business_members (business_id, user_id) WHERE user_id IS NOT NULL AND status <> 'removed';
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members (user_id);

DROP TRIGGER IF EXISTS update_business_members_updated_at ON public.business_members;
CREATE TRIGGER update_business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_members (business_id, user_id, role, display_name)
SELECT b.id, b.user_id, 'owner', COALESCE(NULLIF(trim(u.full_name), ''), b.business_name)
  FROM public.businesses b
  LEFT JOIN public.users u ON u.id = b.user_id
 WHERE NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.business_id = b.id AND m.role = 'owner');

CREATE OR REPLACE FUNCTION public.add_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.business_members (business_id, user_id, role, display_name)
  SELECT NEW.id, NEW.user_id, 'owner', COALESCE(NULLIF(trim(u.full_name), ''), NEW.business_name)
    FROM public.users u WHERE u.id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_add_owner_member ON public.businesses;
CREATE TRIGGER businesses_add_owner_member
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_member();


-- Which services each member does. A member with no rows here does every service.

CREATE TABLE IF NOT EXISTS public.staff_services (
  member_id uuid NOT NULL REFERENCES public.business_members(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, service_id)
);


-- Membership helpers for policies. SECURITY DEFINER so policies never recurse.

CREATE OR REPLACE FUNCTION public.my_member_id(p_business_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.id FROM public.business_members m
   WHERE m.business_id = p_business_id AND m.user_id = auth.uid() AND m.status = 'active'
   LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members m
     WHERE m.business_id = p_business_id AND m.user_id = auth.uid() AND m.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members m
     WHERE m.business_id = p_business_id AND m.user_id = auth.uid()
       AND m.status = 'active' AND m.role = 'owner'
  )
$$;


-- Hours: NULL staff_id means business hours; rows with a staff_id are that person's own hours.

ALTER TABLE public.availability
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.business_members(id) ON DELETE CASCADE;

ALTER TABLE public.availability
  DROP CONSTRAINT IF EXISTS availability_business_id_day_of_week_start_time_key;

CREATE UNIQUE INDEX IF NOT EXISTS availability_window_unique
  ON public.availability (business_id, COALESCE(staff_id, '00000000-0000-0000-0000-000000000000'::uuid), day_of_week, start_time);


-- Blocked time: breaks, holidays, "block 2 to 4". NULL staff_id closes the whole business.

CREATE TABLE IF NOT EXISTS public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.business_members(id) ON DELETE CASCADE,
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  reason text CHECK (reason IS NULL OR length(reason) <= 200),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_time_blocks_business ON public.time_blocks (business_id, starts_at);


-- Appointments: each belongs to a staff member, may come without email or phone (walk-ins),
-- records where it came from, and can be a no-show.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.business_members(id),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';

UPDATE public.appointments a
   SET staff_id = m.id
  FROM public.business_members m
 WHERE m.business_id = a.business_id AND m.role = 'owner' AND a.staff_id IS NULL;

ALTER TABLE public.appointments ALTER COLUMN staff_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN client_email DROP NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN client_phone DROP NOT NULL;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_source_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_source_check
  CHECK (source IN ('web', 'manual', 'assistant', 'whatsapp', 'ai_assistant', 'google'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(
      appointment_date + appointment_time,
      appointment_date + appointment_time + duration_minutes * interval '1 minute',
      '[)'
    ) WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));

CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON public.appointments (staff_id, appointment_date);


-- The client guard lets booking functions through; they do their own checks.

CREATE OR REPLACE FUNCTION public.appointments_client_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('locappoint.trusted_write', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL
     AND OLD.client_id = auth.uid()
     AND NOT public.is_business_member(OLD.business_id)
     AND (NEW.business_id, NEW.client_id, NEW.service_id, NEW.staff_id, NEW.appointment_date, NEW.appointment_time,
          NEW.duration_minutes, NEW.client_name, NEW.client_email, NEW.client_phone, NEW.notes, NEW.source)
         IS DISTINCT FROM
         (OLD.business_id, OLD.client_id, OLD.service_id, OLD.staff_id, OLD.appointment_date, OLD.appointment_time,
          OLD.duration_minutes, OLD.client_name, OLD.client_email, OLD.client_phone, OLD.notes, OLD.source)
  THEN
    RAISE EXCEPTION 'Clients can only cancel a booking' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;


-- Every free slot for a service on a day, per staff member. With no staff chosen,
-- one row per time with the first free person. Shared by web, Assistant, WhatsApp and MCP.

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_business_id uuid,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid DEFAULT NULL
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


CREATE OR REPLACE FUNCTION public.get_business_staff(p_business_id uuid)
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.id, m.display_name
    FROM public.business_members m
    JOIN public.businesses b ON b.id = m.business_id
   WHERE m.business_id = p_business_id
     AND m.status = 'active' AND m.is_bookable = true
     AND (b.is_active = true OR public.is_business_member(b.id))
   ORDER BY m.sort_order, m.created_at
$$;


-- Online booking by a signed-in client. Same checks as before, now per staff member.

DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time, text, text, text, text);

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

  SELECT b.timezone INTO v_tz FROM public.businesses b WHERE b.id = p_business_id AND b.is_active = true;
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
      v_duration, 'pending', 'web', v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000)
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;

  RETURN v_id;
END;
$$;


-- Bookings added by the business: phone calls and walk-ins. Name is enough.
-- Opening hours and blocks are not enforced (the owner decides); overlaps still are.

CREATE OR REPLACE FUNCTION public.owner_book_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_date date,
  p_time time,
  p_client_name text,
  p_client_phone text DEFAULT NULL,
  p_client_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_my_member uuid := public.my_member_id(p_business_id);
  v_is_owner boolean := public.is_business_owner(p_business_id);
  v_duration integer;
  v_name text := trim(p_client_name);
  v_email text := NULLIF(lower(trim(p_client_email)), '');
  v_phone text := NULLIF(trim(p_client_phone), '');
  v_id uuid;
BEGIN
  IF v_my_member IS NULL THEN
    RAISE EXCEPTION 'Only this business can add bookings here' USING ERRCODE = '42501';
  END IF;
  IF NOT v_is_owner AND p_staff_id <> v_my_member THEN
    RAISE EXCEPTION 'Staff can only add bookings to their own calendar' USING ERRCODE = '42501';
  END IF;
  IF p_source NOT IN ('manual', 'assistant') THEN
    RAISE EXCEPTION 'Invalid source' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.business_members m
                  WHERE m.id = p_staff_id AND m.business_id = p_business_id AND m.status = 'active') THEN
    RAISE EXCEPTION 'That team member is not available' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.duration_minutes INTO v_duration FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That service does not belong to this business' USING ERRCODE = 'P0002';
  END IF;

  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter the client''s name' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
    RAISE EXCEPTION 'That email does not look right' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NOT NULL AND length(v_phone) NOT BETWEEN 5 AND 40 THEN
    RAISE EXCEPTION 'That phone number does not look right' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.appointments (
      business_id, staff_id, client_id, service_id, appointment_date, appointment_time,
      duration_minutes, status, source, client_name, client_email, client_phone, notes
    ) VALUES (
      p_business_id, p_staff_id, NULL, p_service_id, p_date, p_time,
      v_duration, 'confirmed', p_source, v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000)
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'That time overlaps another booking' USING ERRCODE = '23P01';
  END;

  RETURN v_id;
END;
$$;


-- Move a booking. The business can move any of its bookings (overlaps checked);
-- a client can move their own to a genuinely free slot.

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
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id;
  IF NOT FOUND OR a.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'That booking cannot be moved' USING ERRCODE = 'P0002';
  END IF;

  v_my_member := public.my_member_id(a.business_id);
  v_is_owner := public.is_business_owner(a.business_id);

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
    SELECT s.staff_id INTO v_staff
      FROM public.get_available_slots(a.business_id, a.service_id, p_date, COALESCE(p_staff_id, a.staff_id)) s
     WHERE s.slot_time = p_time
     LIMIT 1;
    IF v_staff IS NULL THEN
      RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
    END IF;
  ELSE
    RAISE EXCEPTION 'You cannot move this booking' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('locappoint.trusted_write', 'on', true);
  BEGIN
    UPDATE public.appointments
       SET appointment_date = p_date, appointment_time = p_time, staff_id = v_staff
     WHERE id = p_appointment_id;
  EXCEPTION WHEN exclusion_violation THEN
    PERFORM set_config('locappoint.trusted_write', 'off', true);
    RAISE EXCEPTION 'That time overlaps another booking' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
END;
$$;


-- Busy times stay available for the current booking modal until it moves to get_available_slots.

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
  UNION ALL
  SELECT greatest(tb.starts_at, p_date::timestamp)::time,
         least(tb.ends_at, p_date + time '23:59:59')::time
    FROM public.time_blocks tb
    JOIN public.businesses b ON b.id = tb.business_id
   WHERE tb.business_id = p_business_id
     AND tb.staff_id IS NULL
     AND tb.starts_at < p_date + interval '1 day'
     AND tb.ends_at > p_date::timestamp
     AND b.is_active = true
$$;


-- Policies. Owners see and manage everything in their business; staff see their own calendar.

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_read ON public.business_members;
CREATE POLICY members_read ON public.business_members
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS members_owner_write ON public.business_members;
CREATE POLICY members_owner_write ON public.business_members
  FOR ALL TO authenticated
  USING (public.is_business_owner(business_id))
  WITH CHECK (public.is_business_owner(business_id));

DROP POLICY IF EXISTS staff_services_read ON public.staff_services;
CREATE POLICY staff_services_read ON public.staff_services
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = member_id AND public.is_business_member(m.business_id)));

DROP POLICY IF EXISTS staff_services_owner_write ON public.staff_services;
CREATE POLICY staff_services_owner_write ON public.staff_services
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = member_id AND public.is_business_owner(m.business_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = member_id AND public.is_business_owner(m.business_id)));

DROP POLICY IF EXISTS time_blocks_read ON public.time_blocks;
CREATE POLICY time_blocks_read ON public.time_blocks
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS time_blocks_write ON public.time_blocks;
CREATE POLICY time_blocks_write ON public.time_blocks
  FOR ALL TO authenticated
  USING (public.is_business_owner(business_id) OR (staff_id IS NOT NULL AND staff_id = public.my_member_id(business_id)))
  WITH CHECK (public.is_business_owner(business_id) OR (staff_id IS NOT NULL AND staff_id = public.my_member_id(business_id)));

DROP POLICY IF EXISTS "Business owners can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS appointments_owner_update ON public.appointments;

CREATE POLICY appointments_member_read ON public.appointments
  FOR SELECT TO authenticated
  USING (public.is_business_owner(business_id) OR staff_id = public.my_member_id(business_id));

CREATE POLICY appointments_member_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (public.is_business_owner(business_id) OR staff_id = public.my_member_id(business_id))
  WITH CHECK (public.is_business_owner(business_id) OR staff_id = public.my_member_id(business_id));

DROP POLICY IF EXISTS businesses_member_read ON public.businesses;
CREATE POLICY businesses_member_read ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_business_member(id));

DROP POLICY IF EXISTS services_member_read ON public.services;
CREATE POLICY services_member_read ON public.services
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS availability_member_read ON public.availability;
CREATE POLICY availability_member_read ON public.availability
  FOR SELECT TO authenticated
  USING (public.is_business_member(business_id));


-- Grants. Supabase gives anon execute on every new function; take it back where it does not belong.

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_book_appointment(uuid, uuid, uuid, date, time, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reschedule_appointment(uuid, date, time, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_owner_member() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_book_appointment(uuid, uuid, uuid, date, time, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_appointment(uuid, date, time, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_staff(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
