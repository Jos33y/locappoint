-- Account deletion: every row should say ok.
SELECT check_name, CASE WHEN passed THEN 'ok' ELSE 'FAILED' END AS result FROM (
  SELECT 'signed-in people can check and delete their own account' AS check_name,
         has_function_privilege('authenticated', 'public.account_deletion_check()', 'execute')
         AND has_function_privilege('authenticated', 'public.delete_my_account(text)', 'execute') AS passed
  UNION ALL
  SELECT 'nobody signed out can call them',
         NOT has_function_privilege('anon', 'public.delete_my_account(text)', 'execute')
  UNION ALL
  SELECT 'the function is allowed to remove a sign-in',
         has_table_privilege((SELECT proowner::regrole::text FROM pg_proc WHERE oid = 'public.delete_my_account(text)'::regprocedure), 'auth.users', 'delete')
  UNION ALL
  SELECT 'deleting a sign-in removes the profile with it',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND confrelid = 'auth.users'::regclass AND confdeltype = 'c')
  UNION ALL
  SELECT 'client bookings stay with the business',
         EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
                  WHERE c.conrelid = 'public.appointments'::regclass AND a.attname = 'client_id' AND c.confdeltype = 'n')
) c;
