-- Run after verified.sql. Every row should say true.
SELECT 'the video bucket is private, 50 MB, video only' AS check_name, EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'verification-videos' AND NOT public AND file_size_limit = 52428800 AND 'video/mp4' = ANY (allowed_mime_types)) AS ok
UNION ALL
SELECT 'only the owner uploads, only owner and staff watch', (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'verification_videos_%') = 3
UNION ALL
SELECT 'nobody reads verifications directly', NOT has_table_privilege('authenticated', 'public.business_verifications', 'SELECT') AND NOT has_table_privilege('anon', 'public.business_verifications', 'SELECT')
UNION ALL
SELECT 'only Stripe results write the ID check', NOT has_function_privilege('authenticated', 'public.verification_identity(uuid, text, text, text, boolean)', 'EXECUTE')
UNION ALL
SELECT 'clients see Verified', has_function_privilege('anon', 'public.business_trust()', 'EXECUTE') AND pg_get_function_result('public.business_trust()'::regprocedure) LIKE '%verified boolean%'
UNION ALL
SELECT 'a new address needs a new video', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'businesses_verification_address')
UNION ALL
SELECT 'a year runs out every night', EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'verification-nightly');
