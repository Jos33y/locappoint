BEGIN;

-- Businesses created by the old form between part A and the code deploy.
UPDATE public.businesses SET launched_at = COALESCE(created_at, now()) WHERE launched_at IS NULL AND is_active = true;


-- Nothing goes live, or comes back from a pause, without a service and opening hours.

CREATE OR REPLACE FUNCTION public.businesses_launch_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active IS TRUE AND (TG_OP = 'INSERT' OR OLD.is_active IS DISTINCT FROM true) THEN
    IF NOT EXISTS (SELECT 1 FROM public.services s WHERE s.business_id = NEW.id AND s.is_active = true) THEN
      RAISE EXCEPTION 'Add at least one service before you go live' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.availability a WHERE a.business_id = NEW.id AND a.is_active = true) THEN
      RAISE EXCEPTION 'Set your opening hours before you go live' USING ERRCODE = '22023';
    END IF;
    NEW.launched_at := COALESCE(NEW.launched_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_launch_guard ON public.businesses;
CREATE TRIGGER businesses_launch_guard
  BEFORE INSERT OR UPDATE OF is_active ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_launch_guard();

REVOKE EXECUTE ON FUNCTION public.businesses_launch_guard() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
