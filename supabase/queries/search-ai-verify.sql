-- Run after search-ai.sql. Every row should say true.
SELECT 'AI on, cap USD 3' AS what, EXISTS (SELECT 1 FROM public.search_ai_config WHERE id = 1 AND is_on AND cap_usd = 3) AS ok
UNION ALL SELECT 'only the server can use it', NOT has_function_privilege('anon', 'public.search_ai_allow(text)', 'EXECUTE') AND NOT has_function_privilege('anon', 'public.search_ai_context(text)', 'EXECUTE')
UNION ALL SELECT 'context lists real services', jsonb_array_length(public.search_ai_context('lagos')->'services') > 0
UNION ALL SELECT 'row security on', (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.search_ai_config'::regclass, 'public.search_ai_days'::regclass));
