-- Run after reliability.sql. Every row should say true.
SELECT 'every business has a score row' AS check_name, NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.is_active AND b.is_demo IS NOT TRUE AND NOT EXISTS (SELECT 1 FROM public.business_reliability r WHERE r.business_id = b.id)) AS ok
UNION ALL
SELECT 'requests are timed from now on', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_timing')
UNION ALL
SELECT 'nobody reads scores directly', NOT has_table_privilege('anon', 'public.business_reliability', 'SELECT') AND NOT has_table_privilege('authenticated', 'public.business_reliability', 'SELECT')
UNION ALL
SELECT 'clients see the badge, never the score', has_function_privilege('anon', 'public.business_trust()', 'EXECUTE') AND NOT has_function_privilege('anon', 'public.my_reliability(uuid)', 'EXECUTE')
UNION ALL
SELECT 'only staff remove a badge or excuse', NOT has_function_privilege('anon', 'public.admin_badge(uuid, text, text)', 'EXECUTE') AND NOT has_function_privilege('authenticated', 'public.reliability_update(uuid, boolean)', 'EXECUTE')
UNION ALL
SELECT 'the engine ranks by the score', pg_get_functiondef('public.engine_match(text,text,text,date[],text,time without time zone,integer,double precision,double precision,text)'::regprocedure) LIKE '%business_reliability%'
UNION ALL
SELECT 'the score is worked out every night', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reliability-nightly');
