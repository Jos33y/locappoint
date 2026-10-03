-- Booking-page counts for Insights: how many people open a business page, start a booking and pick a time,
-- by day, where they came from and phone or computer. Counts only: no cookies, nothing stored on the
-- visitor's device, no IP address, no user id. Finished bookings are counted from appointments.
-- Safe to run again.

BEGIN;

CREATE TABLE IF NOT EXISTS public.page_stats (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day date NOT NULL,
  event text NOT NULL CHECK (event IN ('view', 'start', 'time')),
  source text NOT NULL CHECK (source IN ('direct', 'locappoint', 'whatsapp', 'instagram', 'facebook', 'google', 'qr', 'email', 'other')),
  device text NOT NULL CHECK (device IN ('mobile', 'desktop')),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, day, event, source, device)
);

-- Read through business_insights only. App users cannot read or write it directly.
ALTER TABLE public.page_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_stats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_page_event(p_business_id uuid, p_event text, p_source text, p_device text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_day date;
BEGIN
  IF p_event NOT IN ('view', 'start', 'time') THEN
    RETURN;
  END IF;
  -- The business looking at its own page is not a visitor.
  IF auth.uid() IS NOT NULL AND public.is_business_member(p_business_id) THEN
    RETURN;
  END IF;

  SELECT (now() AT TIME ZONE b.timezone)::date INTO v_day
    FROM public.businesses b
   WHERE b.id = p_business_id AND b.is_active = true;
  IF v_day IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.page_stats (business_id, day, event, source, device, count)
  VALUES (
    p_business_id, v_day, p_event,
    CASE WHEN p_source IN ('direct', 'locappoint', 'whatsapp', 'instagram', 'facebook', 'google', 'qr', 'email', 'other') THEN p_source ELSE 'other' END,
    CASE WHEN p_device = 'mobile' THEN 'mobile' ELSE 'desktop' END,
    1
  )
  ON CONFLICT (business_id, day, event, source, device) DO UPDATE SET count = public.page_stats.count + 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.track_page_event(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_page_event(uuid, text, text, text) TO anon, authenticated;

COMMIT;
