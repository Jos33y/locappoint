-- Run after agent-2.sql. Both rows should say true.
SELECT 'the agent sees the live businesses' AS check_name, jsonb_typeof(public.wa_directory()) = 'array' AS ok
UNION ALL
SELECT 'only the whatsapp function reads the list', NOT has_function_privilege('anon', 'public.wa_directory()', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_directory()', 'EXECUTE');
