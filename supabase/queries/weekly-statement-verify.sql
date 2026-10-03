-- Read only. Every row should say ok = true. The last rows preview last week for each live business; nothing is sent.
WITH checks AS (
  SELECT 1 AS n, 'fee: 20 euros is 0.78 before VAT' AS what, public.statement_fee(20, 'PT') = 0.78 AS ok, public.statement_fee(20, 'PT')::text AS detail
  UNION ALL SELECT 2, 'fee: free or unpriced visits carry no fee', public.statement_fee(0, 'PT') = 0 AND public.statement_fee(NULL, 'PT') = 0, NULL
  UNION ALL SELECT 3, 'fee: not priced outside Portugal yet', public.statement_fee(20, 'NG') IS NULL, NULL
  UNION ALL SELECT 4, 'functions run as owner (definer)',
    (SELECT bool_and(p.prosecdef) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN ('statement_week', 'week_statement', 'queue_weekly_statements')), NULL
  UNION ALL SELECT 5, 'signed-in owners can ask for a statement',
    has_function_privilege('authenticated', 'public.week_statement(uuid, integer)', 'EXECUTE'), NULL
  UNION ALL SELECT 6, 'nobody outside the database can queue or read raw weeks',
    NOT has_function_privilege('authenticated', 'public.statement_week(uuid, date)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.queue_weekly_statements()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.week_statement(uuid, integer)', 'EXECUTE'), NULL
  UNION ALL SELECT 7, 'Monday job scheduled once, hourly at :09',
    (SELECT count(*) = 1 AND min(schedule) = '9 * * * *' FROM cron.job WHERE jobname = 'weekly-statements'), NULL
  UNION ALL SELECT 8, 'a week has every part the screens and emails read',
    (SELECT public.statement_week(id, current_date - 7) ?& ARRAY['from', 'to', 'country', 'online', 'added', 'fee', 'due', 'beta']
       FROM public.businesses ORDER BY created_at LIMIT 1), NULL
  UNION ALL SELECT 9, 'no push for statements (bell and email only)',
    position('weekly_statement' in pg_get_functiondef('public.queue_push_from_inbox()'::regprocedure)) = 0, NULL
)
SELECT n, what, ok, detail FROM checks
UNION ALL
SELECT 100 + row_number() OVER (ORDER BY b.business_name), 'last week: ' || b.business_name, true,
       s->>'from' || ' to ' || (s->>'to') || ': ' || (s #>> '{online,count}') || ' on Locappoint (' || (s #>> '{online,value}') || '), '
       || (s #>> '{added,count}') || ' added (' || (s #>> '{added,value}') || '), fee ' || coalesce(s->>'fee', 'not priced') || ', due ' || (s->>'due')
  FROM public.businesses b,
       LATERAL public.statement_week(b.id, date_trunc('week', now() AT TIME ZONE b.timezone)::date - 7) s
 WHERE b.is_active = true
ORDER BY 1;
