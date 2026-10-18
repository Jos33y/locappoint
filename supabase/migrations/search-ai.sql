-- R1b (doc 36): the AI step for search. When the words are more than the rules can read, a small model
-- turns the sentence into the same search fields; the engine then finds real free times. Its own daily
-- cap (USD 3), separate from the WhatsApp agent's, and a brake per visitor. Only the "understand" Edge
-- Function (service role) calls these. Safe to run again.

BEGIN;

CREATE TABLE IF NOT EXISTS public.search_ai_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_on boolean NOT NULL DEFAULT true,
  cap_usd numeric NOT NULL DEFAULT 3 CHECK (cap_usd >= 0)
);
INSERT INTO public.search_ai_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.search_ai_days (
  day date PRIMARY KEY,
  calls integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.search_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_ai_days ENABLE ROW LEVEL SECURITY;
-- No policies: only the functions below read or write them.

-- May this visitor use the AI now? On, under today's cap, and under 20 calls in 10 minutes per visitor.
CREATE OR REPLACE FUNCTION public.search_ai_allow(p_who text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.search_ai_config;
  v_spent numeric := coalesce((SELECT d.cost_usd FROM public.search_ai_days d WHERE d.day = current_date), 0);
BEGIN
  SELECT * INTO c FROM public.search_ai_config WHERE id = 1;
  IF c IS NULL OR NOT c.is_on THEN RETURN jsonb_build_object('ok', false, 'reason', 'off'); END IF;
  IF v_spent >= c.cap_usd THEN RETURN jsonb_build_object('ok', false, 'reason', 'budget'); END IF;
  IF NOT public.rate_ok('searchai:' || coalesce(NULLIF(btrim(p_who), ''), 'unknown'), 20, 600) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'busy');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_ai_spent(p_input integer, p_output integer, p_cost numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.search_ai_days AS d (day, calls, input_tokens, output_tokens, cost_usd)
  VALUES (current_date, 1, greatest(p_input, 0), greatest(p_output, 0), greatest(p_cost, 0))
  ON CONFLICT (day) DO UPDATE
    SET calls = d.calls + 1, input_tokens = d.input_tokens + EXCLUDED.input_tokens,
        output_tokens = d.output_tokens + EXCLUDED.output_tokens, cost_usd = d.cost_usd + EXCLUDED.cost_usd;
$$;

-- What the model may answer with in a city: the services live businesses there really offer, the
-- categories and their words, and the city's time zone for "Friday" and "tomorrow".
CREATE OR REPLACE FUNCTION public.search_ai_context(p_market text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'timezone', (SELECT m.timezone FROM public.markets m WHERE m.code = p_market),
    'services', coalesce((SELECT jsonb_agg(x.name ORDER BY x.name) FROM (
        SELECT DISTINCT s.service_name AS name
          FROM public.services s JOIN public.businesses b ON b.id = s.business_id
         WHERE b.is_active = true AND b.market = p_market AND s.is_active = true AND coalesce(b.is_demo, false) = false
         LIMIT 300) x), '[]'::jsonb),
    'categories', coalesce((SELECT jsonb_agg(jsonb_build_object('key', c.key, 'words', left(c.words, 160)) ORDER BY c.key) FROM public.engine_categories c), '[]'::jsonb)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.search_ai_allow(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_ai_allow(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.search_ai_spent(integer, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_ai_spent(integer, integer, numeric) TO service_role;
REVOKE EXECUTE ON FUNCTION public.search_ai_context(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_ai_context(text) TO service_role;

COMMIT;
