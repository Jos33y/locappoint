-- Run after card-cleanup.sql. Every row should say true.
SELECT 'payment_cleanup exists' AS check_name, to_regclass('public.payment_cleanup') IS NOT NULL AS ok
UNION ALL
SELECT 'nobody signed in can read it',
       NOT has_table_privilege('authenticated', 'public.payment_cleanup', 'SELECT') AND NOT has_table_privilege('anon', 'public.payment_cleanup', 'SELECT')
UNION ALL
SELECT 'removing a saved-card link queues its cleanup',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_customers_cleanup' AND tgrelid = 'public.payment_customers'::regclass)
UNION ALL
SELECT 'replacing a saved-card link queues the old one',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_customers_replaced' AND tgrelid = 'public.payment_customers'::regclass)
UNION ALL
SELECT 'a queued cleanup wakes the sender',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_cleanup_kick' AND tgrelid = 'public.payment_cleanup'::regclass)
UNION ALL
SELECT 'only the server can claim and close cleanups',
       NOT has_function_privilege('authenticated', 'public.claim_cleanups(integer)', 'EXECUTE')
       AND has_function_privilege('service_role', 'public.cleanup_done(uuid, boolean, text)', 'EXECUTE')
UNION ALL
SELECT 'the every-minute job watches cleanups',
       EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'payments-every-minute' AND command LIKE '%payment_cleanup%');
