-- 1. Policies left per table. Waitlist should show only the two admin policies.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 2. As anon: every count must be 0.
BEGIN;
SET LOCAL ROLE anon;
SELECT
  (SELECT count(*) FROM public.waitlist) AS waitlist,
  (SELECT count(*) FROM public.partnership_requests) AS partnerships,
  (SELECT count(*) FROM public.contact_messages) AS contact,
  (SELECT count(*) FROM public.appointments) AS appointments;
ROLLBACK;

-- 3. Waitlist functions work for anon. Returns one row with id and edit_token, then cleans up.
BEGIN;
SET LOCAL ROLE anon;
SELECT * FROM public.waitlist_join('rls-test@locappoint.com', 'PT');
ROLLBACK;

-- 4. Anon cannot insert an appointment. Must fail with a row-level security error.
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.appointments (business_id, appointment_date, appointment_time, client_name, client_email, client_phone, status)
SELECT id, current_date + 30, '09:00', 'x', 'x@x.x', '0', 'confirmed' FROM public.businesses LIMIT 1;
ROLLBACK;
