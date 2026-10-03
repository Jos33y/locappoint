-- 1. Constraint and columns in place.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.appointments'::regclass AND conname IN ('appointments_no_overlap', 'appointments_duration_check');

-- 2. Busy slots for Femtos, next 14 days. Times only.
SELECT d::date AS day, s.*
FROM generate_series(current_date, current_date + 13, interval '1 day') d,
LATERAL public.get_busy_slots((SELECT id FROM public.businesses WHERE slug = 'femtos-hair-salon'), d::date) s;

-- 3. As anon: no appointment rows, no analytics sessions. Both must be 0.
BEGIN;
SET LOCAL ROLE anon;
SELECT (SELECT count(*) FROM public.appointments) AS appointments,
       (SELECT count(*) FROM public.analytics_sessions) AS sessions;
ROLLBACK;

-- 4. As anon, booking is refused. Must fail with "Sign in to book" or permission denied.
BEGIN;
SET LOCAL ROLE anon;
SELECT public.book_appointment(
  (SELECT id FROM public.businesses LIMIT 1), (SELECT id FROM public.services LIMIT 1),
  current_date + 7, '10:00', 'x', 'x@x.x', '00000');
ROLLBACK;
