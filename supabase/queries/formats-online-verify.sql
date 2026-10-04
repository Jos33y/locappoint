-- Run after formats-online.sql. Every row should say true.
SELECT 'booking takes where it happens' AS check_name,
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text)') IS NOT NULL AS ok
UNION ALL
SELECT 'the old booking function is gone',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[])') IS NULL
UNION ALL
SELECT 'guests and clients can book',
       has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text)', 'EXECUTE')
       AND has_function_privilege('authenticated', 'public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text)', 'EXECUTE')
UNION ALL
SELECT 'emails know if it is online',
       pg_get_functiondef('public.booking_notice_payload(appointments)'::regprocedure) LIKE '%meeting_url%'
UNION ALL
SELECT 'the manage page shows the link only once confirmed',
       pg_get_functiondef('public.booking_by_link(text)'::regprocedure) LIKE '%a.status = ''confirmed''%'
UNION ALL
SELECT 'every service is offered at least one way',
       NOT EXISTS (SELECT 1 FROM public.services WHERE cardinality(modes) = 0);
