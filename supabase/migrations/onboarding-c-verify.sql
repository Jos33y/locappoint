SELECT 'category_detail_column' AS check, count(*)::text AS result
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'category_detail'
-- expect 1
UNION ALL
SELECT 'category_detail_rule', count(*)::text
  FROM pg_constraint WHERE conname = 'businesses_category_detail_length'
-- expect 1
UNION ALL
SELECT 'rows_with_detail', count(*)::text
  FROM public.businesses WHERE category_detail IS NOT NULL;
-- expect 0 until someone picks Something else
