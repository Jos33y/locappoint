-- Run after support-desk.sql. Every row should say true.
SELECT 'tickets are conversations' AS check_name, to_regclass('public.support_messages') IS NOT NULL AS ok
UNION ALL
SELECT 'old tickets kept their first message', NOT EXISTS (SELECT 1 FROM public.support_tickets t WHERE NOT EXISTS (SELECT 1 FROM public.support_messages m WHERE m.ticket_id = t.id))
UNION ALL
SELECT 'nobody writes tickets directly', NOT has_table_privilege('authenticated', 'public.support_tickets', 'INSERT') AND NOT has_table_privilege('anon', 'public.support_messages', 'SELECT')
UNION ALL
SELECT 'guests report from their booking link', has_function_privilege('anon', 'public.report_by_link(text, text, text)', 'EXECUTE')
UNION ALL
SELECT 'the queue is closed to guests', NOT has_function_privilege('anon', 'public.admin_tickets(text, text, integer, integer)', 'EXECUTE')
UNION ALL
SELECT 'support refunds have their own reason', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_refunds_reason' AND pg_get_constraintdef(oid) LIKE '%support%')
UNION ALL
SELECT 'a paused business cannot switch itself on', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'businesses_suspend_guard')
UNION ALL
SELECT 'quiet tickets close themselves', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'support-tidy');
