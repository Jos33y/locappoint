-- Travel time between visits. A staff member who goes to clients needs time to get from one place
-- to the next, and Lagos traffic makes that time real: Lekki to Ikorodu is not ten minutes.
-- Areas are grouped into regions with set minutes between them, slower at rush hour. Free times keep
-- that gap around every booking whose place differs: a visit at the client's place, the shop, or the
-- next client. Online sessions need no travel. Markets without regions (Porto and Lisbon for now)
-- work exactly as before. Needs cities.sql. Safe to run again.

BEGIN;

-- 1. Regions, the minutes between them, and rush hours. Public to read, changed only here.
CREATE TABLE IF NOT EXISTS public.market_regions (
  market text NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[a-z_]{2,30}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (market, code)
);

ALTER TABLE public.market_zones ADD COLUMN IF NOT EXISTS region text;
DO $c$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_zones_region_fkey') THEN
    ALTER TABLE public.market_zones ADD CONSTRAINT market_zones_region_fkey
      FOREIGN KEY (market, region) REFERENCES public.market_regions(market, code) ON DELETE SET NULL (region);
  END IF;
END
$c$;

-- Minutes from one region to another off-peak, the same both ways (a <= b). a = b is two places in the same region.
CREATE TABLE IF NOT EXISTS public.region_minutes (
  market text NOT NULL,
  a text NOT NULL,
  b text NOT NULL,
  minutes integer NOT NULL CHECK (minutes BETWEEN 0 AND 300),
  PRIMARY KEY (market, a, b),
  CHECK (a <= b),
  FOREIGN KEY (market, a) REFERENCES public.market_regions(market, code) ON DELETE CASCADE,
  FOREIGN KEY (market, b) REFERENCES public.market_regions(market, code) ON DELETE CASCADE
);

-- Rush hours: travel starting inside one takes longer.
CREATE TABLE IF NOT EXISTS public.market_peaks (
  market text NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  starts time NOT NULL,
  ends time NOT NULL CHECK (ends > starts),
  factor numeric NOT NULL CHECK (factor BETWEEN 1 AND 3),
  weekdays_only boolean NOT NULL DEFAULT true,
  PRIMARY KEY (market, starts)
);

-- When an area is not known (an address outside the list), this many minutes off-peak.
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS travel_unknown_minutes integer CHECK (travel_unknown_minutes BETWEEN 0 AND 300);

ALTER TABLE public.market_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_peaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS market_regions_read ON public.market_regions;
CREATE POLICY market_regions_read ON public.market_regions FOR SELECT USING (true);
DROP POLICY IF EXISTS region_minutes_read ON public.region_minutes;
CREATE POLICY region_minutes_read ON public.region_minutes FOR SELECT USING (true);
DROP POLICY IF EXISTS market_peaks_read ON public.market_peaks;
CREATE POLICY market_peaks_read ON public.market_peaks FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.market_regions, public.region_minutes, public.market_peaks FROM anon, authenticated;

-- 2. Lagos: 13 regions, every area in one.
INSERT INTO public.market_regions (market, code, name, sort_order) VALUES
  ('lagos', 'island', 'Island', 1),
  ('lagos', 'lekki', 'Lekki', 2),
  ('lagos', 'ajah', 'Ajah', 3),
  ('lagos', 'far_east', 'Ibeju-Lekki and Epe', 4),
  ('lagos', 'central', 'Yaba and Surulere', 5),
  ('lagos', 'festac', 'Festac and Apapa', 6),
  ('lagos', 'gbagada', 'Gbagada and Maryland', 7),
  ('lagos', 'ikeja', 'Ikeja', 8),
  ('lagos', 'north', 'Ojodu and Magodo', 9),
  ('lagos', 'oshodi', 'Oshodi and Isolo', 10),
  ('lagos', 'alimosho', 'Alimosho', 11),
  ('lagos', 'ikorodu', 'Ikorodu', 12),
  ('lagos', 'badagry', 'Badagry', 13)
