-- Run after agent-3.sql. Both rows should say true.
SELECT 'the agent can ask for the next free days' AS check_name, jsonb_typeof(public.wa_free_days(gen_random_uuid(), gen_random_uuid())) = 'array' AS ok
UNION ALL
SELECT 'only the whatsapp function can ask', NOT has_function_privilege('anon', 'public.wa_free_days(uuid, uuid, date, integer)', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_free_days(uuid, uuid, date, integer)', 'EXECUTE');
