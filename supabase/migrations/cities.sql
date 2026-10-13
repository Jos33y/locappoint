-- Cities: Porto and Lagos live, Lisbon next. Lagos gets the areas people actually say, so a
-- business can list where it goes and a client can find their own area in the picker.
-- Areas are listed alphabetically. Existing areas are kept, so bookings and service_zones that
-- already name one stay valid. Needs engine-foundation.sql. Safe to run again.

BEGIN;

INSERT INTO public.market_zones (market, name, sort_order)
SELECT 'lagos', z, 0 FROM unnest(ARRAY[
  'Abraham Adesanya', 'Abule Egba', 'Agege', 'Ago Palace', 'Agungi', 'Ajegunle', 'Akoka',
  'Alagbado', 'Allen', 'Amuwo Odofin', 'Anthony', 'Awoyaya', 'Ayobo', 'Badagry', 'Badore',
  'Bariga', 'Berger', 'Chevron', 'Ebute Metta', 'Ejigbo', 'Epe', 'Iba', 'Ibeju-Lekki', 'Idimu',
  'Ifako', 'Igando', 'Iju-Ishaga', 'Ijora', 'Ikate', 'Ikeja GRA', 'Ikotun', 'Ilupeju', 'Ipaja',
  'Isheri', 'Isolo', 'Iyana Ipaja', 'Ketu', 'Kola', 'Lekki Phase 1', 'Mile 12', 'Mile 2',
  'Mushin', 'Obalende', 'Ogudu', 'Ojota', 'Okota', 'Omole', 'Opebi', 'Oregun', 'Osapa',
  'Oshodi', 'Sangotedo', 'Satellite Town', 'Shomolu', 'VGC'
]) AS t(z)
ON CONFLICT (market, name) DO NOTHING;

-- One alphabetical order for every Lagos area, old and new.
UPDATE public.market_zones z
SET sort_order = o.n
FROM (
  SELECT name, row_number() OVER (ORDER BY lower(name)) AS n
  FROM public.market_zones WHERE market = 'lagos'
) o
WHERE z.market = 'lagos' AND z.name = o.name AND z.sort_order IS DISTINCT FROM o.n;

COMMIT;