ON CONFLICT (market, code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

UPDATE public.market_zones z
SET region = r.region
FROM (VALUES
  ('Victoria Island', 'island'), ('Ikoyi', 'island'), ('Lagos Island', 'island'), ('Obalende', 'island'),
  ('Lekki', 'lekki'), ('Lekki Phase 1', 'lekki'), ('Ikate', 'lekki'), ('Chevron', 'lekki'), ('Osapa', 'lekki'),
  ('Agungi', 'lekki'), ('VGC', 'lekki'),
  ('Ajah', 'ajah'), ('Badore', 'ajah'), ('Sangotedo', 'ajah'), ('Abraham Adesanya', 'ajah'), ('Awoyaya', 'ajah'),
  ('Ibeju-Lekki', 'far_east'), ('Epe', 'far_east'),
  ('Yaba', 'central'), ('Ebute Metta', 'central'), ('Akoka', 'central'), ('Surulere', 'central'), ('Mushin', 'central'),
  ('Ijora', 'central'),
  ('Festac', 'festac'), ('Apapa', 'festac'), ('Ajegunle', 'festac'), ('Mile 2', 'festac'), ('Amuwo Odofin', 'festac'),
  ('Satellite Town', 'festac'), ('Ojo', 'festac'), ('Iba', 'festac'),
  ('Gbagada', 'gbagada'), ('Maryland', 'gbagada'), ('Bariga', 'gbagada'), ('Shomolu', 'gbagada'), ('Ilupeju', 'gbagada'),
  ('Ogudu', 'gbagada'), ('Ojota', 'gbagada'), ('Ketu', 'gbagada'), ('Mile 12', 'gbagada'), ('Anthony', 'gbagada'),
  ('Ikeja', 'ikeja'), ('Ikeja GRA', 'ikeja'), ('Opebi', 'ikeja'), ('Allen', 'ikeja'), ('Oregun', 'ikeja'), ('Ogba', 'ikeja'),
  ('Agege', 'ikeja'), ('Ifako', 'ikeja'),
  ('Ojodu', 'north'), ('Berger', 'north'), ('Omole', 'north'), ('Magodo', 'north'), ('Isheri', 'north'), ('Iju-Ishaga', 'north'),
  ('Oshodi', 'oshodi'), ('Isolo', 'oshodi'), ('Okota', 'oshodi'), ('Ago Palace', 'oshodi'), ('Ejigbo', 'oshodi'),
  ('Egbeda', 'alimosho'), ('Ikotun', 'alimosho'), ('Idimu', 'alimosho'), ('Igando', 'alimosho'), ('Ipaja', 'alimosho'),
  ('Ayobo', 'alimosho'), ('Iyana Ipaja', 'alimosho'), ('Alagbado', 'alimosho'), ('Abule Egba', 'alimosho'), ('Kola', 'alimosho'),
  ('Ikorodu', 'ikorodu'),
  ('Badagry', 'badagry')
) AS r(zone, region)
WHERE z.market = 'lagos' AND z.name = r.zone AND z.region IS DISTINCT FROM r.region;

-- Off-peak car minutes, a rough Lagos midday. Tune from real trips.
INSERT INTO public.region_minutes (market, a, b, minutes)
SELECT 'lagos', least(x, y), greatest(x, y), m FROM (VALUES
  ('island', 'island', 20), ('lekki', 'lekki', 20), ('ajah', 'ajah', 20), ('far_east', 'far_east', 40),
  ('central', 'central', 20), ('festac', 'festac', 25), ('gbagada', 'gbagada', 20), ('ikeja', 'ikeja', 20),
  ('north', 'north', 20), ('oshodi', 'oshodi', 20), ('alimosho', 'alimosho', 25), ('ikorodu', 'ikorodu', 25),
  ('badagry', 'badagry', 30),
  ('island', 'lekki', 25), ('island', 'ajah', 45), ('island', 'far_east', 80), ('island', 'central', 25),
  ('island', 'festac', 35), ('island', 'gbagada', 35), ('island', 'ikeja', 45), ('island', 'north', 55),
  ('island', 'oshodi', 40), ('island', 'alimosho', 60), ('island', 'ikorodu', 70), ('island', 'badagry', 90),
  ('lekki', 'ajah', 25), ('lekki', 'far_east', 60), ('lekki', 'central', 40), ('lekki', 'festac', 50),
  ('lekki', 'gbagada', 45), ('lekki', 'ikeja', 55), ('lekki', 'north', 65), ('lekki', 'oshodi', 55),
  ('lekki', 'alimosho', 75), ('lekki', 'ikorodu', 75), ('lekki', 'badagry', 105),
  ('ajah', 'far_east', 40), ('ajah', 'central', 60), ('ajah', 'festac', 70), ('ajah', 'gbagada', 65),
  ('ajah', 'ikeja', 75), ('ajah', 'north', 80), ('ajah', 'oshodi', 75), ('ajah', 'alimosho', 95),
  ('ajah', 'ikorodu', 90), ('ajah', 'badagry', 120),
  ('far_east', 'central', 95), ('far_east', 'festac', 105), ('far_east', 'gbagada', 100), ('far_east', 'ikeja', 110),
  ('far_east', 'north', 115), ('far_east', 'oshodi', 110), ('far_east', 'alimosho', 125), ('far_east', 'ikorodu', 90),
  ('far_east', 'badagry', 150),
  ('central', 'festac', 30), ('central', 'gbagada', 20), ('central', 'ikeja', 30), ('central', 'north', 40),
  ('central', 'oshodi', 25), ('central', 'alimosho', 45), ('central', 'ikorodu', 55), ('central', 'badagry', 75),
  ('festac', 'gbagada', 40), ('festac', 'ikeja', 40), ('festac', 'north', 55), ('festac', 'oshodi', 30),
  ('festac', 'alimosho', 40), ('festac', 'ikorodu', 70), ('festac', 'badagry', 50),
  ('gbagada', 'ikeja', 25), ('gbagada', 'north', 25), ('gbagada', 'oshodi', 25), ('gbagada', 'alimosho', 45),
  ('gbagada', 'ikorodu', 40), ('gbagada', 'badagry', 80),
  ('ikeja', 'north', 25), ('ikeja', 'oshodi', 20), ('ikeja', 'alimosho', 30), ('ikeja', 'ikorodu', 50), ('ikeja', 'badagry', 75),
  ('north', 'oshodi', 35), ('north', 'alimosho', 35), ('north', 'ikorodu', 45), ('north', 'badagry', 90),
  ('oshodi', 'alimosho', 30), ('oshodi', 'ikorodu', 50), ('oshodi', 'badagry', 65),
  ('alimosho', 'ikorodu', 60), ('alimosho', 'badagry', 60),
  ('ikorodu', 'badagry', 110)
) AS t(x, y, m)
ON CONFLICT (market, a, b) DO NOTHING;

INSERT INTO public.market_peaks (market, starts, ends, factor, weekdays_only) VALUES
  ('lagos', '06:30', '10:00', 1.5, true),
  ('lagos', '16:00', '20:00', 1.5, true)
ON CONFLICT (market, starts) DO NOTHING;

UPDATE public.markets SET travel_unknown_minutes = 60 WHERE code = 'lagos' AND travel_unknown_minutes IS NULL;

-- 3. Where the business starts from: one of its city's areas. Filled from the neighbourhood or the
-- city when it matches an area; the owner can change it in Services, Where you go.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS base_zone text;

CREATE OR REPLACE FUNCTION public.businesses_base_zone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_chosen boolean := TG_OP = 'UPDATE' AND NEW.base_zone IS DISTINCT FROM OLD.base_zone;
BEGIN
  NEW.base_zone := NULLIF(btrim(NEW.base_zone), '');
  IF NEW.base_zone IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.market_zones z WHERE z.market = NEW.market AND z.name = NEW.base_zone) THEN
    IF v_chosen THEN
      RAISE EXCEPTION 'Pick an area from the list' USING ERRCODE = '22023';
    END IF;
    NEW.base_zone := NULL;
  END IF;
  IF NEW.base_zone IS NULL AND NEW.market IS NOT NULL THEN
    SELECT z.name INTO NEW.base_zone
      FROM public.market_zones z
     WHERE z.market = NEW.market
       AND lower(z.name) IN (lower(btrim(coalesce(NEW.neighbourhood, ''))), lower(btrim(coalesce(NEW.city, ''))))
     ORDER BY (lower(z.name) = lower(btrim(coalesce(NEW.neighbourhood, '')))) DESC
     LIMIT 1;
  END IF;
  RETURN NEW;
