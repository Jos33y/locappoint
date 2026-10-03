-- Run after name-sync.sql. The first row should say ok.

SELECT 'name follows the person' AS check,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_person_name' AND tgrelid = 'public.users'::regclass) THEN 'ok' ELSE 'missing' END AS result;

-- Names that are out of step right now: upcoming bookings by a signed-up client, and team members,
-- whose name differs from the person's current name. A booking made for someone else also shows here; that is fine.
SELECT 'booking' AS what, a.id, a.client_name AS shown, u.full_name AS current_name, a.appointment_date
  FROM public.appointments a
  JOIN public.users u ON u.id = a.client_id
 WHERE a.status IN ('pending', 'confirmed') AND a.appointment_date >= current_date
   AND lower(trim(a.client_name)) IS DISTINCT FROM lower(trim(u.full_name))
UNION ALL
SELECT 'team member', m.id, m.display_name, u.full_name, NULL
  FROM public.business_members m
  JOIN public.users u ON u.id = m.user_id
 WHERE lower(trim(m.display_name)) IS DISTINCT FROM lower(trim(u.full_name));
