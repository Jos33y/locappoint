-- The WhatsApp agent, round 5: a group booking shows its real length. wa_business now gives, for
-- services that take groups, the minutes each extra person adds (extra_person_minutes, or the service's
-- own length when empty), the same rule get_available_slots books with. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.wa_business(p_business uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'business_id', b.id, 'name', b.business_name, 'slug', b.slug, 'category', b.category,
    'address', b.address, 'area', b.neighbourhood, 'city', b.city, 'market', b.market, 'timezone', b.timezone,
    'phone', b.phone, 'whatsapp', b.whatsapp, 'description', left(b.description, 400),
    'confirms_automatically', b.auto_confirm, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes, 'currency', b.currency,
    'today', (now() AT TIME ZONE b.timezone)::date, 'now', to_char(now() AT TIME ZONE b.timezone, 'HH24:MI'),
    'hours', coalesce((
      SELECT jsonb_agg(jsonb_build_object('day', d.dname, 'open', d.ranges) ORDER BY d.dow)
        FROM (SELECT h.day_of_week AS dow,
                     (ARRAY['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[h.day_of_week + 1] AS dname,
                     string_agg(DISTINCT to_char(h.start_time, 'HH24:MI') || '-' || to_char(h.end_time, 'HH24:MI'), ', ') AS ranges
                FROM public.availability h
               WHERE h.business_id = b.id AND h.is_active
               GROUP BY h.day_of_week) d), '[]'::jsonb),
    'services', coalesce((
      SELECT jsonb_agg(jsonb_build_object('service_id', s.id, 'name', s.service_name, 'minutes', s.duration_minutes,
               'price', s.price, 'price_per', s.price_per, 'max_people', s.max_people,
               'extra_person_minutes', CASE WHEN s.max_people > 1 THEN coalesce(s.extra_person_minutes, s.duration_minutes) END, 'ways', s.modes,
               'about', left(s.description, 200)) ORDER BY s.sort_order, s.service_name)
        FROM public.services s WHERE s.business_id = b.id AND s.is_active AND NOT s.is_addon), '[]'::jsonb))
    FROM public.businesses b
   WHERE b.id = p_business AND b.is_active AND b.suspended_at IS NULL
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
