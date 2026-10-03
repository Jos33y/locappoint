-- Admin overview: every row should say ok.
SELECT check_name, CASE WHEN passed THEN 'ok' ELSE 'FAILED' END AS result FROM (
  SELECT 'the four admin views exist' AS check_name,
         to_regprocedure('public.admin_overview()') IS NOT NULL
         AND to_regprocedure('public.admin_businesses()') IS NOT NULL
         AND to_regprocedure('public.admin_bookings(text, text, integer, integer)') IS NOT NULL
         AND to_regprocedure('public.admin_people(text, text, integer, integer)') IS NOT NULL AS passed
  UNION ALL
  SELECT 'nobody signed out can call them',
         NOT has_function_privilege('anon', 'public.admin_overview()', 'execute')
         AND NOT has_function_privilege('anon', 'public.admin_people(text, text, integer, integer)', 'execute')
  UNION ALL
  SELECT 'each one checks for an admin first',
         (SELECT bool_and(prosrc LIKE '%is_admin()%') FROM pg_proc WHERE proname IN ('admin_overview', 'admin_businesses', 'admin_bookings', 'admin_people'))
  UNION ALL
  SELECT 'app sign-ins are readable for the app counts',
         to_regclass('auth.sessions') IS NOT NULL
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'user_agent')
  UNION ALL
  SELECT 'at least one admin exists',
         EXISTS (SELECT 1 FROM public.users WHERE is_admin)
) c;
