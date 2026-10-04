-- Distance for visits at the client's place. A business that travels can, as well as listing areas,
-- set how far it goes from its shop (businesses.service_radius_km, straight line). Its shop is placed
-- once with Google (the places function), refreshed every 25 days and forgotten after 30 if a refresh
-- fails, as Google's terms ask. The client picks their address from Google's suggestions: the booking
-- checks the distance here, never in the browser, and keeps only Google's place id with the address,
-- cleared with it 30 days after the visit. Client coordinates are never stored.
-- Needs formats-home.sql. Safe to run again.

BEGIN;

-- 1. Straight-line distance in km between two points.
CREATE OR REPLACE FUNCTION public.km_between(p_lat1 double precision, p_lng1 double precision, p_lat2 double precision, p_lng2 double precision)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT round((6371.0088 * 2 * asin(sqrt(
           power(sin(radians(p_lat2 - p_lat1) / 2), 2)
           + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
         )))::numeric, 3);
$$;

-- 2. Where the shop is. Written only by set_shop_location (the places function), never by the browser.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS place_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS located_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_geo') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_geo CHECK (
      (lat IS NULL) = (lng IS NULL)
      AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))
      AND (place_id IS NULL OR char_length(place_id) <= 300)
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.businesses_geo_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('locappoint.trusted_write', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.lat := NULL; NEW.lng := NULL; NEW.place_id := NULL; NEW.located_at := NULL;
    ELSE
      NEW.lat := OLD.lat; NEW.lng := OLD.lng; NEW.place_id := OLD.place_id; NEW.located_at := OLD.located_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_geo_guard ON public.businesses;
CREATE TRIGGER businesses_geo_guard
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_geo_guard();

CREATE OR REPLACE FUNCTION public.set_shop_location(p_business uuid, p_place_id text, p_lat double precision, p_lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.businesses
     SET place_id = coalesce(NULLIF(p_place_id, ''), place_id), lat = p_lat, lng = p_lng, located_at = now()
   WHERE id = p_business;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
END;
$$;

-- Shops due a refresh (Google lets coordinates be kept 30 days; the place id for good).
CREATE OR REPLACE FUNCTION public.shop_locations_due(p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, place_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.id, b.place_id FROM public.businesses b
   WHERE b.place_id IS NOT NULL AND (b.located_at IS NULL OR b.located_at < now() - interval '25 days')
   ORDER BY b.located_at NULLS FIRST
   LIMIT greatest(1, least(p_limit, 200));
$$;

-- A refresh that keeps failing: the coordinates go at 30 days and distance stops until it works.
CREATE OR REPLACE FUNCTION public.expire_shop_locations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.businesses SET lat = NULL, lng = NULL
   WHERE lat IS NOT NULL AND (located_at IS NULL OR located_at < now() - interval '30 days');
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_shop_location(uuid, text, double precision, double precision) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.shop_locations_due(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_shop_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_shop_location(uuid, text, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_locations_due(integer) TO service_role;

-- 3. The client's address keeps Google's place id beside it, for directions; same rules as the address.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_place_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_place_id') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_place_id
      CHECK (client_place_id IS NULL OR char_length(client_place_id) <= 300);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.appointments_place_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('locappoint.trusted_write', true) IS DISTINCT FROM 'on' THEN
    NEW.client_place_id := OLD.client_place_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_place_guard ON public.appointments;
CREATE TRIGGER appointments_place_guard
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_place_guard();

-- 4. Booking: inside the areas, or within the distance.
DROP FUNCTION IF EXISTS public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text);

CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text, p_client_address text DEFAULT NULL::text, p_client_landmark text DEFAULT NULL::text, p_client_zone text DEFAULT NULL::text, p_client_lat double precision DEFAULT NULL::double precision, p_client_lng double precision DEFAULT NULL::double precision, p_client_place_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_auto boolean;
  v_duration integer;
  v_local_now timestamp;
  v_staff uuid;
  v_name text := trim(p_client_name);
  v_email text := lower(trim(p_client_email));
  v_phone text := trim(p_client_phone);
  v_digits text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_id uuid;
  v_ids uuid[] := ARRAY(SELECT DISTINCT unnest(coalesce(p_addon_ids, '{}')));
  v_addons jsonb := '[]';
  v_extra integer := 0;
  v_price numeric;
  v_service_price numeric;
  v_base numeric;
  v_terms record;
  v_online boolean := false;
  v_modes text[];
  v_mode text;
  v_travel numeric := 0;
  v_zones text[];
  v_address text := NULLIF(trim(p_client_address), '');
  v_landmark text := NULLIF(trim(p_client_landmark), '');
  v_zone text := NULLIF(trim(p_client_zone), '');
  v_place text := NULLIF(trim(p_client_place_id), '');
  v_radius numeric;
  v_blat double precision;
  v_blng double precision;
  v_market text;
  v_by_zone boolean;
  v_by_km boolean;
  v_km numeric;
BEGIN
  IF v_uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_uid) THEN
    v_uid := NULL;
  END IF;

  SELECT b.timezone, b.auto_confirm INTO v_tz, v_auto
    FROM public.businesses b WHERE b.id = p_business_id AND b.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This business is not taking bookings' USING ERRCODE = 'P0002';
  END IF;
  IF v_uid IS NOT NULL AND public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'This is your own business. Add bookings from your calendar.' USING ERRCODE = '42501';
  END IF;

  SELECT s.duration_minutes, s.price, s.modes, s.travel_fee INTO v_duration, v_price, v_modes, v_travel FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

  -- Where it happens: one of the ways the service is offered; the first one when the client did not say.
  v_mode := coalesce(NULLIF(trim(p_mode), ''), v_modes[1], 'at_business');
  IF NOT (v_mode = ANY (coalesce(v_modes, ARRAY['at_business']))) THEN
    RAISE EXCEPTION 'This service is not offered that way. Pick again.' USING ERRCODE = '22023';
  END IF;
  -- At the client's place: inside the areas the business covers, or within the distance it travels
  -- from its shop (straight line), with an address it can find.
  IF v_mode = 'at_client' THEN
    SELECT b.service_zones, b.service_radius_km, b.lat, b.lng, b.market
      INTO v_zones, v_radius, v_blat, v_blng, v_market
      FROM public.businesses b WHERE b.id = p_business_id;
    v_by_zone := cardinality(coalesce(v_zones, '{}')) > 0;
    v_by_km := v_radius IS NOT NULL AND v_blat IS NOT NULL AND v_blng IS NOT NULL;
    IF NOT v_by_zone AND NOT v_by_km THEN
      RAISE EXCEPTION 'This business has not said where it travels yet. Pick another way.' USING ERRCODE = '22023';
    END IF;
    IF (p_client_lat IS NULL) <> (p_client_lng IS NULL)
       OR p_client_lat NOT BETWEEN -90 AND 90 OR p_client_lng NOT BETWEEN -180 AND 180 THEN
      RAISE EXCEPTION 'Pick your address again from the suggestions' USING ERRCODE = '22023';
    END IF;
    IF v_place IS NOT NULL AND (v_place !~ '^[A-Za-z0-9_-]+$' OR length(v_place) NOT BETWEEN 10 AND 300) THEN
      v_place := NULL;
    END IF;
    IF v_by_km AND p_client_lat IS NOT NULL THEN
      v_km := public.km_between(v_blat, v_blng, p_client_lat, p_client_lng);
    END IF;

    IF v_zone IS NOT NULL AND v_zone = ANY (coalesce(v_zones, '{}')) THEN
      NULL;
    ELSIF v_km IS NOT NULL AND v_km <= v_radius THEN
      -- Inside the distance: the area is kept only when it is one of the city's areas.
      IF v_zone IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.market_zones z WHERE z.market = v_market AND z.name = v_zone) THEN
        v_zone := NULL;
      END IF;
    ELSIF v_km IS NOT NULL THEN
      RAISE EXCEPTION 'That address is about % km away. This business travels up to % km%.',
        round(v_km, 1), trim_scale(v_radius), CASE WHEN v_by_zone THEN ' and to the areas it lists' ELSE '' END
        USING ERRCODE = '22023';
    ELSIF v_by_km AND NOT v_by_zone THEN
      RAISE EXCEPTION 'Pick your address from the suggestions' USING ERRCODE = '22023';
    ELSIF v_zone IS NOT NULL THEN
      RAISE EXCEPTION 'This business does not go to %. Pick another way.', left(v_zone, 60) USING ERRCODE = '22023';
    ELSE
      RAISE EXCEPTION 'Pick your area from the list' USING ERRCODE = '22023';
    END IF;
    IF v_address IS NULL OR length(v_address) NOT BETWEEN 5 AND 300 THEN
      RAISE EXCEPTION 'Enter the address where the visit happens' USING ERRCODE = '22023';
    END IF;
    IF v_landmark IS NOT NULL AND length(v_landmark) > 200 THEN
      RAISE EXCEPTION 'Keep the directions under 200 characters' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_address := NULL;
    v_landmark := NULL;
    v_zone := NULL;
    v_place := NULL;
    v_travel := 0;
  END IF;
  v_service_price := v_price;

  -- Extras: up to three, each offered as an extra by this business. Time and price add up.
  IF cardinality(v_ids) > 3 THEN
    RAISE EXCEPTION 'Add up to three extras' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_ids) > 0 THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.service_name, 'minutes', s.duration_minutes, 'price', s.price) ORDER BY s.sort_order, s.service_name), '[]'),
           coalesce(sum(s.duration_minutes), 0), v_price + coalesce(sum(s.price), 0)
      INTO v_addons, v_extra, v_price
      FROM public.services s
     WHERE s.id = ANY (v_ids) AND s.id <> p_service_id
       AND s.business_id = p_business_id AND s.is_active = true AND s.is_addon = true;
    IF jsonb_array_length(v_addons) <> cardinality(v_ids) THEN
      RAISE EXCEPTION 'One of the extras is not available. Pick again.' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    v_price := NULL;
  END IF;

  -- Paid online once the business has payouts on: the time is held while the client pays, and
  -- nobody is told about the booking until the payment arrives (payment_succeeded).
  v_base := CASE WHEN cardinality(v_ids) > 0 THEN v_price ELSE v_service_price END;
  SELECT * INTO v_terms FROM public.payment_terms(p_business_id, v_base);
  v_online := coalesce(v_terms.online, false);

  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter your name' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NULL OR length(v_phone) NOT BETWEEN 5 AND 40 OR length(v_digits) < 6 THEN
    RAISE EXCEPTION 'Enter a valid phone number' USING ERRCODE = '22023';
  END IF;

  v_local_now := now() AT TIME ZONE v_tz;
  IF p_date + p_time <= v_local_now THEN
    RAISE EXCEPTION 'That time has already passed' USING ERRCODE = '22023';
  END IF;
  IF p_date + p_time > v_local_now + interval '90 days' THEN
    RAISE EXCEPTION 'Bookings open up to 90 days ahead' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.appointments a
       WHERE a.business_id = p_business_id
         AND a.status IN ('pending', 'confirmed')
         AND a.appointment_date + a.appointment_time > v_local_now
         AND ((v_uid IS NOT NULL AND a.client_id = v_uid)
              OR lower(a.client_email) = v_email
              OR (length(v_digits) >= 9 AND right(regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g'), 9) = right(v_digits, 9)))) >= 2 THEN
    RAISE EXCEPTION 'You already have two upcoming bookings here. Change or cancel one to book another.' USING ERRCODE = 'P0001';
  END IF;

  IF v_uid IS NULL AND (SELECT count(*) FROM public.appointments a
                         WHERE a.client_id IS NULL AND a.source = 'web'
                           AND lower(a.client_email) = v_email
                           AND a.status IN ('pending', 'confirmed')
                           AND a.appointment_date >= current_date) >= 5 THEN
    RAISE EXCEPTION 'This email already has five upcoming bookings. Create a free account to book more.' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.staff_id INTO v_staff
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id, NULL, CASE WHEN cardinality(v_ids) > 0 THEN v_ids END) s
   WHERE s.slot_time = p_time
   LIMIT 1;
  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'That time is not available. Pick another.' USING ERRCODE = '23P01';
  END IF;

  PERFORM set_config('locappoint.actor', 'client', true);
  BEGIN
    INSERT INTO public.appointments (
      business_id, staff_id, client_id, service_id, appointment_date, appointment_time,
      duration_minutes, status, source, client_name, client_email, client_phone, notes, addons, price,
      client_fee, business_fee, payment_status, hold_until, mode,
      client_address, client_landmark, client_zone, travel_fee, client_place_id
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END,
      v_mode,
      v_address, v_landmark, v_zone, coalesce(v_travel, 0), v_place
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    PERFORM set_config('locappoint.actor', '', true);
    RAISE EXCEPTION 'That time was just taken. Pick another.' USING ERRCODE = '23P01';
  END;
  PERFORM set_config('locappoint.actor', '', true);

  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text) TO anon, authenticated, service_role;

-- 5. Addresses, and their place ids, do not outlive the visit.
CREATE OR REPLACE FUNCTION public.clear_visit_addresses()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.appointments
     SET client_address = NULL, client_landmark = NULL, client_place_id = NULL
   WHERE (client_address IS NOT NULL OR client_landmark IS NOT NULL OR client_place_id IS NOT NULL)
     AND appointment_date < current_date - 30;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_visit_addresses() FROM PUBLIC, anon, authenticated;

-- 6. Every night: forget shop coordinates past 30 days, and ask the places function to refresh the
-- ones due. Same Vault secrets as the notify function; places sits next to it.
CREATE OR REPLACE FUNCTION public.places_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT regexp_replace(decrypted_secret, '/notify/?$', '/places')
    FROM vault.decrypted_secrets WHERE name = 'notify_url';
$$;

REVOKE EXECUTE ON FUNCTION public.places_url() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'shop-locations';
SELECT cron.schedule(
  'shop-locations',
  '41 4 * * *',
  $job$
  SELECT public.expire_shop_locations();
  SELECT net.http_post(
    url := public.places_url(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_secret')
    ),
    body := '{"action":"refresh"}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.shop_locations_due(1));
  $job$
);

COMMIT;
