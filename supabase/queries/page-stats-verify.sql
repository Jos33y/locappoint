-- Run after page-stats.sql. Every row should say ok.

SELECT 'page counts table' AS check,
       CASE WHEN to_regclass('public.page_stats') IS NOT NULL THEN 'ok' ELSE 'missing' END AS result
UNION ALL
SELECT 'app users cannot read counts directly',
       CASE WHEN NOT has_table_privilege('anon', 'public.page_stats', 'SELECT')
             AND NOT has_table_privilege('authenticated', 'public.page_stats', 'SELECT') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'visitors can be counted',
       CASE WHEN has_function_privilege('anon', 'public.track_page_event(uuid, text, text, text)', 'EXECUTE') THEN 'ok' ELSE 'missing' END
UNION ALL
SELECT 'old notifications table gone',
       CASE WHEN to_regclass('public.notifications') IS NULL THEN 'ok' ELSE 'still there' END;

-- After opening a business page from another browser, this shows the counts:
-- SELECT day, event, source, device, count FROM public.page_stats ORDER BY day DESC, event LIMIT 20;
