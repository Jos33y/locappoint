-- demand2 verify: run after demand2.sql. These read the definitions only. Every row should say true.
SELECT 'admin_demand has the new keys' AS check,
       pg_get_functiondef('public.admin_demand(integer)'::regprocedure) LIKE '%''places''%'
   AND pg_get_functiondef('public.admin_demand(integer)'::regprocedure) LIKE '%''not_then''%'
   AND pg_get_functiondef('public.admin_demand(integer)'::regprocedure) LIKE '%''abroad''%' AS ok
UNION ALL
SELECT 'admin_demand_place exists, security definer',
       (SELECT bool_and(p.prosecdef) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'admin_demand_place')
UNION ALL
SELECT 'anon cannot read demand', NOT has_function_privilege('anon', 'public.admin_demand(integer)', 'execute')
   AND NOT has_function_privilege('anon', 'public.admin_demand_place(text,text,integer)', 'execute')
UNION ALL
SELECT 'markets has a time zone column', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'markets' AND column_name = 'timezone');
