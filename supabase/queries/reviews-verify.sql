-- Run after reviews.sql. Every row should say ok.

SELECT 'reviews table, closed to the app' AS check,
       CASE WHEN to_regclass('public.reviews') IS NOT NULL
             AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.reviews'::regclass)
             AND NOT has_table_privilege('anon', 'public.reviews', 'SELECT')
             AND NOT has_table_privilege('authenticated', 'public.reviews', 'INSERT')
             AND NOT has_table_privilege('authenticated', 'public.reviews', 'UPDATE') THEN 'ok' ELSE 'wrong' END AS result
UNION ALL
SELECT 'clients read reviews on their own bookings',
       CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' AND policyname = 'reviews_client_read') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'review by manage link',
       CASE WHEN has_function_privilege('anon', 'public.review_by_link(text)', 'EXECUTE')
             AND has_function_privilege('anon', 'public.submit_review_by_link(text, integer, text)', 'EXECUTE') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'review signed in',
       CASE WHEN has_function_privilege('authenticated', 'public.submit_my_review(uuid, integer, text)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.submit_my_review(uuid, integer, text)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'public page and search read ratings',
       CASE WHEN has_function_privilege('anon', 'public.public_reviews(uuid, integer, integer)', 'EXECUTE')
             AND has_function_privilege('anon', 'public.business_ratings()', 'EXECUTE') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'owner reads, replies and reports',
       CASE WHEN has_function_privilege('authenticated', 'public.owner_reviews(uuid)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.reply_to_review(uuid, text)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.report_review(uuid, text)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.owner_reviews(uuid)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'helpers closed to the app',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.save_review(public.appointments, integer, text)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.review_state(public.appointments)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'review notifications trigger',
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_review_change' AND tgrelid = 'public.reviews'::regclass) THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'names shortened for the public',
       CASE WHEN public.review_author('ana maria santos') = 'Ana S.' THEN 'ok' ELSE 'wrong' END;
