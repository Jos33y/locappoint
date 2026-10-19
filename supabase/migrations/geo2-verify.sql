-- geo2 verify: run after geo2.sql. Every ok should say true; the last rows show what a new
-- business outside our cities would get.
SELECT 'Nigeria and Portugal have payment rules' AS check,
       (SELECT count(*) FROM public.market_rules WHERE market IN ('ng', 'pt')) = 2 AS ok, NULL::text AS shows
UNION ALL
SELECT 'every state is an area', (SELECT count(*) FROM public.market_zones WHERE market = 'ng') = 37, NULL
UNION ALL
SELECT 'every municipality is an area', (SELECT count(*) FROM public.market_zones WHERE market = 'pt') = 308, NULL
UNION ALL
SELECT 'owners can pin the shop', has_function_privilege('authenticated', 'public.set_my_shop_spot(uuid,double precision,double precision)', 'execute')
       AND NOT has_function_privilege('anon', 'public.set_my_shop_spot(uuid,double precision,double precision)', 'execute'), NULL
UNION ALL
SELECT 'no business in Nigeria or Portugal without a market',
       NOT EXISTS (SELECT 1 FROM public.businesses WHERE market IS NULL AND country IN ('NG', 'PT')), NULL
UNION ALL
SELECT 'a new business in Enugu belongs to', true, coalesce(public.market_for('NG', 'Enugu'), 'ng')
UNION ALL
SELECT 'a new business in Braga belongs to', true, coalesce(public.market_for('PT', 'Braga'), 'pt');
