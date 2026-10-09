-- The WhatsApp agent, round 2: the live businesses are handed to the agent with every message, so
-- "who can review my website?" or "what barbers are there?" finds them without guessing a search.
-- Up to 30 live businesses, demo pages left out, with what each offers. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.wa_directory()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'city', x->>'name'), '[]'::jsonb) FROM (
    SELECT jsonb_build_object(
             'name', b.business_name, 'slug', b.slug, 'city', b.city,
             'category', concat_ws(', ', b.category, NULLIF(b.category_detail, '')),
             'services', coalesce((SELECT string_agg(s.service_name, ', ' ORDER BY s.sort_order, s.service_name)
                                     FROM (SELECT * FROM public.services s2
                                            WHERE s2.business_id = b.id AND s2.is_active AND NOT s2.is_addon
                                            ORDER BY s2.sort_order, s2.service_name LIMIT 8) s), '')) AS x
      FROM public.businesses b
     WHERE b.is_active AND b.suspended_at IS NULL AND NOT b.is_demo
     ORDER BY b.launched_at DESC NULLS LAST
     LIMIT 30) y
$$;
REVOKE EXECUTE ON FUNCTION public.wa_directory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_directory() TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
