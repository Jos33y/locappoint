-- Run after clients.sql. Every row should say ok.

SELECT 'client notes, closed to the app' AS check,
       CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.client_notes'::regclass)
             AND NOT has_table_privilege('authenticated', 'public.client_notes', 'SELECT')
            THEN 'ok' ELSE 'FIX' END AS result
UNION ALL
SELECT 'team reads clients and keeps notes',
       CASE WHEN has_function_privilege('authenticated', 'public.business_clients(uuid)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.client_history(uuid, text)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.save_client_note(uuid, text, text)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.business_clients(uuid)', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'raw visits closed to the app',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.client_visits(uuid)', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'one client however the phone is typed',
       CASE WHEN public.client_key('+351 912 345 678', NULL, NULL, 'Ana') = public.client_key('912345678', 'a@b.pt', NULL, 'Ana Silva')
             AND public.client_key('00351912345678', NULL, NULL, NULL) = 'p:912345678'
            THEN 'ok' ELSE 'FIX' END;
