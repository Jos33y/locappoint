-- geo4: the WhatsApp agent searches a whole country (doc 35). wa_search takes ng or pt (city codes
-- still work) and where in it the person asked (p_place): a state or district keeps the search inside
-- it, a town or area puts businesses there first, as on the website. A visit area (p_zone) can be any
-- area of the country: a Lagos area, a Nigerian state, a Portuguese municipality. Safe to run again.

BEGIN;

DROP FUNCTION IF EXISTS public.wa_search(text, text, date[], text, time without time zone, integer, text);

CREATE OR REPLACE FUNCTION public.wa_search(p_market text, p_query text, p_dates date[] DEFAULT NULL::date[], p_window text DEFAULT 'any'::text, p_at time without time zone DEFAULT NULL::time without time zone, p_people integer DEFAULT 1, p_zone text DEFAULT NULL::text, p_place text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r jsonb;
  v_market text := lower(trim(coalesce(p_market, '')));
  v_zone text := NULLIF(btrim(coalesce(p_zone, '')), '');
  v_place text := left(NULLIF(btrim(coalesce(p_place, '')), ''), 60);
BEGIN
  IF v_zone IS NOT NULL THEN
    -- Any area of the country: its cities' areas and its own (every state, every municipality).
    SELECT z.name INTO v_zone FROM public.market_zones z
     WHERE (z.market = v_market OR (public.market_country(v_market) IS NOT NULL AND public.market_country(z.market) = public.market_country(v_market)))
       AND lower(z.name) = lower(v_zone)
     ORDER BY (z.market = v_market) DESC
     LIMIT 1;
    IF v_zone IS NULL THEN
      RAISE EXCEPTION 'That area is not on the list. Ask for their town, state or district.' USING ERRCODE = '22023';
    END IF;
  END IF;
  r := public.engine_match(v_market, p_query, CASE WHEN v_zone IS NOT NULL THEN 'at_client' END, p_dates,
                           CASE WHEN p_window IN ('morning', 'afternoon', 'evening') THEN p_window ELSE 'any' END,
                           p_at, greatest(coalesce(p_people, 1), 1), NULL, NULL, coalesce(v_zone, v_place));
  IF v_zone IS NOT NULL THEN
    RETURN r;
  END IF;
  RETURN r || jsonb_build_object(
    'options', coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(r->'options') o WHERE o->>'mode' IS DISTINCT FROM 'at_client'), '[]'::jsonb),
    'later', coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(r->'later') o WHERE o->>'mode' IS DISTINCT FROM 'at_client'), '[]'::jsonb),
    'place', v_place);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wa_search(text, text, date[], text, time without time zone, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_search(text, text, date[], text, time without time zone, integer, text, text) TO service_role;

COMMIT;
