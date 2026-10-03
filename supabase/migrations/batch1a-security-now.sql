BEGIN;

DROP VIEW IF EXISTS public.appointments_detailed;
DROP VIEW IF EXISTS public.businesses_with_owner;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT u.is_admin FROM public.users u WHERE u.id = auth.uid()), false)
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;


-- Waitlist: writes move to two functions; the table itself stays admin-only (policies dropped in part B).

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS edit_token uuid;

CREATE OR REPLACE FUNCTION public.waitlist_join(p_email text, p_country text DEFAULT NULL)
RETURNS TABLE (id uuid, edit_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  INSERT INTO public.waitlist AS w (email, country, edit_token)
  VALUES (v_email, left(NULLIF(trim(p_country), ''), 64), gen_random_uuid())
  ON CONFLICT (email) DO UPDATE
    SET country = COALESCE(EXCLUDED.country, w.country),
        edit_token = EXCLUDED.edit_token
  RETURNING w.id, w.edit_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.waitlist_complete(
  p_id uuid,
  p_token uuid,
  p_country text,
  p_full_name text,
  p_phone text,
  p_user_type text,
  p_business_type text,
  p_comments text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.waitlist
     SET country = COALESCE(left(NULLIF(trim(p_country), ''), 64), country),
         full_name = left(NULLIF(trim(p_full_name), ''), 200),
         phone = left(NULLIF(trim(p_phone), ''), 40),
         user_type = p_user_type,
         business_type = CASE WHEN p_user_type = 'business' THEN p_business_type END,
         comments = left(NULLIF(trim(p_comments), ''), 2000)
   WHERE id = p_id
     AND edit_token IS NOT NULL
     AND edit_token = p_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.waitlist_join(text, text) FROM public;
REVOKE ALL ON FUNCTION public.waitlist_complete(uuid, uuid, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.waitlist_join(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.waitlist_complete(uuid, uuid, text, text, text, text, text, text) TO anon, authenticated;


-- Partnership requests: public can submit, only admins read or change.

DROP POLICY IF EXISTS "Allow anon read for admin" ON public.partnership_requests;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.partnership_requests;
DROP POLICY IF EXISTS "Service role can view partnership requests" ON public.partnership_requests;
DROP POLICY IF EXISTS "Anyone can submit partnership requests" ON public.partnership_requests;

CREATE POLICY partnership_public_insert ON public.partnership_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY partnership_admin_update ON public.partnership_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- Contact messages: public can submit, only admins read or change.

DROP POLICY IF EXISTS "Service role can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

CREATE POLICY contact_public_insert ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'unread');

CREATE POLICY contact_admin_select ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY contact_admin_update ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- Appointments: signed-in clients book for themselves only, as pending; clients may only cancel.

DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clients can cancel their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Business owners can update their appointments" ON public.appointments;

CREATE POLICY appointments_client_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_active = true)
  );

CREATE POLICY appointments_client_cancel ON public.appointments
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid() AND status = 'pending')
  WITH CHECK (client_id = auth.uid() AND status = 'cancelled');

CREATE POLICY appointments_owner_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.appointments_client_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND OLD.client_id = auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = OLD.business_id AND b.user_id = auth.uid())
     AND (NEW.business_id, NEW.client_id, NEW.service_id, NEW.appointment_date, NEW.appointment_time,
          NEW.client_name, NEW.client_email, NEW.client_phone, NEW.notes)
         IS DISTINCT FROM
         (OLD.business_id, OLD.client_id, OLD.service_id, OLD.appointment_date, OLD.appointment_time,
          OLD.client_name, OLD.client_email, OLD.client_phone, OLD.notes)
  THEN
    RAISE EXCEPTION 'Clients can only cancel a booking' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_client_update_guard ON public.appointments;
CREATE TRIGGER appointments_client_update_guard
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_client_update_guard();


-- Analytics: remove duplicate and over-broad policies. Anon read and update stay until batch 2 (analytics.js needs them).

DROP POLICY IF EXISTS "anon insert" ON public.analytics_events;
DROP POLICY IF EXISTS "anon insert" ON public.analytics_sessions;
DROP POLICY IF EXISTS "anon update sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "analytics_events_authenticated_insert" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_sessions_authenticated_insert" ON public.analytics_sessions;
DROP POLICY IF EXISTS "analytics_sessions_authenticated_update" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow authenticated read events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow anon read events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow authenticated read sessions" ON public.analytics_sessions;

CREATE POLICY analytics_events_admin_select ON public.analytics_events
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY analytics_sessions_admin_select ON public.analytics_sessions
  FOR SELECT TO authenticated USING (public.is_admin());


DROP FUNCTION IF EXISTS public.is_timeslot_available(uuid, date, time without time zone, integer);
DROP FUNCTION IF EXISTS public.generate_slug(text);

NOTIFY pgrst, 'reload schema';

COMMIT;
