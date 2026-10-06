-- Run after engine-v1.sql. Every row should say true.
SELECT 'the engine can be asked by anyone' AS check_name,
       has_function_privilege('anon', 'public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text)', 'EXECUTE') AS ok
UNION ALL
SELECT 'words fold accents', public.engine_fold('Unhas de Gél') = 'unhas de gel'
UNION ALL
SELECT 'every category has its words', (SELECT count(*) FROM public.engine_categories) >= 60
UNION ALL
SELECT 'Portuguese and English mean the same', EXISTS (SELECT 1 FROM public.engine_words a JOIN public.engine_words b ON a.grp = b.grp WHERE a.word = 'unhas' AND b.word = 'nails')
UNION ALL
SELECT 'near spellings are found', extensions.levenshtein('nials', 'nails') = 2
UNION ALL
SELECT 'the suggestion chips can be asked by anyone', has_function_privilege('anon', 'public.engine_popular(text)', 'EXECUTE');
