-- Run after notifications.sql and the Vault secrets. Every row should say ok.

SELECT 'notifications table' AS check,
       CASE WHEN to_regclass('public.notification_queue') IS NOT NULL THEN 'ok' ELSE 'missing' END AS result
UNION ALL
SELECT 'app users cannot read it',
       CASE WHEN NOT has_table_privilege('authenticated', 'public.notification_queue', 'SELECT')
             AND NOT has_table_privilege('anon', 'public.notification_queue', 'SELECT') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'welcome trigger on sign-up',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_welcome' AND tgrelid = 'auth.users'::regclass) THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'instant wake-up trigger',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notifications_kick') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'every-minute job',
       CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-every-minute') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'vault: notify_url',
       CASE WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_url' AND decrypted_secret LIKE 'https://%/functions/v1/notify') THEN 'ok' ELSE 'missing or wrong' END
UNION ALL
SELECT 'vault: notify_secret',
       CASE WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_secret' AND length(decrypted_secret) >= 24) THEN 'ok' ELSE 'missing or too short' END;

-- After a test sign-up, this shows what happened to each message:
-- SELECT kind, recipient_email, status, attempts, last_error, sent_at FROM public.notification_queue ORDER BY created_at DESC LIMIT 10;
