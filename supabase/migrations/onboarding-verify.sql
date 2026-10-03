-- Run after part A. Rows marked (B) apply only after part B.

SELECT 'one_per_owner_index' AS check, count(*)::text AS result
  FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'businesses_one_per_owner'
-- expect 1
UNION ALL
SELECT 'launched_at_column', count(*)::text
  FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'launched_at'
-- expect 1
UNION ALL
SELECT 'businesses_without_launch_date', count(*)::text
  FROM public.businesses WHERE launched_at IS NULL
-- expect 0 right after part A; later it counts businesses still in setup
UNION ALL
SELECT 'is_active_default', column_default
  FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'is_active'
-- expect false
UNION ALL
SELECT 'services_sort_order_column', count(*)::text
  FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'sort_order'
-- expect 1
UNION ALL
SELECT 'bucket', public::text || ' ' || file_size_limit || ' ' || array_to_string(allowed_mime_types, ',')
  FROM storage.buckets WHERE id = 'business-media'
-- expect true 5242880 image/jpeg,image/png,image/webp
UNION ALL
SELECT 'media_policies', count(*)::text
  FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'business_media_owner_%'
-- expect 4
UNION ALL
SELECT 'slug_status_anon', has_function_privilege('anon', 'public.slug_status(text)', 'EXECUTE')::text
-- expect false
UNION ALL
SELECT 'slug_status_authenticated', has_function_privilege('authenticated', 'public.slug_status(text)', 'EXECUTE')::text
-- expect true
UNION ALL
SELECT 'owns_media_path_anon', has_function_privilege('anon', 'public.owns_media_path(text)', 'EXECUTE')::text
-- expect false
UNION ALL
SELECT 'slug_status_femtos_as_nobody', public.slug_status('femtos-hair')
-- expect taken (the SQL editor runs with no signed-in user)
UNION ALL
SELECT 'slug_status_reserved_shape', public.slug_status('Bad Slug')
-- expect invalid
UNION ALL
SELECT 'launch_guard_trigger (B)', count(*)::text
  FROM pg_trigger WHERE tgname = 'businesses_launch_guard' AND NOT tgisinternal;
-- expect 0 after part A, 1 after part B
