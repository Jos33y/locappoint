-- geo5 verify: run after geo5.sql. Every row should say true.
SELECT 'businesses can charge travel by distance' AS check,
       (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses'
         AND column_name IN ('travel_base', 'travel_per_km', 'travel_min', 'travel_max')) = 4 AS ok
UNION ALL
SELECT 'a visit keeps its drive', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments'
         AND column_name IN ('travel_minutes', 'travel_km')) = 2
UNION ALL
SELECT 'quotes only from our server', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.travel_quotes'::regclass)
       AND has_function_privilege('service_role', 'public.travel_quote_make(uuid,text,integer,integer)', 'execute')
       AND NOT has_function_privilege('anon', 'public.travel_quote_make(uuid,text,integer,integer)', 'execute')
UNION ALL
SELECT 'free times leave room for the drive', (SELECT count(*) FROM pg_proc WHERE proname = 'get_available_slots') = 1
       AND has_function_privilege('anon', 'public.get_available_slots(uuid,uuid,date,uuid,uuid,uuid[],integer,text,text,integer)', 'execute')
UNION ALL
SELECT 'the price and the booking take the quote',
       has_function_privilege('anon', 'public.payment_quote(uuid,uuid,uuid[],text,integer,uuid)', 'execute')
       AND has_function_privilege('anon', 'public.book_appointment(uuid,uuid,date,time without time zone,text,text,text,text,uuid,uuid[],text,text,text,text,double precision,double precision,text,integer,uuid)', 'execute')
       AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'book_appointment' AND pronargs = 18)
UNION ALL
SELECT 'a 12.3 km drive is priced by the rule', public.travel_fee_for(NULL, 12.3) IS NULL;
