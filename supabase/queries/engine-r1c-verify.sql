-- Run after engine-r1c.sql. Every row should say true.
SELECT 'price limit and cheapest' AS what, to_regprocedure('public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text, numeric, text)') IS NOT NULL AS ok
UNION ALL SELECT 'old engine gone', to_regprocedure('public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text)') IS NULL
UNION ALL SELECT 'kids services only when asked', position('v_kid_words' IN pg_get_functiondef('public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text, numeric, text)'::regprocedure)) > 0
UNION ALL SELECT 'still keeps travel between visits', position('p_mode, p_zone) sl' IN pg_get_functiondef('public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text, numeric, text)'::regprocedure)) > 0
UNION ALL SELECT 'callable by visitors', has_function_privilege('anon', 'public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text, numeric, text)', 'EXECUTE')
UNION ALL SELECT 'WhatsApp search still works', (public.wa_search('lagos', 'haircut') ? 'options')
UNION ALL SELECT 'word lists added (barbing, unhas, trancas)', (SELECT count(*) FROM public.engine_words WHERE word IN ('barbing', 'unhas', 'trancas')) = 3;
