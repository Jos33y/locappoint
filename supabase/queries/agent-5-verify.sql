-- Run after agent-5.sql. Both rows should say true.
SELECT 'groups show their real length' AS check_name, position('extra_person_minutes' IN pg_get_functiondef('public.wa_business(uuid)'::regprocedure)) > 0 AS ok
UNION ALL
SELECT 'only the whatsapp function reads a business', NOT has_function_privilege('anon', 'public.wa_business(uuid)', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_business(uuid)', 'EXECUTE');
