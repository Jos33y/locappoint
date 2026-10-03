SELECT 'country_column' AS check, count(*)::text AS result
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'country'
-- expect 1
UNION ALL
SELECT 'neighbourhood_column', count(*)::text
  FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'neighbourhood'
-- expect 1
UNION ALL
SELECT 'location_rules', count(*)::text
  FROM pg_constraint WHERE conname IN ('businesses_country_code', 'businesses_neighbourhood_length')
-- expect 2
UNION ALL
SELECT 'businesses_by_country', coalesce(string_agg(country || ' ' || n, ', '), 'none')
  FROM (SELECT country, count(*)::text AS n FROM public.businesses GROUP BY country ORDER BY country) c;
-- expect your businesses, all PT unless one was set up with Lagos time
