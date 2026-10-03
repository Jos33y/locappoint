-- Run after referrals.sql. Every row should say ok.

SELECT 'referral tables, closed to the app' AS check,
       CASE WHEN (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.referral_codes'::regclass, 'public.referrals'::regclass, 'public.referral_points'::regclass))
             AND NOT has_table_privilege('authenticated', 'public.referral_points', 'SELECT')
             AND NOT has_table_privilege('authenticated', 'public.referrals', 'INSERT') THEN 'ok' ELSE 'wrong' END AS result
UNION ALL
SELECT 'owners read their invites, new businesses claim',
       CASE WHEN has_function_privilege('authenticated', 'public.my_referrals(uuid)', 'EXECUTE')
             AND has_function_privilege('authenticated', 'public.claim_referral(text)', 'EXECUTE')
             AND NOT has_function_privilege('anon', 'public.claim_referral(text)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'awards closed to the app',
       CASE WHEN NOT has_function_privilege('authenticated', 'public.award_referral(uuid)', 'EXECUTE')
             AND NOT has_function_privilege('authenticated', 'public.real_booking_count(uuid)', 'EXECUTE') THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'six steps on the ladder',
       CASE WHEN (SELECT count(*) FROM public.referral_ladder()) = 6 THEN 'ok' ELSE 'wrong' END
UNION ALL
SELECT 'points job every hour',
       CASE WHEN (SELECT count(*) FROM cron.job WHERE jobname = 'referral-points') = 1 THEN 'ok' ELSE 'missing' END;
