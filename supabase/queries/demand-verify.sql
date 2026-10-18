-- geo0: run after demand.sql. Every row should say true.
SELECT 'search_log table' AS what, to_regclass('public.search_log') IS NOT NULL AS ok
UNION ALL SELECT 'search_wish table', to_regclass('public.search_wish') IS NOT NULL
UNION ALL SELECT 'row security on both', (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.search_log'::regclass, 'public.search_wish'::regclass))
UNION ALL SELECT 'search_note callable by visitors', has_function_privilege('anon', 'public.search_note(text, text, text, text, double precision, double precision, text, integer, text, text, integer, integer, integer)', 'EXECUTE')
UNION ALL SELECT 'search_wish_add callable by visitors', has_function_privilege('anon', 'public.search_wish_add(text, text, text, text, text, text, text)', 'EXECUTE')
UNION ALL SELECT 'admin_demand closed to visitors', NOT has_function_privilege('anon', 'public.admin_demand(integer)', 'EXECUTE')
UNION ALL SELECT 'visitors cannot read searches', NOT has_table_privilege('anon', 'public.search_log', 'SELECT') OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'search_log');
