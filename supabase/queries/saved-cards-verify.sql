-- Run after saved-cards.sql. Every row should say true.
SELECT 'payment_customers exists' AS check_name, to_regclass('public.payment_customers') IS NOT NULL AS ok
UNION ALL
SELECT 'row level security is on',
       (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payment_customers'::regclass)
UNION ALL
SELECT 'signed-in people cannot read it',
       NOT has_table_privilege('authenticated', 'public.payment_customers', 'SELECT')
UNION ALL
SELECT 'guests cannot read it',
       NOT has_table_privilege('anon', 'public.payment_customers', 'SELECT')
UNION ALL
SELECT 'deleting an account removes its rows',
       EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.payment_customers'::regclass AND contype = 'f' AND confdeltype = 'c'
               AND confrelid = 'auth.users'::regclass);
