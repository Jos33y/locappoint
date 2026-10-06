-- Run after client-blocks.sql. Every row should say true.
SELECT 'blocks are kept with their reason' AS check_name, to_regclass('public.client_blocks') IS NOT NULL AS ok
UNION ALL
SELECT 'nobody reads or writes blocks directly', NOT has_table_privilege('authenticated', 'public.client_blocks', 'SELECT') AND NOT has_table_privilege('anon', 'public.client_blocks', 'INSERT')
UNION ALL
SELECT 'every booking is checked', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_block_guard')
UNION ALL
SELECT 'the same phone in any format', public.block_phone('+351 912 345 678') = public.block_phone('912345678')
UNION ALL
SELECT 'owners block, guests cannot', has_function_privilege('authenticated', 'public.block_client(uuid, text, text)', 'EXECUTE') AND NOT has_function_privilege('anon', 'public.block_client(uuid, text, text)', 'EXECUTE')
UNION ALL
SELECT 'the review queue is closed to guests', NOT has_function_privilege('anon', 'public.admin_blocks(text, integer, integer)', 'EXECUTE');
