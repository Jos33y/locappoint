-- Run after time.sql. Every row should say ok.

SELECT 'buffer between bookings, 0 by default' AS check,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'buffer_minutes' AND column_default = '0')
             AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_buffer_minutes_check')
            THEN 'ok' ELSE 'FIX' END AS result
UNION ALL
SELECT 'free times keep the buffer clear',
       CASE WHEN pg_get_functiondef('public.get_available_slots(uuid, uuid, date, uuid, uuid)'::regprocedure) LIKE '%buffer_minutes%'
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'blocked time checked before it is saved',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'time_blocks_guard' AND tgrelid = 'public.time_blocks'::regclass)
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'free times still open to clients',
       CASE WHEN has_function_privilege('anon', 'public.get_available_slots(uuid, uuid, date, uuid, uuid)', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END;
