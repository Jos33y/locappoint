-- Run after addons.sql. Every row should say ok.

SELECT 'services can be offered as extras' AS check,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'is_addon')
             AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'addons')
            THEN 'ok' ELSE 'FIX' END AS result
UNION ALL
SELECT 'one version of each booking function, open to clients',
       CASE WHEN (SELECT count(*) FROM pg_proc WHERE proname = 'book_appointment' AND pronamespace = 'public'::regnamespace) = 1
             AND (SELECT count(*) FROM pg_proc WHERE proname = 'get_available_slots' AND pronamespace = 'public'::regnamespace) = 1
             AND has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid, uuid[])', 'EXECUTE')
             AND has_function_privilege('anon', 'public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[])', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'free times still keep the buffer and the extras',
       CASE WHEN pg_get_functiondef('public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[])'::regprocedure) LIKE '%buffer_minutes%'
             AND pg_get_functiondef('public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[])'::regprocedure) LIKE '%is_addon%'
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'reminder two hours before',
       CASE WHEN pg_get_functiondef('public.queue_booking_reminders()'::regprocedure) LIKE '%:soon:%'
             AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'booking-reminders')
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'booking functions not callable by clients directly',
       CASE WHEN NOT has_function_privilege('anon', 'public.send_booking_notice(public.appointments, text, text, text)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.queue_booking_reminders()', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END;
