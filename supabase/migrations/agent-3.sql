-- The WhatsApp agent, round 3: "when are you free?" in one step. The next days with free times for
-- one service, from a date (today by default), up to 5 days within the next 3 weeks, with up to 12
-- times spread across each day. The same slot engine as the website. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.wa_free_days(p_business uuid, p_service uuid, p_from date DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('date', y.d, 'times', y.t) ORDER BY y.d), '[]'::jsonb) FROM (
    SELECT x.d, x.t FROM (
      SELECT g.d::date AS d,
             (SELECT jsonb_agg(z.v ORDER BY z.v) FILTER (WHERE (z.n - 1) % ceil(z.c / 12.0)::int = 0) FROM (
                SELECT u.v, row_number() OVER (ORDER BY u.v) AS n, count(*) OVER () AS c FROM (
                  SELECT DISTINCT to_char(s.slot_time, 'HH24:MI') AS v
                    FROM public.get_available_slots(p_business, p_service, g.d::date, NULL, NULL, NULL, greatest(coalesce(p_people, 1), 1)) s) u) z) AS t
        FROM public.businesses b
        CROSS JOIN LATERAL generate_series(
               greatest(coalesce(p_from, (now() AT TIME ZONE b.timezone)::date), (now() AT TIME ZONE b.timezone)::date)::timestamp,
               (now() AT TIME ZONE b.timezone)::date + 20, interval '1 day') AS g(d)
       WHERE b.id = p_business AND b.is_active AND b.suspended_at IS NULL
         AND EXISTS (SELECT 1 FROM public.services s2 WHERE s2.id = p_service AND s2.business_id = b.id AND s2.is_active)) x
     WHERE x.t IS NOT NULL
     ORDER BY x.d
     LIMIT 5) y
$$;
REVOKE EXECUTE ON FUNCTION public.wa_free_days(uuid, uuid, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_free_days(uuid, uuid, date, integer) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
