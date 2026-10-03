-- Engine foundation: markets (Porto, Lagos, Lisbon) with their currency and payment provider, fee and
-- policy rules kept in the database so the numbers change without a rebuild, where a service can
-- happen (at the business, at the client, online) and for how many people, money and payment state
-- on every booking, and a private payout record per business. Nothing here changes what anyone sees.
-- Safe to run again.

BEGIN;

-- 1. Markets: the cities the engine serves.
CREATE TABLE IF NOT EXISTS public.markets (
  code text PRIMARY KEY CHECK (code ~ '^[a-z]+$'),
  name text NOT NULL,
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  currency text NOT NULL CHECK (currency IN ('EUR', 'NGN')),
  timezone text NOT NULL,
  payment_provider text NOT NULL CHECK (payment_provider IN ('stripe', 'paystack')),
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO public.markets (code, name, country, currency, timezone, payment_provider, featured, sort_order) VALUES
  ('porto', 'Porto', 'PT', 'EUR', 'Europe/Lisbon', 'stripe', true, 1),
  ('lagos', 'Lagos', 'NG', 'NGN', 'Africa/Lagos', 'paystack', true, 2),
  ('lisbon', 'Lisbon', 'PT', 'EUR', 'Europe/Lisbon', 'stripe', false, 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, country = EXCLUDED.country, currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone, payment_provider = EXCLUDED.payment_provider;

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS markets_read ON public.markets;
CREATE POLICY markets_read ON public.markets FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.markets FROM anon, authenticated;

-- Areas a home service can cover. Lagos is too big and too slow for a radius.
CREATE TABLE IF NOT EXISTS public.market_zones (
  market text NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (market, name)
);

INSERT INTO public.market_zones (market, name, sort_order)
SELECT 'lagos', z, n FROM unnest(ARRAY[
  'Lekki', 'Ajah', 'Victoria Island', 'Ikoyi', 'Lagos Island', 'Ikeja', 'Maryland', 'Magodo',
  'Ojodu', 'Ogba', 'Gbagada', 'Yaba', 'Surulere', 'Festac', 'Apapa', 'Egbeda', 'Ikorodu', 'Ojo'
]) WITH ORDINALITY AS t(z, n)
ON CONFLICT (market, name) DO NOTHING;

ALTER TABLE public.market_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS market_zones_read ON public.market_zones;
CREATE POLICY market_zones_read ON public.market_zones FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.market_zones FROM anon, authenticated;

-- 2. Fees and policies per market. Private: read only through database functions.
-- confirmed = false means the numbers are working placeholders, not yet set by Vincent.
CREATE TABLE IF NOT EXISTS public.market_rules (
  market text PRIMARY KEY REFERENCES public.markets(code) ON DELETE CASCADE,
  client_fee_pct numeric NOT NULL CHECK (client_fee_pct BETWEEN 0 AND 20),
  client_fee_min numeric NOT NULL CHECK (client_fee_min >= 0),
  client_fee_max numeric NOT NULL,
  business_fee_pct numeric NOT NULL CHECK (business_fee_pct BETWEEN 0 AND 30),
  business_fee_fixed numeric NOT NULL CHECK (business_fee_fixed >= 0),
  first_month_free boolean NOT NULL DEFAULT true,
  methods text[] NOT NULL,
  hold_minutes_card integer NOT NULL DEFAULT 10 CHECK (hold_minutes_card BETWEEN 5 AND 60),
  hold_minutes_transfer integer NOT NULL DEFAULT 35 CHECK (hold_minutes_transfer BETWEEN 30 AND 120),
  late_cancel_fee_max_pct numeric NOT NULL DEFAULT 50 CHECK (late_cancel_fee_max_pct BETWEEN 0 AND 100),
  no_show_fee_pct numeric NOT NULL DEFAULT 50 CHECK (no_show_fee_pct BETWEEN 0 AND 100),
  dispute_window_hours integer NOT NULL DEFAULT 48 CHECK (dispute_window_hours BETWEEN 1 AND 336),
  confirmed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_rules_fee_range CHECK (client_fee_max >= client_fee_min),
  CONSTRAINT market_rules_methods CHECK (cardinality(methods) >= 1 AND methods <@ ARRAY['card', 'transfer', 'cash'])
);

INSERT INTO public.market_rules (market, client_fee_pct, client_fee_min, client_fee_max, business_fee_pct, business_fee_fixed, methods) VALUES
  ('porto', 2, 0.49, 4.90, 2.9, 0.20, ARRAY['card']),
  ('lisbon', 2, 0.49, 4.90, 2.9, 0.20, ARRAY['card']),
  ('lagos', 2, 200, 2000, 2.9, 100, ARRAY['transfer', 'card'])
ON CONFLICT (market) DO NOTHING;

ALTER TABLE public.market_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_rules FROM anon, authenticated;

-- 3. Where a business is, in engine terms. Derived from country and city, never typed.
CREATE OR REPLACE FUNCTION public.market_for(p_country text, p_city text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_country = 'NG' AND lower(btrim(p_city)) = 'lagos' THEN 'lagos'
    WHEN p_country = 'PT' AND lower(btrim(p_city)) = ANY (ARRAY[
      'porto', 'oporto', 'arouca', 'espinho', 'gondomar', 'maia', 'matosinhos', 'oliveira de azeméis', 'paredes',
      'póvoa de varzim', 'santa maria da feira', 'santo tirso', 'são joão da madeira', 'trofa', 'vale de cambra',
      'valongo', 'vila nova de gaia', 'vila do conde']) THEN 'porto'
    WHEN p_country = 'PT' AND lower(btrim(p_city)) = ANY (ARRAY[
      'lisbon', 'lisboa', 'alcochete', 'almada', 'amadora', 'barreiro', 'cascais', 'loures', 'mafra', 'moita',
      'montijo', 'odivelas', 'oeiras', 'palmela', 'seixal', 'sesimbra', 'setúbal', 'sintra', 'vila franca de xira']) THEN 'lisbon'
  END;
$$;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS market text REFERENCES public.markets(code);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS currency text GENERATED ALWAYS AS (CASE WHEN country = 'NG' THEN 'NGN' ELSE 'EUR' END) STORED;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS meeting_url text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS service_zones text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS service_radius_km numeric;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_meeting_url_https') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_meeting_url_https
      CHECK (meeting_url IS NULL OR (meeting_url ~ '^https://[^\s]+$' AND char_length(meeting_url) <= 300));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_service_radius') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_service_radius
      CHECK (service_radius_km IS NULL OR service_radius_km BETWEEN 1 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_service_zones') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_service_zones
      CHECK (cardinality(service_zones) <= 40);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.businesses_market()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.market := public.market_for(NEW.country, NEW.city);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.businesses_market() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS businesses_market ON public.businesses;
CREATE TRIGGER businesses_market
  BEFORE INSERT OR UPDATE OF country, city, market ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_market();

UPDATE public.businesses SET market = public.market_for(country, city)
 WHERE market IS DISTINCT FROM public.market_for(country, city);

CREATE INDEX IF NOT EXISTS idx_businesses_market ON public.businesses (market) WHERE is_active = true;

-- 4. Where a service can happen, and for how many people.
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS modes text[] NOT NULL DEFAULT '{at_business}';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS travel_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS max_people integer NOT NULL DEFAULT 1;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_per text NOT NULL DEFAULT 'booking';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS extra_person_minutes integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_modes') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_modes
      CHECK (cardinality(modes) BETWEEN 1 AND 3 AND modes <@ ARRAY['at_business', 'at_client', 'online']);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_travel_fee') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_travel_fee CHECK (travel_fee >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_max_people') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_max_people CHECK (max_people BETWEEN 1 AND 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_price_per') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_price_per CHECK (price_per IN ('booking', 'person'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_extra_person_minutes') THEN
    ALTER TABLE public.services ADD CONSTRAINT services_extra_person_minutes
      CHECK (extra_person_minutes IS NULL OR extra_person_minutes BETWEEN 0 AND 720);
  END IF;
END;
$$;

-- 5. Money, place and party size on every booking.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'at_business';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS people integer NOT NULL DEFAULT 1;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_landmark text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_zone text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS meeting_url text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS travel_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS business_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'at_visit';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS hold_until timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_mode') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_mode CHECK (mode IN ('at_business', 'at_client', 'online'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_people') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_people CHECK (people BETWEEN 1 AND 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_place_lengths') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_place_lengths CHECK (
      (client_address IS NULL OR char_length(client_address) <= 300)
      AND (client_landmark IS NULL OR char_length(client_landmark) <= 200)
      AND (client_zone IS NULL OR char_length(client_zone) <= 60)
      AND (meeting_url IS NULL OR (meeting_url ~ '^https://[^\s]+$' AND char_length(meeting_url) <= 300)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_currency') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_currency CHECK (currency IS NULL OR currency IN ('EUR', 'NGN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_fees') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_fees CHECK (travel_fee >= 0 AND client_fee >= 0 AND business_fee >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_payment_status') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_status
      CHECK (payment_status IN ('at_visit', 'awaiting', 'paid', 'refunded', 'partly_refunded', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_payment_method') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_payment_method
      CHECK (payment_method IS NULL OR payment_method IN ('card', 'transfer', 'cash'));
  END IF;
END;
$$;

-- Currency and total are always derived. Money, payment state, place and party size change only
-- through database functions that set the trusted flag, never from an owner's direct update.
CREATE OR REPLACE FUNCTION public.appointments_money()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business public.businesses;
BEGIN
  SELECT * INTO v_business FROM public.businesses b WHERE b.id = NEW.business_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.mode = 'online' AND NEW.meeting_url IS NULL THEN
      NEW.meeting_url := v_business.meeting_url;
    END IF;
  ELSIF current_setting('locappoint.trusted_write', true) IS DISTINCT FROM 'on' THEN
    NEW.mode := OLD.mode;
    NEW.people := OLD.people;
    NEW.client_address := OLD.client_address;
    NEW.client_landmark := OLD.client_landmark;
    NEW.client_zone := OLD.client_zone;
    NEW.travel_fee := OLD.travel_fee;
    NEW.client_fee := OLD.client_fee;
    NEW.business_fee := OLD.business_fee;
    NEW.payment_status := OLD.payment_status;
    NEW.payment_method := OLD.payment_method;
    NEW.hold_until := OLD.hold_until;
  END IF;

  NEW.currency := COALESCE(OLD.currency, v_business.currency, NEW.currency);
  NEW.total := COALESCE(NEW.price, 0) + NEW.travel_fee + NEW.client_fee;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointments_money() FROM PUBLIC, anon, authenticated;

-- Named to run after appointments_lifecycle, which fills the price on insert.
DROP TRIGGER IF EXISTS appointments_money ON public.appointments;
CREATE TRIGGER appointments_money
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_money();

-- Existing bookings: currency from their business, total from their price. Their updated_at stays as it was.
ALTER TABLE public.appointments DISABLE TRIGGER update_appointments_updated_at;
UPDATE public.appointments a
   SET currency = b.currency
  FROM public.businesses b
 WHERE b.id = a.business_id AND (a.currency IS NULL OR a.total IS NULL);
ALTER TABLE public.appointments ENABLE TRIGGER update_appointments_updated_at;

-- 6. Payouts: one private record per business, written only by the payments functions.
CREATE TABLE IF NOT EXISTS public.business_payouts (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe', 'paystack')),
  account_ref text CHECK (account_ref IS NULL OR char_length(account_ref) <= 100),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'active', 'restricted')),
  bank_name text CHECK (bank_name IS NULL OR char_length(bank_name) <= 100),
  account_last4 text CHECK (account_last4 IS NULL OR account_last4 ~ '^[0-9]{4}$'),
  details_due text[] NOT NULL DEFAULT '{}',
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_payouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_payouts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.business_payouts FROM authenticated;
GRANT SELECT ON public.business_payouts TO authenticated;
DROP POLICY IF EXISTS business_payouts_owner_read ON public.business_payouts;
CREATE POLICY business_payouts_owner_read ON public.business_payouts
  FOR SELECT USING (public.is_business_owner(business_id));

DROP TRIGGER IF EXISTS update_business_payouts_updated_at ON public.business_payouts;
CREATE TRIGGER update_business_payouts_updated_at
  BEFORE UPDATE ON public.business_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
