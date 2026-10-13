SELECT
  (SELECT count(*) FROM public.market_zones WHERE market = 'lagos') AS lagos_areas,
  (SELECT name FROM public.market_zones WHERE market = 'lagos' ORDER BY sort_order LIMIT 1) AS first_area,
  (SELECT name FROM public.market_zones WHERE market = 'lagos' ORDER BY sort_order DESC LIMIT 1) AS last_area,
  (SELECT count(*) FROM public.market_zones WHERE market = 'lagos' AND name IN ('Igando', 'Ipaja', 'Ayobo', 'Kola')) AS named,
  (SELECT count(*) FROM (SELECT sort_order FROM public.market_zones WHERE market = 'lagos' GROUP BY sort_order HAVING count(*) > 1) c) AS clashes,
  (SELECT count(*) FROM public.market_zones WHERE market = 'porto') AS porto_areas,
  (SELECT count(*) FROM public.market_zones WHERE market = 'lisbon') AS lisbon_areas;