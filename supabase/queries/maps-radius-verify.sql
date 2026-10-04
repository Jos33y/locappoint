-- Run after maps-radius.sql. Every row should say true.
SELECT 'distance works (Porto to Matosinhos is about 7 km)' AS check_name, public.km_between(41.1496, -8.6109, 41.1821, -8.6891) BETWEEN 7 AND 8 AS ok
UNION ALL
SELECT 'businesses can hold a shop location',
       (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name IN ('lat', 'lng', 'place_id', 'located_at')) = 4
UNION ALL
SELECT 'only the places function writes the location',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'businesses_geo_guard')
       AND NOT has_function_privilege('authenticated', 'public.set_shop_location(uuid, text, double precision, double precision)', 'EXECUTE')
UNION ALL
SELECT 'booking checks the distance',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text)') IS NOT NULL
       AND has_function_privilege('anon', 'public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text)', 'EXECUTE')
UNION ALL
SELECT 'the older booking function is gone',
       to_regprocedure('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text)') IS NULL
UNION ALL
SELECT 'the client place id is guarded and cleared',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_place_guard')
       AND pg_get_functiondef('public.clear_visit_addresses()'::regprocedure) LIKE '%client_place_id = NULL%'
UNION ALL
SELECT 'shop locations refresh every night', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'shop-locations')
UNION ALL
SELECT 'places function address from Vault', public.places_url() LIKE '%/functions/v1/places';
