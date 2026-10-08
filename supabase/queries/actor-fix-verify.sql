-- Run after actor-fix.sql. Every row should say true.
SELECT 'a guest booking is never "unknown"' AS check_name,
       public.acting_as_client((SELECT id FROM public.businesses LIMIT 1), NULL) IS NOT NULL AS ok
UNION ALL
SELECT 'nobody outside the database can call it', NOT has_function_privilege('authenticated', 'public.acting_as_client(uuid, uuid)', 'EXECUTE');
