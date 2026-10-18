-- demand2: admin Demand, redesigned (design pass, 18 October). Same answer as before, every key kept,
-- plus what the new screen needs:
--   found      searches that showed something to book
--   not_then   someone offers it and has free times, just not when asked (and the words, by city)
--   countries  how many countries searched
--   waiting    "Tell me when" contacts not told yet, and on how many places
--   places     where nobody offers what was asked, by city and area: the misses, the words asked most,
--              and how many wait there. The list to go and sign businesses up from.
--   abroad     searches from countries we are not in, and the city they searched most
-- admin_demand_place: one place opened: every word asked there and the contacts waiting, to tell them.
-- Admins only. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_demand(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH s AS (
      -- miss: nobody offers it. no_time: someone does, nobody is free in 3 weeks. not_then: free, but
      -- not when asked. Older searches (no offered count) are counted, never sorted.
      SELECT *, coalesce(offered = 0, false) AS miss,
             coalesce(offered > 0 AND options = 0 AND later = 0, false) AS no_time,
             coalesce(offered > 0 AND options = 0 AND later > 0, false) AS not_then
        FROM public.search_log WHERE created_at >= v_since
    ),
    w AS (SELECT * FROM public.search_wish WHERE told_at IS NULL)
    SELECT jsonb_build_object(
      'days', v_days,
      'searches', (SELECT count(*) FROM s),
      'found', (SELECT count(*) FILTER (WHERE options > 0 OR later > 0) FROM s),
      'misses', (SELECT count(*) FILTER (WHERE miss) FROM s),
      'full', (SELECT count(*) FILTER (WHERE no_time) FROM s),
      'not_then', (SELECT count(*) FILTER (WHERE not_then) FROM s),
      'people', (SELECT count(DISTINCT user_id) FROM s),
      'countries', (SELECT count(DISTINCT origin_country) FROM s WHERE origin_country IS NOT NULL),
      'wishes', (SELECT count(*) FROM public.search_wish x WHERE x.created_at >= v_since),
      'waiting', (SELECT count(*) FROM w),
      'waiting_places', (SELECT count(DISTINCT coalesce(lower(w.market) || '|' || lower(coalesce(w.zone, '')), 'country|' || w.target_country)) FROM w),
      'by_channel', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT channel, count(*) AS searches, count(*) FILTER (WHERE miss) AS misses FROM s GROUP BY channel) x), '[]'::jsonb),
      'by_origin', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT origin_country AS country, count(*) AS searches, count(*) FILTER (WHERE miss) AS misses
            FROM s GROUP BY origin_country ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'by_place', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT market, zone, count(*) AS searches, count(*) FILTER (WHERE miss) AS misses
            FROM s GROUP BY market, zone ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'missed', coalesce((SELECT jsonb_agg(x ORDER BY x.times DESC) FROM (
          SELECT lower(query) AS query, market, count(*) AS times
            FROM s WHERE miss GROUP BY lower(query), market ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'booked_out', coalesce((SELECT jsonb_agg(x ORDER BY x.times DESC) FROM (
          SELECT lower(query) AS query, market, count(*) AS times
            FROM s WHERE no_time GROUP BY lower(query), market ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'not_then_list', coalesce((SELECT jsonb_agg(x ORDER BY x.times DESC) FROM (
          SELECT lower(query) AS query, market, count(*) AS times
            FROM s WHERE not_then GROUP BY lower(query), market ORDER BY count(*) DESC LIMIT 20) x), '[]'::jsonb),
      'places', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT p.market, p.zone, p.searches,
                 (SELECT jsonb_agg(q ORDER BY q.times DESC, q.query) FROM (
                     SELECT lower(s2.query) AS query, count(*) AS times FROM s s2
                      WHERE s2.miss AND s2.market IS NOT DISTINCT FROM p.market AND lower(s2.zone) IS NOT DISTINCT FROM p.lz
                      GROUP BY lower(s2.query) ORDER BY count(*) DESC, lower(s2.query) LIMIT 3) q) AS asked,
                 (SELECT count(*) FROM w WHERE w.market IS NOT DISTINCT FROM p.market AND lower(w.zone) IS NOT DISTINCT FROM p.lz) AS waiting
            FROM (SELECT market, lower(zone) AS lz, min(zone) AS zone, count(*) AS searches
                    FROM s WHERE miss GROUP BY market, lower(zone) ORDER BY count(*) DESC LIMIT 20) p) x), '[]'::jsonb),
      'abroad', coalesce((SELECT jsonb_agg(x ORDER BY x.searches DESC) FROM (
          SELECT o.origin_country AS country, count(*) AS searches,
                 (SELECT s3.market FROM s s3 WHERE s3.origin_country = o.origin_country AND s3.market IS NOT NULL
                   GROUP BY s3.market ORDER BY count(*) DESC, s3.market LIMIT 1) AS top_market
            FROM s o WHERE o.origin_country IS NOT NULL AND o.origin_country NOT IN ('NG', 'PT')
           GROUP BY o.origin_country ORDER BY count(*) DESC LIMIT 12) x), '[]'::jsonb),
      'latest_wishes', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
          SELECT y.created_at, y.query, y.market, y.zone, y.target_country, y.origin_country, y.email, y.phone, y.told_at
            FROM public.search_wish y ORDER BY y.created_at DESC LIMIT 50) x), '[]'::jsonb)
    )
  );
END;
$$;

-- One place opened in Demand: every word asked there that found nobody, and who waits to be told.
-- p_zone null is the whole city with no area named.
CREATE OR REPLACE FUNCTION public.admin_demand_place(p_market text, p_zone text DEFAULT NULL, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  v_zone text := lower(nullif(btrim(coalesce(p_zone, '')), ''));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'queries', coalesce((SELECT jsonb_agg(x ORDER BY x.times DESC, x.query) FROM (
        SELECT lower(l.query) AS query, count(*) AS times
          FROM public.search_log l
         WHERE l.created_at >= v_since AND coalesce(l.offered = 0, false)
           AND l.market IS NOT DISTINCT FROM p_market AND lower(l.zone) IS NOT DISTINCT FROM v_zone
         GROUP BY lower(l.query) ORDER BY count(*) DESC, lower(l.query) LIMIT 30) x), '[]'::jsonb),
    'busiest', (SELECT to_char(l.created_at AT TIME ZONE coalesce((SELECT m.timezone FROM public.markets m WHERE m.code = p_market), 'UTC'), 'FMDay')
          FROM public.search_log l
         WHERE l.created_at >= v_since AND coalesce(l.offered = 0, false)
           AND l.market IS NOT DISTINCT FROM p_market AND lower(l.zone) IS NOT DISTINCT FROM v_zone
         GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1),
    'waiting', coalesce((SELECT jsonb_agg(x ORDER BY x.created_at DESC) FROM (
        SELECT w.created_at, w.query, w.email, w.phone
          FROM public.search_wish w
         WHERE w.told_at IS NULL AND w.market IS NOT DISTINCT FROM p_market AND lower(w.zone) IS NOT DISTINCT FROM v_zone
         ORDER BY w.created_at DESC LIMIT 200) x), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_demand(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_demand(integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_demand_place(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_demand_place(text, text, integer) TO authenticated;

COMMIT;