END
$$;

-- Runs after businesses_market (triggers fire in name order), so the market is already set.
DROP TRIGGER IF EXISTS businesses_zone ON public.businesses;
CREATE TRIGGER businesses_zone
  BEFORE INSERT OR UPDATE OF base_zone, neighbourhood, city, country, market ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_base_zone();

-- Businesses already set up: only those whose neighbourhood or city names one of their city's areas.
UPDATE public.businesses b
SET base_zone = (SELECT z.name FROM public.market_zones z
                  WHERE z.market = b.market
                    AND lower(z.name) IN (lower(btrim(coalesce(b.neighbourhood, ''))), lower(btrim(coalesce(b.city, ''))))
                  ORDER BY (lower(z.name) = lower(btrim(coalesce(b.neighbourhood, '')))) DESC
                  LIMIT 1)
WHERE b.base_zone IS NULL
  AND EXISTS (SELECT 1 FROM public.market_zones z
               WHERE z.market = b.market
                 AND lower(z.name) IN (lower(btrim(coalesce(b.neighbourhood, ''))), lower(btrim(coalesce(b.city, '')))));

-- 4. Where a booking happens, as one word: the shop, online, or the client's area ('#client' when unknown).
CREATE OR REPLACE FUNCTION public.visit_place(p_mode text, p_zone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_mode WHEN 'online' THEN '#online'
                     WHEN 'at_client' THEN coalesce(NULLIF(btrim(p_zone), ''), '#client')
                     ELSE '#shop' END
$$;

-- Minutes to get from one place to the next, leaving at p_at (local time). 0 when either is online,
-- for shop to shop, and in markets without regions.
CREATE OR REPLACE FUNCTION public.travel_minutes(p_market text, p_base text, p_from text, p_to text, p_at timestamp)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_from text := CASE WHEN p_from = '#shop' THEN p_base ELSE p_from END;
  v_to text := CASE WHEN p_to = '#shop' THEN p_base ELSE p_to END;
  ra text;
  rb text;
  v_min integer;
  v_factor numeric;
BEGIN
  IF p_from = '#online' OR p_to = '#online' OR (p_from = '#shop' AND p_to = '#shop') OR p_market IS NULL THEN
    RETURN 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.market_regions r WHERE r.market = p_market) THEN
    RETURN 0;
  END IF;
  SELECT z.region INTO ra FROM public.market_zones z WHERE z.market = p_market AND z.name = v_from;
  SELECT z.region INTO rb FROM public.market_zones z WHERE z.market = p_market AND z.name = v_to;
  IF ra IS NOT NULL AND rb IS NOT NULL THEN
    SELECT m.minutes INTO v_min FROM public.region_minutes m
     WHERE m.market = p_market AND m.a = least(ra, rb) AND m.b = greatest(ra, rb);
  END IF;
  IF v_min IS NULL THEN
    SELECT coalesce(mk.travel_unknown_minutes, 0) INTO v_min FROM public.markets mk WHERE mk.code = p_market;
  END IF;
  SELECT max(p.factor) INTO v_factor FROM public.market_peaks p
   WHERE p.market = p_market AND p_at::time >= p.starts AND p_at::time < p.ends
     AND (NOT p.weekdays_only OR extract(isodow FROM p_at) <= 5);
  RETURN (ceil(coalesce(v_min, 0) * coalesce(v_factor, 1) / 5.0) * 5)::integer;
