-- Run after business-insights.sql. Both rows should say ok.

SELECT 'insights for owners' AS check,
       CASE WHEN has_function_privilege('authenticated', 'public.business_insights(uuid, integer)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.business_insights(uuid, integer)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END AS result
UNION ALL
SELECT 'period helper is private',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.insights_period(uuid, date, date, timestamp, text)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END;
