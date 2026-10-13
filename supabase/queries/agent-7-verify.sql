-- WhatsApp 3c: one row. Expect true in every column.
SELECT
  to_regprocedure('public.wa_book(text, uuid, uuid, date, time without time zone, text, text, text, integer, text, text, text)') IS NOT NULL AS visits_bookable,
  to_regprocedure('public.wa_times(uuid, uuid, date, uuid, integer, text, text)') IS NOT NULL AS times_count_travel,
  to_regprocedure('public.wa_search(text, text, date[], text, time without time zone, integer, text)') IS NOT NULL AS search_by_area,
  to_regprocedure('public.wa_report(text, text, text, uuid, text, text)') IS NOT NULL AS report_from_chat,
  to_regprocedure('public.wa_support_reply(text, uuid, text)') IS NOT NULL AS answer_from_chat,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'support_messages_whatsapp') AS replies_go_to_whatsapp,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'wa_phone') AS tickets_know_the_number,
  NOT has_function_privilege('anon', 'public.wa_report(text, text, text, uuid, text, text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.wa_book(text, uuid, uuid, date, time without time zone, text, text, text, integer, text, text, text)', 'EXECUTE') AS only_the_whatsapp_function;
