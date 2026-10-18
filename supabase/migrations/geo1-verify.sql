-- geo1 verify: run after geo1.sql. Every row should say true.
SELECT 'Nigeria and Portugal are markets' AS check,
       (SELECT count(*) FROM public.markets WHERE code IN ('ng', 'pt')) = 2 AS ok
UNION ALL
SELECT 'countries copy their city''s time zone, currency and payments',
       NOT EXISTS (SELECT 1 FROM public.markets c JOIN public.markets m ON m.code = CASE c.code WHEN 'ng' THEN 'lagos' ELSE 'porto' END
                    WHERE c.code IN ('ng', 'pt') AND (c.timezone IS DISTINCT FROM m.timezone OR c.currency IS DISTINCT FROM m.currency OR c.payment_provider IS DISTINCT FROM m.payment_provider))
UNION ALL
SELECT 'every business has a country', NOT EXISTS (SELECT 1 FROM public.businesses WHERE country IS NULL OR btrim(country) = '')
UNION ALL
SELECT 'every live business has a region', NOT EXISTS (SELECT 1 FROM public.businesses WHERE is_active AND region IS NULL)
UNION ALL
SELECT 'market_country knows countries', public.market_country('ng') = 'NG' AND public.market_country('pt') = 'PT' AND public.market_country('lagos') = 'NG'
UNION ALL
SELECT 'the engine reads a country', pg_get_functiondef('public.engine_match(text,text,text,date[],text,time without time zone,integer,double precision,double precision,text,numeric,text)'::regprocedure) LIKE '%v_country%'
UNION ALL
SELECT 'Nigeria answers a search', (public.engine_match('ng', 'haircut') ? 'offered')
UNION ALL
SELECT 'Portugal answers a search', (public.engine_match('pt', 'haircut') ? 'offered');

-- Not a check: how the regions came out, to eyeball.
-- SELECT country, region, count(*) FROM public.businesses GROUP BY 1, 2 ORDER BY 1, 3 DESC;
