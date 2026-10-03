-- When someone changes their name, it follows them into what is still ahead:
-- their upcoming bookings (only those made under their old name, so a booking made
-- for someone else keeps that person's name) and their own team-member name.
-- Past bookings and sent notifications keep the name they had at the time.
-- Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_person_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new text := NULLIF(trim(NEW.full_name), '');
  v_old text := NULLIF(trim(OLD.full_name), '');
BEGIN
  IF v_new IS NULL OR v_new IS NOT DISTINCT FROM v_old THEN
    RETURN NEW;
  END IF;

  -- The client update guard only lets clients cancel; this write is ours, not theirs.
  PERFORM set_config('locappoint.trusted_write', 'on', true);

  UPDATE public.appointments a
     SET client_name = v_new
    FROM public.businesses b
   WHERE b.id = a.business_id
     AND a.client_id = NEW.id
     AND a.status IN ('pending', 'confirmed')
     AND a.appointment_date + a.appointment_time > now() AT TIME ZONE b.timezone
     AND (v_old IS NULL OR lower(trim(a.client_name)) = lower(v_old));

  UPDATE public.business_members m
     SET display_name = v_new
   WHERE m.user_id = NEW.id
     AND (NULLIF(trim(m.display_name), '') IS NULL OR v_old IS NULL OR lower(trim(m.display_name)) = lower(v_old));

  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_person_name() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_person_name ON public.users;
CREATE TRIGGER sync_person_name
  AFTER UPDATE OF full_name ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_person_name();

COMMIT;
