-- search1 verify: run after search-scenes.sql. Every row should say true.
SELECT 'function exists, security definer' AS check, bool_and(p.prosecdef) AS ok
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'search_place_interest'
UNION ALL
SELECT 'anon may ask', has_function_privilege('anon', 'public.search_place_interest(text,text,text)', 'execute')
UNION ALL
SELECT 'answers with two counts', (public.search_place_interest('lagos', 'Abeokuta', NULL) ?& ARRAY['missed', 'waiting'])
UNION ALL
SELECT 'a country answers too', (public.search_place_interest(NULL, NULL, 'KE') ?& ARRAY['missed', 'waiting'])
UNION ALL
SELECT 'counts under 3 are never shown', ((public.search_place_interest('lagos', 'zz-nowhere', NULL) ->> 'missed')::int = 0);
