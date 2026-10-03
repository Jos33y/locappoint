-- Read only. Every row should say ok = true.
WITH checks AS (
  SELECT 1 AS n, 'Porto and Lagos are featured markets, Lisbon is open' AS what,
    (SELECT array_agg(code ORDER BY sort_order) FROM public.markets WHERE featured) = ARRAY['porto', 'lagos']
    AND EXISTS (SELECT 1 FROM public.markets WHERE code = 'lisbon') AS ok, NULL::text AS detail
  UNION ALL SELECT 2, 'each market has its currency and payment provider',
    (SELECT bool_and((code = 'lagos') = (currency = 'NGN' AND payment_provider = 'paystack')) FROM public.markets), NULL
  UNION ALL SELECT 3, 'every market has fee and policy rules',
    (SELECT count(*) FROM public.markets m WHERE NOT EXISTS (SELECT 1 FROM public.market_rules r WHERE r.market = m.code)) = 0, NULL
  UNION ALL SELECT 4, 'Lagos takes bank transfer and card',
    (SELECT methods FROM public.market_rules WHERE market = 'lagos') @> ARRAY['transfer', 'card'], NULL
  UNION ALL SELECT 5, 'fee rules are private (no reading from the app)',
    NOT has_table_privilege('anon', 'public.market_rules', 'SELECT') AND NOT has_table_privilege('authenticated', 'public.market_rules', 'SELECT'), NULL
  UNION ALL SELECT 6, 'payout records are readable by their owner only and written by nobody from the app',
    NOT has_table_privilege('anon', 'public.business_payouts', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.business_payouts', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.business_payouts', 'UPDATE')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_payouts' AND policyname = 'business_payouts_owner_read'), NULL
  UNION ALL SELECT 7, 'market is worked out from country and city',
    public.market_for('PT', 'Porto') = 'porto' AND public.market_for('PT', 'Vila Nova de Gaia') = 'porto'
    AND public.market_for('PT', 'Lisboa') = 'lisbon' AND public.market_for('NG', 'Lagos') = 'lagos'
    AND public.market_for('PT', 'Lagos') IS NULL AND public.market_for('NG', 'Abuja') IS NULL, NULL
  UNION ALL SELECT 8, 'every business has its market and currency set',
    (SELECT count(*) FROM public.businesses WHERE market IS DISTINCT FROM public.market_for(country, city)
       OR currency <> CASE WHEN country = 'NG' THEN 'NGN' ELSE 'EUR' END) = 0, NULL
  UNION ALL SELECT 9, 'new services happen at the business, for one person, unless the owner changes it',
    (SELECT column_default FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'modes') LIKE '%at_business%'
    AND (SELECT column_default FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'max_people') = '1', NULL
  UNION ALL SELECT 10, 'every booking has a currency and a total',
    (SELECT count(*) FROM public.appointments WHERE currency IS NULL OR total IS NULL) = 0, NULL
  UNION ALL SELECT 11, 'every booking total is its price plus travel and service fee',
    (SELECT count(*) FROM public.appointments WHERE total <> coalesce(price, 0) + travel_fee + client_fee) = 0, NULL
  UNION ALL SELECT 12, 'existing bookings stay pay at the visit',
    (SELECT count(*) FROM public.appointments WHERE payment_status <> 'at_visit') = 0, NULL
  UNION ALL SELECT 13, 'money trigger runs after the price is filled in',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'appointments_money' AND tgrelid = 'public.appointments'::regclass)
    AND 'appointments_lifecycle' < 'appointments_money', NULL
  UNION ALL SELECT 14, 'Lagos has its zones',
    (SELECT count(*) FROM public.market_zones WHERE market = 'lagos') >= 18, NULL
)
SELECT n, what, ok, detail FROM checks
UNION ALL
SELECT 100 + row_number() OVER (ORDER BY m.sort_order), 'market ' || m.name, true,
       (SELECT count(*) FROM public.businesses b WHERE b.market = m.code AND b.is_active) || ' live businesses, fees '
       || CASE WHEN r.confirmed THEN 'confirmed' ELSE 'placeholders until Vincent sets them' END
  FROM public.markets m JOIN public.market_rules r ON r.market = m.code
ORDER BY 1;
