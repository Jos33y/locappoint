BEGIN;

DROP POLICY IF EXISTS "Allow anon read for admin" ON public.waitlist;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.waitlist;
DROP POLICY IF EXISTS "Allow anonymous waitlist insert" ON public.waitlist;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.waitlist;
DROP POLICY IF EXISTS "Allow authenticated waitlist insert" ON public.waitlist;
DROP POLICY IF EXISTS "Allow public inserts" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_anon_update" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_authenticated_update" ON public.waitlist;

NOTIFY pgrst, 'reload schema';

COMMIT;
