-- Travel time: one row. Expect 13, 0, 91, 2, 75, 115, 0, and the two calls patched (true, true).
SELECT
  (SELECT count(*) FROM public.market_regions WHERE market = 'lagos') AS lagos_regions,
  (SELECT count(*) FROM public.market_zones WHERE market = 'lagos' AND region IS NULL) AS areas_without_region,
  (SELECT count(*) FROM public.region_minutes WHERE market = 'lagos') AS region_pairs,
  (SELECT count(*) FROM public.market_peaks WHERE market = 'lagos') AS rush_hours,
  public.travel_minutes('lagos', 'Lekki', '#shop', 'Ikorodu', date '2026-10-20' + time '12:00') AS lekki_ikorodu_noon,
  public.travel_minutes('lagos', 'Lekki', '#shop', 'Ikorodu', date '2026-10-20' + time '17:00') AS lekki_ikorodu_5pm,
  public.travel_minutes('porto', 'Porto', '#shop', 'Matosinhos', date '2026-10-20' + time '17:00') AS porto,
  position('v_people, v_mode, v_zone) s' IN pg_get_functiondef('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer)'::regprocedure)) > 0 AS booking_patched,
  position('p_mode, p_zone) sl' IN pg_get_functiondef('public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text)'::regprocedure)) > 0 AS search_patched;
