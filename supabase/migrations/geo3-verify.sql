-- geo3 verify: run after geo3.sql. Every row should say true.
SELECT 'the engine ranks from a spot' AS check,
       position('coalesce(km, 100000)' IN pg_get_functiondef('public.engine_match(text,text,text,date[],text,time without time zone,integer,double precision,double precision,text,numeric,text)'::regprocedure)) > 0 AS ok
UNION ALL
SELECT 'popular chips count a whole country',
       position('market_country(p_market)' IN pg_get_functiondef('public.engine_popular(text)'::regprocedure)) > 0
UNION ALL
SELECT 'Demand keeps the top price and the time asked',
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_log' AND column_name = 'max_price')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'search_log' AND column_name = 'time_window')
UNION ALL
SELECT 'one search_note, taking them', (SELECT count(*) FROM pg_proc WHERE proname = 'search_note') = 1
       AND has_function_privilege('anon', 'public.search_note(text,text,text,text,double precision,double precision,text,integer,text,text,integer,integer,integer,integer,numeric,text)', 'execute');
