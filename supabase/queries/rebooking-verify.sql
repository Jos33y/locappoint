-- Run after rebooking.sql. Every row should say ok.

SELECT 'email opt-out list, closed to the app' AS check,
       CASE WHEN to_regclass('public.email_optouts') IS NOT NULL
             AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.email_optouts'::regclass)
             AND NOT has_table_privilege('anon', 'public.email_optouts', 'SELECT')
             AND NOT has_table_privilege('authenticated', 'public.email_optouts', 'SELECT') THEN 'ok' ELSE 'wrong' END AS result
UNION ALL
SELECT 'signed-in clients read their places',
       CASE WHEN has_function_privilege('authenticated', 'public.my_rebook()', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.my_rebook()', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'manage link: book again and stop emails',
       CASE WHEN has_function_privilege('anon', 'public.rebook_by_link(text)', 'EXECUTE')
             AND has_function_privilege('anon', 'public.stop_emails_by_link(text)', 'EXECUTE') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'helpers closed to the app',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.rebook_rhythm(uuid, uuid, text)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.rebook_rhythm(uuid, uuid, text)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.rebook_target(public.appointments)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.queue_visit_followups()', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'client direct-cancel policy removed',
       CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'appointments' AND policyname = 'appointments_client_cancel') THEN 'ok' ELSE 'still there' END
UNION ALL
SELECT 'follow-up job every 15 minutes',
       CASE WHEN (SELECT count(*) FROM cron.job WHERE jobname = 'visit-followups' AND schedule = '*/15 * * * *') = 1 THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'rhythm runs',
       CASE WHEN public.rebook_rhythm(NULL, NULL, NULL) IS NULL THEN 'ok' ELSE 'wrong' END;

-- What went out, after the first morning:
-- SELECT created_at, recipient_email, payload->>'business_name' AS business, payload->>'suggested_date' AS suggested, status, last_error FROM public.notification_queue WHERE kind = 'visit_followup' ORDER BY created_at DESC LIMIT 10;
