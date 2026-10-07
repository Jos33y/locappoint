-- Run after whatsapp.sql. Every row should say true.
SELECT 'one Locappoint number, not live yet' AS check_name, EXISTS (SELECT 1 FROM public.wa_config WHERE id = 1 AND number ~ '^[0-9]{8,15}$') AS ok
UNION ALL
SELECT 'nobody reads phones or messages directly', NOT has_table_privilege('authenticated', 'public.wa_contacts', 'SELECT') AND NOT has_table_privilege('anon', 'public.wa_contacts', 'SELECT')
   AND NOT has_table_privilege('authenticated', 'public.wa_messages', 'SELECT') AND NOT has_table_privilege('authenticated', 'public.wa_codes', 'SELECT')
UNION ALL
SELECT 'only the whatsapp function acts for a phone', NOT has_function_privilege('authenticated', 'public.wa_answer(text, uuid, text)', 'EXECUTE')
   AND NOT has_function_privilege('anon', 'public.wa_link_confirm(text, text)', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_trip(text, uuid, integer)', 'EXECUTE')
UNION ALL
SELECT 'Settings can link and switch it on', has_function_privilege('authenticated', 'public.wa_link_start()', 'EXECUTE') AND has_function_privilege('authenticated', 'public.wa_set_alerts(uuid, boolean)', 'EXECUTE')
UNION ALL
SELECT 'bookings on WhatsApp are off until switched on', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_members' AND column_name = 'wa_alerts' AND column_default = 'false')
UNION ALL
SELECT 'the bell feeds WhatsApp', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'inbox_whatsapp')
UNION ALL
SELECT 'the phone check knows about WhatsApp', pg_get_functiondef('public.reliability_compute(uuid)'::regprocedure) LIKE '%wa_live%'
UNION ALL
SELECT 'messages go after 90 days', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-tidy');
