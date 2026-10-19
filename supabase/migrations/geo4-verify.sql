-- geo4 verify: run after geo4.sql. Every row should say true.
SELECT 'one wa_search, taking where in the country' AS check,
       (SELECT count(*) FROM pg_proc WHERE proname = 'wa_search') = 1
       AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'wa_search' AND 'p_place' = ANY (proargnames)) AS ok
UNION ALL
SELECT 'only our server calls it', has_function_privilege('service_role', 'public.wa_search(text,text,date[],text,time without time zone,integer,text,text)', 'execute')
       AND NOT has_function_privilege('anon', 'public.wa_search(text,text,date[],text,time without time zone,integer,text,text)', 'execute');
