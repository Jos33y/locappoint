-- Removes the old, unused public.notifications table. Everything now goes through
-- public.notification_queue (emails) and public.inbox (the bell).
-- It stops without dropping anything if the table has rows or a database function still mentions it.

BEGIN;

DO $$
DECLARE
  v_users text;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE NOTICE 'public.notifications is already gone';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications) THEN
    RAISE EXCEPTION 'public.notifications has rows. Nothing was dropped.';
  END IF;
  SELECT string_agg(n.nspname || '.' || p.proname, ', ') INTO v_users
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
     AND p.prosrc ~* '\mpublic\.notifications\M|\mfrom\s+notifications\M|\minto\s+notifications\M';
  IF v_users IS NOT NULL THEN
    RAISE EXCEPTION 'These functions still use public.notifications: %. Nothing was dropped.', v_users;
  END IF;
  DROP TABLE public.notifications;
  RAISE NOTICE 'public.notifications dropped';
END;
$$;

COMMIT;
