-- Run after pay-at-booking.sql. Every row should say true.
SELECT 'payments table' AS what, to_regclass('public.payments') IS NOT NULL AS ok
UNION ALL SELECT 'refunds table', to_regclass('public.payment_refunds') IS NOT NULL
UNION ALL SELECT 'cancellation rule column', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'market_rules' AND column_name = 'free_cancel_hours')
UNION ALL SELECT 'Lagos: transfer and card, no cash', (SELECT methods = ARRAY['transfer', 'card'] FROM public.market_rules WHERE market = 'lagos')
UNION ALL SELECT 'booking holds a paid time', position('payment_terms' IN pg_get_functiondef('public.book_appointment(uuid,uuid,date,time,text,text,text,text,uuid,uuid[])'::regprocedure)) > 0
UNION ALL SELECT 'held times stay silent', position('awaiting' IN pg_get_functiondef('public.send_booking_notice(public.appointments,text,text,text)'::regprocedure)) > 0
UNION ALL SELECT 'paid bookings are announced', position('OLD.payment_status = ''awaiting''' IN pg_get_functiondef('public.notify_booking_change()'::regprocedure)) > 0
UNION ALL SELECT 'refund rule trigger', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_refund' AND tgrelid = 'public.appointments'::regclass)
UNION ALL SELECT 'refund sender wakes up', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'payment_refunds_kick')
UNION ALL SELECT 'every-minute job', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'payments-every-minute')
UNION ALL SELECT 'payments function address from Vault', public.payments_url() LIKE '%/functions/v1/payments-webhook'
UNION ALL SELECT 'clients can get a quote', has_function_privilege('anon', 'public.payment_quote(uuid,uuid,uuid[])', 'execute')
UNION ALL SELECT 'clients can check a payment', has_function_privilege('anon', 'public.payment_state(text)', 'execute')
UNION ALL SELECT 'clients cannot mark anything paid', NOT has_function_privilege('anon', 'public.payment_succeeded(text,text,numeric,text,text)', 'execute')
UNION ALL SELECT 'business fee stays private', NOT has_function_privilege('anon', 'public.payment_terms(uuid,numeric)', 'execute')
UNION ALL SELECT 'no held time older than its hold', NOT EXISTS (SELECT 1 FROM public.appointments WHERE payment_status = 'awaiting' AND hold_until < now() - interval '5 minutes');
