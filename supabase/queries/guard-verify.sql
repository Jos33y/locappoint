-- Guard: every row should say ok.
SELECT check_name, CASE WHEN passed THEN 'ok' ELSE 'FAILED' END AS result FROM (
  SELECT 'guest bookings are limited' AS check_name,
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_guest_guard' AND tgrelid = 'public.appointments'::regclass) AS passed
  UNION ALL
  SELECT 'forms are limited',
         (SELECT count(*) FROM pg_trigger WHERE tgname IN ('waitlist_form_guard', 'contact_form_guard', 'partnership_form_guard')) = 3
  UNION ALL
  SELECT 'visitor counts are limited',
         (SELECT count(*) FROM pg_trigger WHERE tgname IN ('page_stats_guard', 'analytics_sessions_guard', 'analytics_events_guard')) = 3
  UNION ALL
  SELECT 'form sizes are capped',
         (SELECT count(*) FROM pg_constraint WHERE conname IN ('contact_messages_sizes', 'partnership_requests_sizes')) = 2
  UNION ALL
  SELECT 'the counter is private',
         NOT has_function_privilege('anon', 'public.rate_ok(text, integer, integer)', 'execute')
         AND NOT has_table_privilege('anon', 'public.rate_hits', 'select')
  UNION ALL
  SELECT 'the app can report crashes, only admins read them',
         has_function_privilege('anon', 'public.report_client_error(text, text, text, text, text, text)', 'execute')
         AND NOT has_table_privilege('anon', 'public.client_errors', 'select')
  UNION ALL
  SELECT 'trigger functions are closed to the API',
         NOT EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
              AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
              AND (has_function_privilege('anon', p.oid, 'execute') OR has_function_privilege('authenticated', p.oid, 'execute'))
         )
  UNION ALL
  SELECT 'old data is trimmed nightly',
         EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trim-old-data')
  UNION ALL
  SELECT 'the demo business is marked',
         EXISTS (SELECT 1 FROM public.businesses WHERE slug = 'femtos-barbearia' AND is_demo)
  UNION ALL
  SELECT 'bookings still work: the booking function is intact',
         has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time, text, text, text, text, uuid, uuid[])', 'execute')
) c;
