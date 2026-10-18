-- geo1b verify: run after geo1b.sql. Every row should say true.
SELECT 'the engine keeps a search inside a region' AS check,
       pg_get_functiondef('public.engine_match(text,text,text,date[],text,time without time zone,integer,double precision,double precision,text,numeric,text)'::regprocedure) LIKE '%v_region%' AS ok
UNION ALL
SELECT 'Nigeria still answers a search', (public.engine_match('ng', 'haircut') ? 'offered')
UNION ALL
SELECT 'a region with nobody gives nobody, never another region',
       coalesce((public.engine_match('ng', 'haircut', NULL, NULL, 'any', NULL, 1, NULL, NULL, 'Zamfara') ->> 'offered')::int, 0)
         = (SELECT count(DISTINCT b.id) FROM public.businesses b JOIN public.services s ON s.business_id = b.id
             WHERE b.is_active AND upper(b.country) = 'NG' AND lower(b.region) = 'zamfara' AND s.is_active);
