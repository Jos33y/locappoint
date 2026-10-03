-- Run after client-payments.sql. Every row should say true.
SELECT 'booking_money exists' AS check_name,
       to_regprocedure('public.booking_money(uuid[])') IS NOT NULL AS ok
UNION ALL
SELECT 'booking_money is security definer with a fixed search path',
       EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure('public.booking_money(uuid[])')
               AND p.prosecdef AND array_to_string(p.proconfig, ',') LIKE '%search_path=%')
UNION ALL
SELECT 'signed-in people can call it',
       has_function_privilege('authenticated', 'public.booking_money(uuid[])', 'EXECUTE')
UNION ALL
SELECT 'guests cannot',
       NOT has_function_privilege('anon', 'public.booking_money(uuid[])', 'EXECUTE')
UNION ALL
SELECT 'without a signed-in person it returns nothing',
       public.booking_money(ARRAY(SELECT id FROM public.appointments WHERE payment_status = 'paid' LIMIT 5)) = '[]'::jsonb
UNION ALL
SELECT 'every market has a cancellation rule',
       NOT EXISTS (SELECT 1 FROM public.markets m LEFT JOIN public.market_rules r ON r.market = m.code WHERE r.market IS NULL);
