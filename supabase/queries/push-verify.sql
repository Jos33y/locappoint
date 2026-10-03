-- Push notifications: every row should say ok.
SELECT check_name, CASE WHEN passed THEN 'ok' ELSE 'FAILED' END AS result FROM (
  SELECT 'phones are stored, and nobody can read them directly' AS check_name,
         to_regclass('public.push_tokens') IS NOT NULL
         AND NOT has_table_privilege('authenticated', 'public.push_tokens', 'select')
         AND NOT has_table_privilege('anon', 'public.push_tokens', 'select') AS passed
  UNION ALL
  SELECT 'signed-in people can add, forget and switch off their own',
         has_function_privilege('authenticated', 'public.register_push_token(text, text, text)', 'execute')
         AND has_function_privilege('authenticated', 'public.forget_push_token(text)', 'execute')
         AND has_function_privilege('authenticated', 'public.set_push_enabled(boolean)', 'execute')
  UNION ALL
  SELECT 'nobody signed out can',
         NOT has_function_privilege('anon', 'public.register_push_token(text, text, text)', 'execute')
         AND NOT has_function_privilege('anon', 'public.forget_push_token(text)', 'execute')
  UNION ALL
  SELECT 'push is on for everyone until they switch it off',
         EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'push_enabled' AND column_default = 'true')
  UNION ALL
  SELECT 'the queue accepts push',
         pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'notification_queue_channel_check')) LIKE '%push%'
  UNION ALL
  SELECT 'bell items turn into pushes',
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'queue_push_from_inbox' AND tgrelid = 'public.inbox'::regclass AND NOT tgisinternal)
  UNION ALL
  SELECT 'a deleted account takes its phones with it',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.push_tokens'::regclass AND confrelid = 'public.users'::regclass AND confdeltype = 'c')
) c;