END
$$;

REVOKE EXECUTE ON FUNCTION public.travel_minutes(text, text, text, text, timestamp) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_minutes(text, text, text, text, timestamp) TO anon, authenticated, service_role;

-- 5. Free times keep the travel gap. Two new optional inputs: how it happens (p_mode, the service's
-- first way when empty) and the client's area (p_zone). A booking being moved keeps its own.
DROP FUNCTION IF EXISTS public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer);

CREATE OR REPLACE FUNCTION public.get_available_slots(p_business_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_people integer DEFAULT NULL::integer, p_mode text DEFAULT NULL::text, p_zone text DEFAULT NULL::text)
 RETURNS TABLE(slot_time time without time zone, staff_id uuid, staff_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH biz AS (
    SELECT b.id, (now() AT TIME ZONE b.timezone) AS local_now, b.buffer_minutes * interval '1 minute' AS buf,
           b.market, b.base_zone,
           EXISTS (SELECT 1 FROM public.market_regions r WHERE r.market = b.market) AS travels
      FROM public.businesses b
     WHERE b.id = p_business_id
       AND (b.is_active = true OR public.is_business_member(b.id))
  ),
  -- Where this booking happens: as asked, as booked when it is being moved, or the service's first way.
  here AS (
    SELECT public.visit_place(
             coalesce(NULLIF(p_mode, ''),
                      (SELECT ap.mode FROM public.appointments ap WHERE ap.id = p_ignore_appointment),
                      (SELECT s.modes[1] FROM public.services s WHERE s.id = p_service_id),
                      'at_business'),
             coalesce(NULLIF(btrim(p_zone), ''),
                      (SELECT ap.client_zone FROM public.appointments ap WHERE ap.id = p_ignore_appointment))) AS place
  ),
  -- Extras picked with the service; a booking being moved keeps the extras it was booked with.
  extras AS (
    SELECT s.id, s.duration_minutes
      FROM public.services s
     WHERE s.business_id = p_business_id AND s.is_active = true AND s.is_addon = true AND s.id <> p_service_id
       AND s.id = ANY (coalesce(p_addon_ids, ARRAY(
             SELECT (x->>'id')::uuid FROM public.appointments ap, jsonb_array_elements(ap.addons) x
              WHERE ap.id = p_ignore_appointment)))
  ),
  moved AS (
    SELECT coalesce(sum((x->>'minutes')::int), 0) AS minutes
      FROM public.appointments ap, jsonb_array_elements(ap.addons) x
     WHERE ap.id = p_ignore_appointment AND p_addon_ids IS NULL
  ),
  -- How many people: as asked, or as booked when a booking is being moved. One staff member does
  -- them one after another; each extra person adds their own time (the service's, unless set).
  party AS (
    SELECT greatest(1, coalesce(p_people, (SELECT ap.people FROM public.appointments ap WHERE ap.id = p_ignore_appointment), 1)) AS people
  ),
  svc AS (
    SELECT s.id, (s.duration_minutes + CASE WHEN p_addon_ids IS NULL THEN (SELECT minutes FROM moved)
                                            ELSE coalesce((SELECT sum(e.duration_minutes) FROM extras e), 0) END
                  + ((SELECT people FROM party) - 1) * coalesce(s.extra_person_minutes, s.duration_minutes)) * interval '1 minute' AS dur
      FROM public.services s
     WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true
       AND (SELECT people FROM party) <= s.max_people
  ),
  staff AS (
    SELECT m.id, m.display_name, m.sort_order, m.created_at
      FROM public.business_members m
     WHERE m.business_id = p_business_id
       AND m.status = 'active' AND m.is_bookable = true
       AND (p_staff_id IS NULL OR m.id = p_staff_id)
       AND (NOT EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id)
            OR (EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = p_service_id)
                AND NOT EXISTS (SELECT 1 FROM extras e
                                 WHERE NOT EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = e.id))))
  ),
  windows AS (
    SELECT st.id AS staff_id, st.display_name, st.sort_order, st.created_at, a.start_time, a.end_time
      FROM staff st
      JOIN public.availability a
        ON a.business_id = p_business_id
       AND a.is_active = true
       AND a.day_of_week = extract(dow FROM p_date)::int
       AND (a.staff_id = st.id
            OR (a.staff_id IS NULL
                AND NOT EXISTS (SELECT 1 FROM public.availability own
                                 WHERE own.staff_id = st.id AND own.is_active = true)))
  ),
  candidates AS (
    SELECT w.staff_id, w.display_name, w.sort_order, w.created_at, g.slot_start, g.slot_start + svc.dur AS slot_end, biz.buf
      FROM windows w
     CROSS JOIN svc
     CROSS JOIN biz
     CROSS JOIN LATERAL generate_series(
       p_date + w.start_time,
       p_date + w.end_time - svc.dur,
       interval '15 minutes'
     ) AS g(slot_start)
     WHERE g.slot_start > biz.local_now
       AND g.slot_start <= biz.local_now + interval '90 days'
  ),
  -- Bookings already in the staff member's day, with where they happen.
  taken AS (
    SELECT ap.staff_id,
           ap.appointment_date + ap.appointment_time AS starts,
           ap.appointment_date + ap.appointment_time + ap.duration_minutes * interval '1 minute' AS ends,
           public.visit_place(ap.mode, ap.client_zone) AS place
      FROM public.appointments ap
     WHERE ap.business_id = p_business_id
       AND ap.status IN ('pending', 'confirmed')
       AND (p_ignore_appointment IS NULL OR ap.id <> p_ignore_appointment)
       AND ap.appointment_date BETWEEN p_date - 1 AND p_date + 1
  ),
  free AS (
    SELECT c.*
      FROM candidates c
     CROSS JOIN biz
     CROSS JOIN here
     WHERE NOT EXISTS (
             SELECT 1 FROM taken t
              WHERE t.staff_id = c.staff_id
                -- Rough cut first: nothing within 5 hours either side can clash.
                AND t.starts < c.slot_end + c.buf + interval '5 hours'
                AND c.slot_start < t.ends + c.buf + interval '5 hours'
                AND tsrange(t.starts,
                            t.ends + c.buf + CASE WHEN biz.travels THEN public.travel_minutes(biz.market, biz.base_zone, t.place, here.place, t.ends) ELSE 0 END * interval '1 minute', '[)')
                    && tsrange(c.slot_start,
                               c.slot_end + c.buf + CASE WHEN biz.travels THEN public.travel_minutes(biz.market, biz.base_zone, here.place, t.place, c.slot_end) ELSE 0 END * interval '1 minute', '[)'))
       AND NOT EXISTS (
             SELECT 1 FROM public.time_blocks tb
              WHERE tb.business_id = p_business_id
                AND (tb.staff_id = c.staff_id OR tb.staff_id IS NULL)
                AND tsrange(tb.starts_at, tb.ends_at, '[)') && tsrange(c.slot_start, c.slot_end, '[)'))
  )
  SELECT DISTINCT ON (f.slot_start, CASE WHEN p_staff_id IS NULL THEN NULL ELSE f.staff_id END)
         f.slot_start::time, f.staff_id, f.display_name
    FROM free f
   ORDER BY f.slot_start, CASE WHEN p_staff_id IS NULL THEN NULL ELSE f.staff_id END, f.sort_order, f.created_at
