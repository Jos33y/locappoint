-- Run after money.sql. Every row should say ok.

SELECT 'Book again knows last visit''s extras' AS check,
       CASE WHEN position('addon_ids' IN (SELECT prosrc FROM pg_proc WHERE oid = 'public.rebook_target(public.appointments)'::regprocedure)) > 0
            THEN 'ok' ELSE 'FIX' END AS result
UNION ALL
SELECT 'reminder figures for the owner only',
       CASE WHEN has_function_privilege('authenticated', 'public.reminder_effect(uuid, integer)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.reminder_effect(uuid, integer)', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'rebook helper still private',
       CASE WHEN NOT has_function_privilege('anon', 'public.rebook_target(public.appointments)', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END;
