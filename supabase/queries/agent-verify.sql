-- Run after agent.sql. Every row should say true.
SELECT 'conversations and costs are private' AS check_name, NOT has_table_privilege('authenticated', 'public.wa_threads', 'SELECT') AND NOT has_table_privilege('anon', 'public.wa_agent_days', 'SELECT') AS ok
UNION ALL
SELECT 'only the whatsapp function books, moves and cancels for a number', NOT has_function_privilege('anon', 'public.wa_book(text, uuid, uuid, date, time, text, text, text, integer)', 'EXECUTE')
   AND NOT has_function_privilege('authenticated', 'public.wa_cancel(text, uuid)', 'EXECUTE') AND has_function_privilege('service_role', 'public.wa_move(text, uuid, date, time)', 'EXECUTE')
UNION ALL
SELECT 'the website still needs an email; WhatsApp bookings are marked', pg_get_functiondef('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer)'::regprocedure) LIKE '%v_wa%service_role%'
UNION ALL
SELECT 'clients who booked on WhatsApp hear back there', pg_get_functiondef('public.send_booking_notice(public.appointments, text, text, text)'::regprocedure) LIKE '%wa_client_notice%'
UNION ALL
SELECT 'the agent has a switch and a daily cap', EXISTS (SELECT 1 FROM public.wa_config WHERE id = 1 AND agent_on IS NOT NULL AND agent_cap_eur >= 0)
UNION ALL
SELECT 'no WhatsApp number on pages until live', public.wa_book_number() IS NULL OR (SELECT live FROM public.wa_config WHERE id = 1)
UNION ALL
SELECT 'admins read conversations', has_function_privilege('authenticated', 'public.admin_wa_threads(text, integer, integer)', 'EXECUTE')
UNION ALL
SELECT 'old conversations are cleared', pg_get_functiondef('public.wa_tidy()'::regprocedure) LIKE '%wa_threads%';