$function$;

REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid, uuid[], integer, text, text) TO anon, authenticated, service_role;

-- 6. Booking and "What do you need?" check free times for the way and the area asked. Patched in
-- place after checking the exact call, so nothing else in them changes.
DO $patch$
DECLARE
  def text;
  old_call constant text := 'CASE WHEN cardinality(v_ids) > 0 THEN v_ids END, v_people) s';
  new_call constant text := 'CASE WHEN cardinality(v_ids) > 0 THEN v_ids END, v_people, v_mode, v_zone) s';
  old_match constant text := 'NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END) sl';
  new_match constant text := 'NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END, p_mode, p_zone) sl';
BEGIN
  def := pg_get_functiondef('public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer)'::regprocedure);
  IF position(new_call IN def) = 0 THEN
    IF (length(def) - length(replace(def, old_call, ''))) / length(old_call) <> 1 THEN
      RAISE EXCEPTION 'travel: book_appointment does not have the expected free-times call exactly once; nothing changed';
    END IF;
    EXECUTE replace(def, old_call, new_call);
  END IF;

  def := pg_get_functiondef('public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text)'::regprocedure);
  IF position(new_match IN def) = 0 THEN
    IF (length(def) - length(replace(def, old_match, ''))) / length(old_match) <> 1 THEN
      RAISE EXCEPTION 'travel: engine_match does not have the expected free-times call exactly once; nothing changed';
    END IF;
    EXECUTE replace(def, old_match, new_match);
  END IF;
END
$patch$;

COMMIT;
