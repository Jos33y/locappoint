-- Run after booking-notifications.sql. Every row should say ok.

SELECT 'inbox table' AS check,
       CASE WHEN to_regclass('public.inbox') IS NOT NULL THEN 'ok' ELSE 'missing' END AS result
UNION ALL
SELECT 'inbox: people read only their own',
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inbox' AND policyname = 'inbox_read_own')
             AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.inbox'::regclass)
             AND NOT has_table_privilege('authenticated', 'public.inbox', 'INSERT')
             AND NOT has_table_privilege('authenticated', 'public.inbox', 'UPDATE')
             AND NOT has_table_privilege('anon', 'public.inbox', 'SELECT') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'inbox: live updates',
       CASE WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inbox') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'mark as read',
       CASE WHEN has_function_privilege('authenticated', 'public.mark_inbox_read(text, uuid[])', 'EXECUTE') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'booking change trigger',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_booking_change' AND tgrelid = 'public.appointments'::regclass) THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'app users cannot call the senders',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.send_booking_notice(public.appointments, text, text, text)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.queue_booking_reminders()', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'reminder job every 15 minutes',
       CASE WHEN (SELECT count(*) FROM cron.job WHERE jobname = 'booking-reminders' AND schedule = '*/15 * * * *') = 1 THEN 'ok' ELSE 'missing' END;

-- After a test booking, this shows what went out and to whom:
-- SELECT created_at, kind, payload->>'audience' AS side, recipient_email, status, last_error FROM public.notification_queue WHERE kind LIKE 'booking%' ORDER BY created_at DESC LIMIT 10;
-- SELECT created_at, kind, audience, read_at FROM public.inbox ORDER BY created_at DESC LIMIT 10;
