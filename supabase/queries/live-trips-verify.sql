-- Run after live-trips.sql. Every row should say true.
SELECT 'trips are stored without a position' AS check_name,
       to_regclass('public.visit_trips') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'visit_trips' AND column_name IN ('lat', 'lng')) AS ok
UNION ALL
SELECT 'nobody reads trips directly',
       NOT has_table_privilege('anon', 'public.visit_trips', 'SELECT') AND NOT has_table_privilege('authenticated', 'public.visit_trips', 'SELECT')
UNION ALL
SELECT 'only the trip function starts and ends trips',
       NOT has_function_privilege('authenticated', 'public.trip_start(uuid, uuid, integer, text)', 'EXECUTE')
       AND NOT has_function_privilege('authenticated', 'public.trip_end(uuid, boolean)', 'EXECUTE')
UNION ALL
SELECT 'the client follows by link or signed in',
       has_function_privilege('anon', 'public.trip_by_link(text)', 'EXECUTE') AND has_function_privilege('authenticated', 'public.my_trips(uuid[])', 'EXECUTE')
UNION ALL
SELECT '10 and 3 minute steps run every minute', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trips-every-minute')
UNION ALL
SELECT 'steps tell the client', pg_get_functiondef('public.trip_notice(uuid, text)'::regprocedure) LIKE '%trip_on_way%';
