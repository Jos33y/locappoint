-- "Did the client make this change?" must be true or false, never unknown. For a guest booking
-- (no client account) it came back NULL whenever this connection had never set locappoint.actor,
-- and the notifier then skipped the client's email in silence: confirmations, declines and moves
-- by the business went unsent for some guest bookings, from the dashboard and from WhatsApp.
-- Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.acting_as_client(p_business_id uuid, p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(current_setting('locappoint.actor', true), '') = 'client'
      OR coalesce(auth.uid() IS NOT NULL AND auth.uid() = p_client_id AND NOT public.is_business_member(p_business_id), false);
$$;
REVOKE EXECUTE ON FUNCTION public.acting_as_client(uuid, uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
