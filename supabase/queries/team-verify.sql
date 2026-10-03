-- Run after team.sql. Every row should say ok.

SELECT 'team changes only through the owner functions' AS check,
       CASE WHEN NOT has_table_privilege('authenticated', 'public.business_members', 'INSERT')
             AND NOT has_table_privilege('authenticated', 'public.business_members', 'UPDATE')
             AND NOT has_table_privilege('authenticated', 'public.staff_services', 'INSERT')
             AND has_table_privilege('authenticated', 'public.business_members', 'SELECT')
            THEN 'ok' ELSE 'FIX' END AS result
UNION ALL
SELECT 'owner functions open to signed-in users only',
       CASE WHEN has_function_privilege('authenticated', 'public.team_members(uuid)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.add_team_member(uuid, text)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.remove_team_member(uuid)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.add_team_member(uuid, text)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.accept_team_invite(text)', 'EXECUTE')
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'invite page readable before sign-in',
       CASE WHEN has_function_privilege('anon', 'public.team_invite_info(text)', 'EXECUTE')
             AND public.team_invite_info('not-a-token') IS NULL
            THEN 'ok' ELSE 'FIX' END
UNION ALL
SELECT 'own hours stay inside the business',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'availability_staff_guard' AND tgrelid = 'public.availability'::regclass)
            THEN 'ok' ELSE 'FIX' END;
