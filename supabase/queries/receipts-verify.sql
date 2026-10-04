-- Run after receipts.sql. Every row should say true.
SELECT 'receipts exists' AS check_name, to_regclass('public.receipts') IS NOT NULL AS ok
UNION ALL
SELECT 'row level security is on', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.receipts'::regclass)
UNION ALL
SELECT 'guests cannot read receipts', NOT has_table_privilege('anon', 'public.receipts', 'SELECT')
UNION ALL
SELECT 'nobody signed in can write receipts', NOT has_table_privilege('authenticated', 'public.receipts', 'INSERT') AND NOT has_table_privilege('authenticated', 'public.receipts', 'UPDATE')
UNION ALL
SELECT 'only the database issues receipts', NOT has_function_privilege('authenticated', 'public.issue_receipt(uuid, text, uuid)', 'EXECUTE')
UNION ALL
SELECT 'a payment issues a receipt', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_receipt' AND tgrelid = 'public.appointments'::regclass)
UNION ALL
SELECT 'a sent refund issues a refund receipt', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_refunds_receipt' AND tgrelid = 'public.payment_refunds'::regclass)
UNION ALL
SELECT 'the receipt page opens by its link', has_function_privilege('anon', 'public.receipt_by_token(text)', 'EXECUTE') AND public.receipt_by_token('nope') IS NULL
UNION ALL
SELECT 'every paid booking has its receipt',
       NOT EXISTS (SELECT 1 FROM public.appointments a JOIN public.payments p ON p.appointment_id = a.id AND p.status IN ('paid', 'refunded', 'partly_refunded')
                    WHERE NOT EXISTS (SELECT 1 FROM public.receipts r WHERE r.appointment_id = a.id AND r.kind = 'payment'))
UNION ALL
SELECT 'numbers are unique per business', NOT EXISTS (SELECT 1 FROM public.receipts GROUP BY business_id, number HAVING count(*) > 1);
