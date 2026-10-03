BEGIN;

DROP POLICY IF EXISTS appointments_client_insert ON public.appointments;

DROP POLICY IF EXISTS "Allow anon read sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow anonymous session insert" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Allow anonymous session update" ON public.analytics_sessions;

NOTIFY pgrst, 'reload schema';

COMMIT;
