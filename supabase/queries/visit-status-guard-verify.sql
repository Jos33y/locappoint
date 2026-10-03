-- Run after visit-status-guard.sql. Every row should say ok.

SELECT 'status guard on bookings' AS check,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_status_guard' AND tgrelid = 'public.appointments'::regclass) THEN 'ok' ELSE 'missing' END AS result
UNION ALL
SELECT 'guard closed to the app',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.appointments_status_guard()', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'reviews wait for the visit to end',
       CASE WHEN pg_get_functiondef('public.review_state(public.appointments)'::regprocedure) LIKE '%status IN (''completed'', ''confirmed'')%' THEN 'ok' ELSE 'old version' END;
