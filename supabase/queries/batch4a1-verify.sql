-- 1. Every business has exactly one owner member. Expect one row per business, owners = 1.
SELECT b.slug, count(*) FILTER (WHERE m.role = 'owner') AS owners, count(m.id) AS members
FROM public.businesses b LEFT JOIN public.business_members m ON m.business_id = b.id
GROUP BY b.slug;

-- 2. Every appointment belongs to a staff member. Expect 0.
SELECT count(*) AS appointments_without_staff FROM public.appointments WHERE staff_id IS NULL;

-- 3. Femtos, next 7 days: free slots per day for its first service (alphabetical).
SELECT d::date AS day, count(s.*) AS free_slots, min(s.slot_time) AS first, max(s.slot_time) AS last
FROM generate_series(current_date, current_date + 6, interval '1 day') d
LEFT JOIN LATERAL public.get_available_slots(
  (SELECT id FROM public.businesses WHERE slug = 'femtos-hair-salon'),
  (SELECT id FROM public.services WHERE business_id = (SELECT id FROM public.businesses WHERE slug = 'femtos-hair-salon') AND is_active ORDER BY service_name LIMIT 1),
  d::date) s ON true
GROUP BY d ORDER BY d;

-- 4. Who can call what. anon must NOT appear for book_appointment, owner_book_appointment, reschedule_appointment.
SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public'
  AND routine_name IN ('book_appointment', 'owner_book_appointment', 'reschedule_appointment', 'get_available_slots', 'get_business_staff')
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY routine_name, grantee;

-- 5. As anon: no rows from the new tables. Expect 0 | 0 | 0 (or permission denied, also a pass).
BEGIN;
SET LOCAL ROLE anon;
SELECT (SELECT count(*) FROM public.business_members) AS members,
       (SELECT count(*) FROM public.time_blocks) AS blocks,
       (SELECT count(*) FROM public.appointments) AS appointments;
ROLLBACK;
