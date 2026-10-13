-- Run after agent-6.sql. Both rows should say true.
SELECT 'booking news reaches the agent''s conversation' AS check_name, to_regprocedure('public.wa_thread_note(text, text)') IS NOT NULL AS ok
UNION ALL
SELECT 'only the server can write it', NOT has_function_privilege('anon', 'public.wa_thread_note(text, text)', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_thread_note(text, text)', 'EXECUTE');
