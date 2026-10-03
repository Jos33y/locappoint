-- Run after booking-lifecycle.sql. Every row should say ok.

SELECT 'business settings' AS check,
       CASE WHEN count(*) = 2 THEN 'ok' ELSE 'missing' END AS result
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'businesses'
   AND column_name IN ('auto_confirm', 'cancel_cutoff_minutes')
UNION ALL
SELECT 'appointment columns',
       CASE WHEN count(*) = 5 THEN 'ok' ELSE 'missing' END
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'appointments'
   AND column_name IN ('price', 'cancelled_by', 'cancelled_at', 'rescheduled_from', 'rescheduled_at')
UNION ALL
SELECT 'lifecycle trigger',
       CASE WHEN count(*) = 1 THEN 'ok' ELSE 'missing' END
  FROM pg_trigger
 WHERE tgrelid = 'public.appointments'::regclass AND tgname = 'appointments_lifecycle'
UNION ALL
SELECT 'one get_available_slots with p_ignore_appointment',
       CASE WHEN count(*) = 1 AND bool_and(pg_get_function_arguments(p.oid) LIKE '%p_ignore_appointment%') THEN 'ok' ELSE 'wrong' END
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'get_available_slots'
UNION ALL
SELECT 'cancel_my_booking for signed-in users only',
       CASE WHEN has_function_privilege('authenticated', 'public.cancel_my_booking(uuid)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.cancel_my_booking(uuid)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'free slots still public',
       CASE WHEN has_function_privilege('anon', 'public.get_available_slots(uuid, uuid, date, uuid, uuid)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'book_appointment reads auto_confirm',
       CASE WHEN pg_get_functiondef('public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid)'::regprocedure) LIKE '%auto_confirm%' THEN 'ok' ELSE 'old version' END
UNION ALL
SELECT 'reschedule records the old time',
       CASE WHEN pg_get_functiondef('public.reschedule_appointment(uuid, date, time, uuid)'::regprocedure) LIKE '%rescheduled_from%' THEN 'ok' ELSE 'old version' END
UNION ALL
SELECT 'existing bookings have a price',
       CASE WHEN count(*) FILTER (WHERE a.price IS NULL AND s.price IS NOT NULL) = 0 THEN 'ok' ELSE count(*) FILTER (WHERE a.price IS NULL AND s.price IS NOT NULL) || ' missing' END
  FROM public.appointments a LEFT JOIN public.services s ON s.id = a.service_id
UNION ALL
SELECT 'businesses confirming automatically',
       count(*) FILTER (WHERE auto_confirm) || ' of ' || count(*)
  FROM public.businesses;
