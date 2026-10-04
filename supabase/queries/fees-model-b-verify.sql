-- Run after fees-model-b.sql. Every row should say true.
SELECT 'Portugal: 2% client fee, EUR 0.49 to EUR 4.90' AS check_name,
       bool_and(client_fee_pct = 2 AND client_fee_min = 0.49 AND client_fee_max = 4.90) AS ok
  FROM public.market_rules WHERE market IN ('porto', 'lisbon')
UNION ALL
SELECT 'Portugal: 1.5% business fee, no fixed part, 23% VAT',
       bool_and(business_fee_pct = 1.5 AND business_fee_fixed = 0 AND business_fee_vat_pct = 23)
  FROM public.market_rules WHERE market IN ('porto', 'lisbon')
UNION ALL
SELECT 'still a proposal until Vincent confirms',
       bool_and(NOT confirmed) FROM public.market_rules WHERE market IN ('porto', 'lisbon')
UNION ALL
SELECT 'the statement shows EUR 0.30 on a EUR 20 visit (before VAT)',
       public.statement_fee(20, 'PT') = 0.30
UNION ALL
SELECT 'checkout adds the VAT: EUR 0.37 on a EUR 20 booking after the free month',
       (SELECT business_fee FROM public.payment_terms(
          (SELECT b.id FROM public.businesses b JOIN public.business_payouts p ON p.business_id = b.id
            WHERE b.market IN ('porto', 'lisbon') AND p.ready_at < now() - interval '30 days' LIMIT 1), 20)) = 0.37
       OR NOT EXISTS (SELECT 1 FROM public.businesses b JOIN public.business_payouts p ON p.business_id = b.id
                       WHERE b.market IN ('porto', 'lisbon') AND p.ready_at < now() - interval '30 days')
UNION ALL
SELECT 'the client fee on a EUR 20 booking is EUR 0.49',
       coalesce((SELECT client_fee FROM public.payment_terms((SELECT id FROM public.businesses WHERE market IN ('porto', 'lisbon') LIMIT 1), 20)) = 0.49, true);
