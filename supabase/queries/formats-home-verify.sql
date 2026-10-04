-- Run after formats-home.sql. Every row should say true.
SELECT 'Porto has its municipalities' AS check_name, (SELECT count(*) FROM public.market_zones WHERE market = 'porto') >= 10 AS ok
UNION ALL
SELECT 'Lisbon has its municipalities', (SELECT count(*) FROM public.market_zones WHERE market = 'lisbon') >= 10
UNION ALL
SELECT 'booking takes the client''s area and address',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text)') IS NOT NULL
       AND has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text)', 'EXECUTE')
UNION ALL
SELECT 'the older booking function is gone',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text)') IS NULL
UNION ALL
SELECT 'the quote knows the travel fee',
       to_regprocedure('public.payment_quote(uuid, uuid, uuid[], text)') IS NOT NULL AND to_regprocedure('public.payment_quote(uuid, uuid, uuid[])') IS NULL
       AND has_function_privilege('anon', 'public.payment_quote(uuid, uuid, uuid[], text)', 'EXECUTE')
UNION ALL
SELECT 'the business sees the address only once confirmed',
       pg_get_functiondef('public.booking_notice_payload(appointments)'::regprocedure) LIKE '%a.status IN (''confirmed'', ''completed'')%'
UNION ALL
SELECT 'receipts list the travel fee', pg_get_functiondef('public.issue_receipt(uuid, text, uuid)'::regprocedure) LIKE '%Travel to you%'
UNION ALL
SELECT 'addresses are cleared after visits', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'clear-visit-addresses');
