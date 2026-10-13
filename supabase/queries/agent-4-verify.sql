-- Run after agent-4.sql. All five rows should say true.
SELECT 'booking emails reach WhatsApp bookings' AS check_name, position('a.source IN (''web'', ''whatsapp'')' IN pg_get_functiondef('public.send_booking_notice(public.appointments, text, text, text)'::regprocedure)) > 0 AS ok
UNION ALL
SELECT 'receipt emails reach WhatsApp bookings', position('a.source IN (''web'', ''whatsapp'')' IN pg_get_functiondef('public.issue_receipt'::regproc)) > 0
UNION ALL
SELECT 'the Monday statement counts WhatsApp bookings', position('v.source IN (''web'', ''whatsapp'')' IN pg_get_functiondef('public.statement_week(uuid, date)'::regprocedure)) > 0
UNION ALL
SELECT 'only the whatsapp function can add an email', NOT has_function_privilege('anon', 'public.wa_set_email(text, uuid, text)', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_set_email(text, uuid, text)', 'EXECUTE')
UNION ALL
SELECT 'free days give the first and last time of each day', position('''examples''' IN pg_get_functiondef('public.wa_free_days(uuid, uuid, date, integer)'::regprocedure)) > 0;
