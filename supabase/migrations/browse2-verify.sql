-- browse2 verify: run after browse2.sql. Every row should say true.
SELECT 'the trade words are in' AS check, (SELECT count(*) FROM public.trade_words) > 500 AS ok
UNION ALL
SELECT 'only the function reads them', (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.trade_words'::regclass)
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trade_words')
UNION ALL
SELECT 'Browse can ask what was asked', has_function_privilege('anon', 'public.public_asked(text,integer)', 'execute')
UNION ALL
SELECT 'it answers a list for each country', jsonb_typeof(public.public_asked('NG')) = 'array' AND jsonb_typeof(public.public_asked('PT')) = 'array'
UNION ALL
SELECT 'never a place under 3 searches', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.public_asked('NG', 31) || public.public_asked('PT', 31)) e WHERE (e->>'searches')::int < 3);
