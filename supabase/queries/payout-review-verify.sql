-- After payout-review.sql: one row, every column true.
SELECT
  to_regclass('public.payout_name_reviews') IS NOT NULL AS table_ok,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.payout_name_reviews'::regclass) AS rls_on,
  NOT has_table_privilege('authenticated', 'public.payout_name_reviews', 'SELECT') AS hidden_from_users,
  (SELECT pg_get_constraintdef(oid) LIKE '%payout_name%' FROM pg_constraint WHERE conname = 'support_actions_action') AS log_knows_it,
  NOT has_function_privilege('authenticated', 'public.payout_review_open(uuid, uuid, text, text, text, text)', 'EXECUTE') AS open_server_only,
  NOT has_function_privilege('authenticated', 'public.payout_review_ok(uuid, text, text, text)', 'EXECUTE') AS ok_server_only,
  has_function_privilege('authenticated', 'public.admin_payout_decide(uuid, boolean, text)', 'EXECUTE') AS admin_can_decide;
