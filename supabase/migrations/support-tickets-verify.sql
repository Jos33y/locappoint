-- 1. Policies in place: insert, read and admin update.
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'support_tickets' ORDER BY cmd;

-- 2. As anon: no access. Must fail with permission denied.
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) FROM public.support_tickets;
ROLLBACK;
