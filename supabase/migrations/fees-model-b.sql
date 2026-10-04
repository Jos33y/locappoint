-- Fees, model B (4 October 2026, Joseey; proposal to Vincent, market_rules.confirmed stays false).
-- With direct charges Stripe takes its card fee from the business itself, so Locappoint's business
-- fee drops to 1.5% with no fixed part, plus 23% VAT. The client fee is unchanged: 2% of the price,
-- minimum EUR 0.49, maximum EUR 4.90, VAT included. The VAT on the business fee now travels in the
-- application fee, so Locappoint receives what it owes. Lagos is untouched (paused). Safe to run again.

BEGIN;

ALTER TABLE public.market_rules ADD COLUMN IF NOT EXISTS business_fee_vat_pct numeric NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_rules_business_fee_vat') THEN
    ALTER TABLE public.market_rules ADD CONSTRAINT market_rules_business_fee_vat CHECK (business_fee_vat_pct BETWEEN 0 AND 30);
  END IF;
END;
$$;

UPDATE public.market_rules
   SET client_fee_pct = 2, client_fee_min = 0.49, client_fee_max = 4.90,
       business_fee_pct = 1.5, business_fee_fixed = 0, business_fee_vat_pct = 23,
       updated_at = now()
 WHERE market IN ('porto', 'lisbon');

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
    round(least(greatest(coalesce(p_price, 0) * r.client_fee_pct / 100, r.client_fee_min), r.client_fee_max),
          CASE WHEN m.currency = 'NGN' THEN 0 ELSE 2 END),
    -- The business fee with its VAT, so the application fee carries the VAT Locappoint owes on it.
    CASE WHEN r.first_month_free AND p.ready_at > now() - interval '30 days' THEN 0
         ELSE round((coalesce(p_price, 0) * r.business_fee_pct / 100 + r.business_fee_fixed) * (1 + r.business_fee_vat_pct / 100),
                    CASE WHEN m.currency = 'NGN' THEN 0 ELSE 2 END)
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

-- The weekly statement shows the business fee before VAT, from the same numbers as checkout.
CREATE OR REPLACE FUNCTION public.statement_fee(p_price numeric, p_country text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_country IS DISTINCT FROM 'PT' THEN NULL
    WHEN coalesce(p_price, 0) <= 0 THEN 0
    ELSE (SELECT round(p_price * r.business_fee_pct / 100 + r.business_fee_fixed, 2) FROM public.market_rules r WHERE r.market = 'porto')
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.statement_fee(numeric, text) FROM PUBLIC, anon, authenticated;

COMMIT;
