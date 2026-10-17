-- The client's service fee in Lagos, by price band (decided 17 October 2026, decision log 18b).
-- Under NGN 5,000 the fee is NGN 100; from NGN 5,000 to under NGN 15,000 it is NGN 200; from
-- NGN 15,000 it is 1.5% of the price, capped at NGN 2,000. The bands join without a jump: 1.5% of
-- NGN 15,000 is NGN 225.
--
-- Bands are a column on market_rules, read by one helper. A market without bands (Porto, Lisbon)
-- keeps the old rule exactly: a percentage, at least the minimum, at most the maximum.
-- Changing the numbers later is one UPDATE on market_rules. Safe to run again.
-- Needs pay-at-booking.sql (payment_terms).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.market_rules') IS NULL OR to_regprocedure('public.payment_terms(uuid, numeric)') IS NULL THEN
    RAISE EXCEPTION 'Run pay-at-booking.sql first';
  END IF;
END;
$$;

-- 1. Bands: a list of {"below": price, "fee": amount}, lowest first. A price under a band's "below"
-- pays that band's flat fee; a price at or above the last band pays the percentage rule.
ALTER TABLE public.market_rules ADD COLUMN IF NOT EXISTS client_fee_bands jsonb;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_rules_client_fee_bands') THEN
    ALTER TABLE public.market_rules ADD CONSTRAINT market_rules_client_fee_bands
      CHECK (client_fee_bands IS NULL OR jsonb_typeof(client_fee_bands) = 'array');
  END IF;
END;
$$;

UPDATE public.market_rules
   SET client_fee_bands = '[{"below": 5000, "fee": 100}, {"below": 15000, "fee": 200}]'::jsonb,
       client_fee_pct = 1.5,
       client_fee_min = 200,
       client_fee_max = 2000
 WHERE market = 'lagos';

-- 2. The client fee for one price. Whole naira, euro cents.
CREATE OR REPLACE FUNCTION public.client_fee_of(p_bands jsonb, p_pct numeric, p_min numeric, p_max numeric, p_price numeric, p_currency text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT round(
    coalesce(
      (SELECT (b->>'fee')::numeric
         FROM jsonb_array_elements(coalesce(p_bands, '[]'::jsonb)) AS x(b)
        WHERE coalesce(p_price, 0) < (b->>'below')::numeric
        ORDER BY (b->>'below')::numeric
        LIMIT 1),
      least(greatest(coalesce(p_price, 0) * p_pct / 100, p_min), p_max)
    ),
    CASE WHEN p_currency = 'NGN' THEN 0 ELSE 2 END)
$$;

REVOKE EXECUTE ON FUNCTION public.client_fee_of(jsonb, numeric, numeric, numeric, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_fee_of(jsonb, numeric, numeric, numeric, numeric, text) TO service_role;

-- 3. payment_terms as in pay-at-booking.sql, with the client fee from the helper.
CREATE OR REPLACE FUNCTION public.payment_terms(p_business_id uuid, p_price numeric)
RETURNS TABLE (online boolean, provider text, currency text, client_fee numeric, business_fee numeric,
               hold_minutes integer, methods text[], free_hours integer, keep_pct numeric, no_show_keep_pct numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    coalesce(p.status = 'active' AND p.account_last4 IS NOT NULL AND p.provider = m.payment_provider AND coalesce(p_price, 0) > 0, false),
    m.payment_provider,
    m.currency,
    public.client_fee_of(r.client_fee_bands, r.client_fee_pct, r.client_fee_min, r.client_fee_max, p_price, m.currency),
    CASE WHEN r.first_month_free AND p.ready_at > now() - interval '30 days' THEN 0
         ELSE round(coalesce(p_price, 0) * r.business_fee_pct / 100 + r.business_fee_fixed, CASE WHEN m.currency = 'NGN' THEN 0 ELSE 2 END)
    END,
    -- Stripe's checkout page lives 31 minutes and a transfer account 30, so the hold outlasts both.
    greatest(r.hold_minutes_transfer, 35),
    ARRAY(SELECT x FROM unnest(r.methods) x WHERE x <> 'cash'),
    r.free_cancel_hours,
    r.late_cancel_fee_max_pct,
    r.no_show_fee_pct
  FROM public.businesses b
  JOIN public.markets m ON m.code = b.market
  JOIN public.market_rules r ON r.market = m.code
  LEFT JOIN public.business_payouts p ON p.business_id = b.id
  WHERE b.id = p_business_id;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_terms(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_terms(uuid, numeric) TO service_role;

COMMIT;

-- Check after running:
-- SELECT p, public.client_fee_of(r.client_fee_bands, r.client_fee_pct, r.client_fee_min, r.client_fee_max, p, 'NGN')
--   FROM public.market_rules r, unnest(ARRAY[2000, 4999, 5000, 10000, 14999, 15000, 20000, 50000, 150000]) p
--  WHERE r.market = 'lagos';
-- Expect 100, 100, 200, 200, 200, 225, 300, 750, 2000.
