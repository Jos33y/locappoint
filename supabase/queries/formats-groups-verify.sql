-- Run after formats-groups.sql. Every row should say true.
SELECT 'free times fit the whole group' AS check_name,
       to_regprocedure('public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer)') IS NOT NULL
       AND to_regprocedure('public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[])') IS NULL
       AND has_function_privilege('anon', 'public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer)', 'EXECUTE') AS ok
UNION ALL
SELECT 'booking takes how many people',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer)') IS NOT NULL
       AND has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer)', 'EXECUTE')
UNION ALL
SELECT 'the older booking function is gone',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text)') IS NULL
UNION ALL
SELECT 'the quote prices the group',
       to_regprocedure('public.payment_quote(uuid, uuid, uuid[], text, integer)') IS NOT NULL AND to_regprocedure('public.payment_quote(uuid, uuid, uuid[], text)') IS NULL
       AND has_function_privilege('anon', 'public.payment_quote(uuid, uuid, uuid[], text, integer)', 'EXECUTE')
UNION ALL
SELECT 'emails and receipts say how many people',
       pg_get_functiondef('public.booking_notice_payload(appointments)'::regprocedure) LIKE '%people%'
       AND pg_get_functiondef('public.issue_receipt(uuid, text, uuid)'::regprocedure) LIKE '%people%'
UNION ALL
SELECT 'every service is still for one person until the business says otherwise',
       NOT EXISTS (SELECT 1 FROM public.services WHERE max_people < 1);
