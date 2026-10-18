-- search1: the numbers the empty search screens say out loud (doc 35, design pass of 18 October).
-- "Nobody near Abeokuta": how many searches there found nobody this month, and how many people are
-- waiting to be told. A visitor from a country we are not in: how many from there are waiting.
-- Counts only, never a query, a contact or a person. Under 3 is returned as 0, so a count can never
-- point at one person's search. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_place_interest(p_market text DEFAULT NULL, p_zone text DEFAULT NULL, p_country text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_zone text := lower(nullif(btrim(coalesce(p_zone, '')), ''));
  v_market text := lower(nullif(btrim(coalesce(p_market, '')), ''));
  v_country text := upper(nullif(btrim(coalesce(p_country, '')), ''));
  v_missed integer := 0;
  v_waiting integer := 0;
BEGIN
  IF v_zone IS NULL AND (v_country IS NULL OR v_country !~ '^[A-Z]{2}$') THEN
    RETURN jsonb_build_object('missed', 0, 'waiting', 0);
  END IF;
  IF v_zone IS NOT NULL THEN
    -- A place inside a country we serve: searches there in 30 days that showed nothing at all.
    SELECT count(*) INTO v_missed FROM public.search_log l
     WHERE l.created_at > now() - interval '30 days'
       AND lower(l.zone) = v_zone
       AND (v_market IS NULL OR l.market = v_market)
       AND l.options = 0 AND l.later = 0;
    SELECT count(*) INTO v_waiting FROM public.search_wish w
     WHERE w.told_at IS NULL AND lower(w.zone) = v_zone
       AND (v_market IS NULL OR w.market = v_market);
  ELSE
    -- A country we are not in: searches from there in 30 days, and people asking for it.
    SELECT count(*) INTO v_missed FROM public.search_log l
     WHERE l.created_at > now() - interval '30 days' AND l.origin_country = v_country;
    SELECT count(*) INTO v_waiting FROM public.search_wish w
     WHERE w.told_at IS NULL AND w.target_country = v_country AND w.market IS NULL;
  END IF;
  RETURN jsonb_build_object(
    'missed', CASE WHEN v_missed >= 3 THEN v_missed ELSE 0 END,
    'waiting', CASE WHEN v_waiting >= 3 THEN v_waiting ELSE 0 END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_place_interest(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_place_interest(text, text, text) TO anon, authenticated, service_role;

COMMIT;
