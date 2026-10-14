-- Every row should say true.
WITH defs AS (
  SELECT
    pg_get_functiondef('public.real_booking_count(uuid)'::regprocedure) AS real_count,
    pg_get_functiondef('public.statement_week(uuid, date)'::regprocedure) AS statement,
    pg_get_functiondef('public.business_insights(uuid, integer)'::regprocedure) AS insights,
    pg_get_functiondef('public.insights_period(uuid, date, date, timestamp, text)'::regprocedure) AS period,
    pg_get_functiondef('public.queue_visit_followups()'::regprocedure) AS followups
)
SELECT 1 AS n, 'web, whatsapp, google and ai_assistant are client bookings' AS what,
       public.is_client_booking('web') AND public.is_client_booking('whatsapp') AND public.is_client_booking('google') AND public.is_client_booking('ai_assistant') AS ok
UNION ALL SELECT 2, 'manual and assistant are owner-added, never real',
       NOT public.is_client_booking('manual') AND NOT public.is_client_booking('assistant') AND NOT coalesce(public.is_client_booking(NULL), false)
UNION ALL SELECT 3, 'the helper is not callable by app users',
       NOT has_function_privilege('anon', 'public.is_client_booking(text)', 'EXECUTE')
       AND NOT has_function_privilege('authenticated', 'public.is_client_booking(text)', 'EXECUTE')
UNION ALL SELECT 4, 'referral milestones count every client booking',
       position('public.is_client_booking(a.source)' IN real_count) > 0 AND position('''web''' IN real_count) = 0 FROM defs
UNION ALL SELECT 5, 'the Monday statement uses the helper on both lines',
       position('NOT public.is_client_booking(v.source)' IN statement) > 0 AND position('''whatsapp''' IN statement) = 0 AND position('''manual''' IN statement) = 0 FROM defs
UNION ALL SELECT 6, 'Insights lead time counts every client booking',
       position('public.is_client_booking(a.source) AND a.status' IN insights) > 0 AND position('''web''' IN insights) = 0 FROM defs
UNION ALL SELECT 7, 'the page funnel still counts web bookings only',
       (length(period) - length(replace(period, 'a.source = ''web''', ''))) / length('a.source = ''web''') = 2 FROM defs
UNION ALL SELECT 8, 'review requests reach WhatsApp clients with an email',
       position('(public.is_client_booking(ap.source) AND ap.client_email IS NOT NULL)' IN followups) > 0 FROM defs
UNION ALL SELECT 9, 'the referral points job still runs hourly',
       (SELECT count(*) = 1 FROM cron.job WHERE jobname = 'referral-points')
ORDER BY n;
