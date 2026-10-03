-- Pay at booking. A business with payouts on is paid online when a client books on Locappoint:
-- card through Stripe in Portugal, bank transfer or card through Paystack in Nigeria. The time is
-- held while the client pays; the booking is announced only when the payment provider confirms it
-- (never because a client says they paid); an unpaid hold is released. Refunds follow one rule:
-- free cancellation until 24 hours before, after that or for a no-show the business keeps half the
-- price; a business cancelling or declining refunds everything.
--
-- Locappoint never holds the money: Stripe charges on the business's own account (direct charge,
-- Locappoint's fee as an application fee), Paystack splits to the business's subaccount.
-- Payment state changes only here, from verified provider events. Safe to run again.
-- Needs engine-foundation.sql (markets, market_rules, business_payouts, appointment money columns).

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.business_payouts') IS NULL OR to_regclass('public.market_rules') IS NULL THEN
    RAISE EXCEPTION 'Run engine-foundation.sql first';
  END IF;
END;
$$;

-- 1. The cancellation rule lives with the other market numbers.
ALTER TABLE public.market_rules ADD COLUMN IF NOT EXISTS free_cancel_hours integer NOT NULL DEFAULT 24;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'market_rules_free_cancel_hours') THEN
    ALTER TABLE public.market_rules ADD CONSTRAINT market_rules_free_cancel_hours CHECK (free_cancel_hours BETWEEN 0 AND 168);
  END IF;
END;
$$;

-- Lagos launches with transfer and card only.
UPDATE public.market_rules SET methods = ARRAY['transfer', 'card'] WHERE market = 'lagos' AND 'cash' = ANY (methods);

-- 2. One row per checkout a client opens. Private: owners read their own; only the payments
-- functions write.
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('stripe', 'paystack')),
  account_ref text NOT NULL CHECK (char_length(account_ref) <= 100),
  checkout_ref text NOT NULL UNIQUE CHECK (char_length(checkout_ref) BETWEEN 8 AND 255),
  checkout_url text CHECK (checkout_url IS NULL OR checkout_url ~ '^https://'),
  payment_ref text CHECK (payment_ref IS NULL OR char_length(payment_ref) <= 255),
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('EUR', 'NGN')),
  platform_fee numeric NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  method text CHECK (method IS NULL OR method IN ('card', 'transfer')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'expired', 'refunded', 'partly_refunded')),
  refunded numeric NOT NULL DEFAULT 0 CHECK (refunded >= 0),
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_appointment ON public.payments (appointment_id);
CREATE INDEX IF NOT EXISTS payments_business ON public.payments (business_id, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;
GRANT SELECT ON public.payments TO authenticated;
DROP POLICY IF EXISTS payments_owner_read ON public.payments;
CREATE POLICY payments_owner_read ON public.payments FOR SELECT USING (public.is_business_owner(business_id));

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Refunds owed, queued here and sent by the payments-webhook function.
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL CHECK (reason IN ('client_cancelled', 'client_late_cancel', 'business_cancelled', 'declined', 'no_show', 'late_payment')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  provider_ref text CHECK (provider_ref IS NULL OR char_length(provider_ref) <= 255),
  attempts integer NOT NULL DEFAULT 0,
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (payment_id, reason)
);

CREATE INDEX IF NOT EXISTS payment_refunds_open ON public.payment_refunds (created_at) WHERE status IN ('queued', 'sending');
CREATE INDEX IF NOT EXISTS payment_refunds_appointment ON public.payment_refunds (appointment_id);

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_refunds FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_refunds FROM authenticated;
GRANT SELECT ON public.payment_refunds TO authenticated;
DROP POLICY IF EXISTS payment_refunds_owner_read ON public.payment_refunds;
CREATE POLICY payment_refunds_owner_read ON public.payment_refunds FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_id AND public.is_business_owner(p.business_id)));

DROP TRIGGER IF EXISTS update_payment_refunds_updated_at ON public.payment_refunds;
CREATE TRIGGER update_payment_refunds_updated_at BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. What a booking costs and whether it is paid online. Private: the business fee never leaves
-- the database. Online only when payouts are on, Stripe or Paystack can see the bank, and there is
-- a price to pay.
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

-- What the booking sheet shows before the client books: price, service fee, total, how to pay and
-- the cancellation rule. Never the business fee.
CREATE OR REPLACE FUNCTION public.payment_quote(p_business_id uuid, p_service_id uuid, p_addon_ids uuid[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_price numeric;
  t record;
BEGIN
  SELECT s.price + coalesce((
           SELECT sum(x.price) FROM public.services x
            WHERE x.id = ANY (coalesce(p_addon_ids, '{}')) AND x.id <> s.id
              AND x.business_id = p_business_id AND x.is_active AND x.is_addon), 0)
    INTO v_price
    FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active;
  IF v_price IS NULL THEN
    RETURN jsonb_build_object('online', false);
  END IF;

  SELECT * INTO t FROM public.payment_terms(p_business_id, v_price);
  IF NOT coalesce(t.online, false) THEN
    RETURN jsonb_build_object('online', false);
  END IF;

  RETURN jsonb_build_object(
    'online', true,
    'provider', t.provider,
    'currency', t.currency,
    'price', v_price,
    'client_fee', t.client_fee,
    'total', v_price + t.client_fee,
    'methods', to_jsonb(t.methods),
    'hold_minutes', t.hold_minutes,
    'policy', jsonb_build_object('free_hours', t.free_hours, 'keep_pct', t.keep_pct, 'no_show_keep_pct', t.no_show_keep_pct)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_quote(uuid, uuid, uuid[]) TO anon, authenticated, service_role;

-- 5. Booking. Same rules as before; a business that takes payment online gets a held time with its
-- fees set, released if nobody pays.
CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[])
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

  SELECT s.duration_minutes, s.price INTO v_duration, v_price FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
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
      client_fee, business_fee, payment_status, hold_until
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, 'web',
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END
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

-- 6. Notices: a held time is silent; it is announced the moment it is paid.
CREATE OR REPLACE FUNCTION public.booking_notice_payload(a appointments)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'business_name', b.business_name,
    'slug', b.slug,
    'address', b.address,
    'city', b.city,
    'country', b.country,
    'timezone', b.timezone,
    'business_phone', b.phone,
    'business_whatsapp', b.whatsapp,
    'auto_confirm', b.auto_confirm,
    'cancel_cutoff_minutes', b.cancel_cutoff_minutes,
    'service_name', s.service_name,
    'staff_name', m.display_name,
    'date', a.appointment_date,
    'time', to_char(a.appointment_time, 'HH24:MI'),
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'status', a.status,
    'client_name', a.client_name,
    'client_phone', a.client_phone,
    'notes', a.notes,
    'cancelled_by', a.cancelled_by,
    'moved_from', to_char(a.rescheduled_from, 'YYYY-MM-DD"T"HH24:MI'),
    'has_account', a.client_id IS NOT NULL,
    'manage_token', (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = a.id),
    'payment_status', a.payment_status,
    'total', a.total,
    'client_fee', a.client_fee,
    'currency', a.currency,
    'refund', (SELECT sum(f.amount) FROM public.payment_refunds f WHERE f.appointment_id = a.id AND f.status <> 'failed')
  )
    FROM public.businesses b
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE b.id = a.business_id;
$function$;

CREATE OR REPLACE FUNCTION public.send_booking_notice(a appointments, p_audience text, p_kind text, p_key text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_payload jsonb := public.booking_notice_payload(a);
  r record;
BEGIN
  -- A held time is not a booking yet: no email, bell or reminder until the payment arrives.
  IF a.payment_status IN ('awaiting', 'failed') THEN
    RETURN;
  END IF;
  -- Extras ride along in the service name, so every email and bell item shows the whole booking.
  IF jsonb_array_length(coalesce(a.addons, '[]')) > 0 THEN
    v_payload := v_payload || jsonb_build_object(
      'service_name', concat_ws(' + ', v_payload->>'service_name', (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(a.addons) x)));
  END IF;
  IF p_audience = 'client' THEN
    IF a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (a.client_id, 'client', p_kind, a.business_id, a.id, v_payload, p_kind || ':client:' || a.client_id || ':' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF a.client_email IS NOT NULL AND (a.client_id IS NOT NULL OR a.source = 'web') THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        p_kind,
        CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN a.client_id END,
        a.client_email, a.business_id, a.id,
        v_payload || jsonb_build_object('audience', 'client'),
        p_kind || ':client:email:' || lower(a.client_email) || ':' || p_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT ON (x.user_id) x.user_id, au.email, (pu.id IS NOT NULL) AS has_profile
      FROM (
        SELECT b.user_id FROM public.businesses b WHERE b.id = a.business_id
        UNION ALL
        SELECT m.user_id FROM public.business_members m
         WHERE m.id = a.staff_id AND m.status = 'active' AND m.user_id IS NOT NULL
      ) x
      LEFT JOIN auth.users au ON au.id = x.user_id
      LEFT JOIN public.users pu ON pu.id = x.user_id
     WHERE x.user_id IS NOT NULL
  LOOP
    IF r.has_profile THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (r.user_id, 'business', p_kind, a.business_id, a.id, v_payload, p_kind || ':business:' || r.user_id || ':' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF r.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        p_kind,
        CASE WHEN r.has_profile THEN r.user_id END,
        r.email, a.business_id, a.id,
        v_payload || jsonb_build_object('audience', 'business'),
        p_kind || ':business:email:' || r.user_id || ':' || p_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_booking_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_by_client boolean;
  v_key text;
BEGIN
  BEGIN
    v_by_client := public.acting_as_client(NEW.business_id, NEW.client_id);

    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('pending', 'confirmed') OR NEW.payment_status = 'awaiting' THEN
        RETURN NULL;
      END IF;
      v_key := NEW.id::text;
      IF NEW.status = 'confirmed' THEN
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
        IF v_by_client OR NEW.source = 'web' THEN
          PERFORM public.send_booking_notice(NEW, 'business', 'booking_new', v_key);
        END IF;
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_requested', v_key);
        PERFORM public.send_booking_notice(NEW, 'business', 'booking_request', v_key);
      END IF;
      RETURN NULL;
    END IF;

    -- A held time either becomes a paid booking (announced now, exactly as a new booking is)
    -- or is released without anyone having been told.
    IF OLD.payment_status = 'awaiting' THEN
      IF NEW.payment_status = 'paid' AND NEW.status IN ('pending', 'confirmed') THEN
        v_key := NEW.id::text;
        IF NEW.status = 'confirmed' THEN
          PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
          PERFORM public.send_booking_notice(NEW, 'business', 'booking_new', v_key);
        ELSE
          PERFORM public.send_booking_notice(NEW, 'client', 'booking_requested', v_key);
          PERFORM public.send_booking_notice(NEW, 'business', 'booking_request', v_key);
        END IF;
      END IF;
      RETURN NULL;
    END IF;

    IF NEW.rescheduled_at IS NOT NULL AND NEW.rescheduled_at IS DISTINCT FROM OLD.rescheduled_at
       AND NEW.status IN ('pending', 'confirmed') THEN
      v_key := NEW.id || ':' || extract(epoch FROM NEW.rescheduled_at)::bigint;
      IF v_by_client THEN
        PERFORM public.send_booking_notice(NEW, 'business',
          CASE WHEN NEW.status = 'pending' THEN 'booking_request' ELSE 'booking_moved' END, 'moved:' || v_key);
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_moved', v_key);
      END IF;
      RETURN NULL;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NULL;
    END IF;

    v_key := NEW.id || ':' || extract(epoch FROM coalesce(NEW.rescheduled_at, NEW.created_at))::bigint;

    IF NEW.status = 'confirmed' AND OLD.status = 'pending' AND NOT v_by_client THEN
      PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
      IF NEW.cancelled_by = 'client' THEN
        PERFORM public.send_booking_notice(NEW, 'business', 'booking_cancelled', v_key);
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client',
          CASE WHEN OLD.status = 'pending' THEN 'booking_declined' ELSE 'booking_cancelled' END, v_key);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.booking_by_link(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'appointment_date', a.appointment_date,
    'appointment_time', a.appointment_time,
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'notes', a.notes,
    'client_name', a.client_name,
    'client_email', a.client_email,
    'cancelled_by', a.cancelled_by,
    'rescheduled_from', a.rescheduled_from,
    'service_id', a.service_id,
    'has_account', a.client_id IS NOT NULL,
    'payment_status', a.payment_status,
    'total', a.total,
    'client_fee', a.client_fee,
    'currency', a.currency,
    'refund', (SELECT sum(f.amount) FROM public.payment_refunds f WHERE f.appointment_id = a.id AND f.status <> 'failed'),
    'policy', (SELECT jsonb_build_object('free_hours', r.free_cancel_hours, 'keep_pct', r.late_cancel_fee_max_pct)
                 FROM public.market_rules r WHERE r.market = b.market),
    'services', jsonb_build_object('id', s.id, 'service_name', s.service_name, 'duration_minutes', s.duration_minutes, 'price', s.price),
    'businesses', jsonb_build_object(
      'id', b.id, 'business_name', b.business_name, 'slug', b.slug, 'address', b.address, 'city', b.city,
      'country', b.country, 'phone', b.phone, 'whatsapp', b.whatsapp, 'timezone', b.timezone,
      'banner_url', b.banner_url, 'logo_url', b.logo_url, 'category', b.category, 'category_detail', b.category_detail,
      'auto_confirm', b.auto_confirm, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes)
  )
    FROM public.booking_links l
    JOIN public.appointments a ON a.id = l.appointment_id
    JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.services s ON s.id = a.service_id
   WHERE l.token = p_token AND length(p_token) >= 32;
$function$;


-- 7. Provider events. Called only by the payments-webhook function after it has verified the
-- provider's signature (and, for Paystack, asked Paystack again).

-- A checkout was paid. The held time becomes a booking; anything else (the hold already released,
-- an amount or currency that does not match) is refunded in full, automatically.
CREATE OR REPLACE FUNCTION public.payment_succeeded(p_checkout_ref text, p_payment_ref text, p_amount numeric, p_currency text, p_method text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pay public.payments;
  a public.appointments;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE checkout_ref = p_checkout_ref FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  IF pay.status IN ('paid', 'refunded', 'partly_refunded') THEN
    RETURN 'duplicate';
  END IF;

  UPDATE public.payments
     SET status = 'paid', payment_ref = left(p_payment_ref, 255), paid_at = now(),
         method = CASE WHEN p_method IN ('card', 'transfer') THEN p_method END
   WHERE id = pay.id;

  IF pay.appointment_id IS NOT NULL THEN
    SELECT * INTO a FROM public.appointments WHERE id = pay.appointment_id FOR UPDATE;
  END IF;

  IF a.id IS NULL OR a.payment_status <> 'awaiting'
     OR upper(p_currency) <> pay.currency OR p_amount <> pay.amount OR a.total <> pay.amount THEN
    INSERT INTO public.payment_refunds (payment_id, appointment_id, amount, reason)
    VALUES (pay.id, a.id, p_amount, 'late_payment')
    ON CONFLICT (payment_id, reason) DO NOTHING;
    RETURN 'refunding';
  END IF;

  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.appointments
     SET payment_status = 'paid',
         payment_method = CASE WHEN p_method IN ('card', 'transfer') THEN p_method END,
         hold_until = NULL
   WHERE id = a.id;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  RETURN 'paid';
END;
$$;

-- A checkout ran out, or the client turned back from it: the held time is free again at once.
CREATE OR REPLACE FUNCTION public.payment_released(p_checkout_ref text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pay public.payments;
BEGIN
  SELECT * INTO pay FROM public.payments WHERE checkout_ref = p_checkout_ref FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  IF pay.status <> 'open' THEN
    RETURN pay.status;
  END IF;
  UPDATE public.payments SET status = 'expired' WHERE id = pay.id;
  DELETE FROM public.appointments WHERE id = pay.appointment_id AND payment_status = 'awaiting';
  RETURN 'released';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_succeeded(text, text, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.payment_released(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_succeeded(text, text, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.payment_released(text) TO service_role;

-- The client turned back from the payment page without paying. Only an open checkout whose time
-- is still held can be let go, found by its checkout reference or its booking id, both known only
-- to the person who opened it.
CREATE OR REPLACE FUNCTION public.payment_abandon(p_checkout_ref text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.payment_released(p.checkout_ref)
    FROM public.payments p
   WHERE length(p_checkout_ref) >= 20 AND p.status = 'open'
     AND (p.checkout_ref = p_checkout_ref OR p.appointment_id::text = p_checkout_ref)
   ORDER BY p.created_at DESC
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_abandon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_abandon(text) TO anon, authenticated, service_role;

-- Where a checkout stands, for the page the client returns to (by checkout reference, or by
-- booking id when they turned back from Stripe). The manage link appears only once it is paid.
CREATE OR REPLACE FUNCTION public.payment_state(p_checkout_ref text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'state', CASE
      WHEN p.status = 'open' AND a.payment_status = 'awaiting' THEN 'waiting'
      WHEN p.status = 'paid' AND a.payment_status = 'paid' THEN 'paid'
      WHEN p.status IN ('paid', 'refunded', 'partly_refunded') AND a.id IS NULL THEN 'refunding'
      WHEN p.status = 'paid' THEN 'paid'
      ELSE 'released' END,
    'status', a.status,
    'business_name', b.business_name,
    'slug', b.slug,
    'address', b.address,
    'city', b.city,
    'timezone', b.timezone,
    'auto_confirm', b.auto_confirm,
    'service_name', concat_ws(' + ', s.service_name, (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(coalesce(a.addons, '[]')) x)),
    'date', a.appointment_date,
    'time', to_char(a.appointment_time, 'HH24:MI'),
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'client_fee', a.client_fee,
    'amount', p.amount,
    'currency', p.currency,
    'provider', p.provider,
    'email', CASE WHEN p.status = 'paid' THEN a.client_email END,
    'manage_token', CASE WHEN p.status = 'paid' AND a.payment_status = 'paid'
                         THEN (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = a.id) END
  )
    FROM public.payments p
    JOIN public.businesses b ON b.id = p.business_id
    LEFT JOIN public.appointments a ON a.id = p.appointment_id
    LEFT JOIN public.services s ON s.id = a.service_id
   WHERE length(p_checkout_ref) >= 20
     AND (p.checkout_ref = p_checkout_ref OR p.appointment_id::text = p_checkout_ref)
   ORDER BY p.created_at DESC
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payment_state(text) TO anon, authenticated, service_role;

-- Every minute: held times nobody paid for are released (two minutes' grace for a late event).
CREATE OR REPLACE FUNCTION public.release_payment_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.payments p SET status = 'expired'
    FROM public.appointments a
   WHERE p.appointment_id = a.id AND p.status = 'open'
     AND a.payment_status = 'awaiting' AND a.hold_until < now() - interval '2 minutes';
  DELETE FROM public.appointments a
   WHERE a.payment_status = 'awaiting' AND a.hold_until < now() - interval '2 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_payment_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_payment_holds() TO service_role;

-- 8. Refunds by the rule. Runs before notify_booking_change (triggers fire by name), so the
-- cancellation email already knows the refund.
CREATE OR REPLACE FUNCTION public.appointments_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pay public.payments;
  t record;
  v_tz text;
  v_start timestamptz;
  v_dec integer;
  v_amount numeric;
  v_reason text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status NOT IN ('cancelled', 'no_show') OR OLD.payment_status NOT IN ('paid', 'partly_refunded') THEN
    RETURN NULL;
  END IF;
  SELECT * INTO pay FROM public.payments
   WHERE appointment_id = NEW.id AND status IN ('paid', 'partly_refunded')
   ORDER BY paid_at DESC NULLS LAST LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO t FROM public.payment_terms(NEW.business_id, NEW.price);
  SELECT b.timezone INTO v_tz FROM public.businesses b WHERE b.id = NEW.business_id;
  v_start := (NEW.appointment_date + NEW.appointment_time) AT TIME ZONE coalesce(v_tz, 'Europe/Lisbon');
  v_dec := CASE WHEN pay.currency = 'NGN' THEN 0 ELSE 2 END;

  IF NEW.status = 'no_show' THEN
    v_reason := 'no_show';
    v_amount := round(coalesce(NEW.price, 0) * (100 - coalesce(t.no_show_keep_pct, 50)) / 100, v_dec);
  ELSIF NEW.cancelled_by = 'client' AND v_start - now() < make_interval(hours => coalesce(t.free_hours, 24)) THEN
    v_reason := 'client_late_cancel';
    v_amount := round(coalesce(NEW.price, 0) * (100 - coalesce(t.keep_pct, 50)) / 100, v_dec);
  ELSIF NEW.cancelled_by = 'client' THEN
    v_reason := 'client_cancelled';
    v_amount := pay.amount;
  ELSIF OLD.status = 'pending' THEN
    v_reason := 'declined';
    v_amount := pay.amount;
  ELSE
    v_reason := 'business_cancelled';
    v_amount := pay.amount;
  END IF;

  v_amount := least(v_amount, pay.amount - pay.refunded);
  IF v_amount > 0 THEN
    INSERT INTO public.payment_refunds (payment_id, appointment_id, amount, reason)
    VALUES (pay.id, NEW.id, v_amount, v_reason)
    ON CONFLICT (payment_id, reason) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointments_refund() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS appointments_refund ON public.appointments;
CREATE TRIGGER appointments_refund
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_refund();

-- The sender takes a few refunds at a time; a refund stuck in sending for ten minutes is retried.
CREATE OR REPLACE FUNCTION public.claim_refunds(p_limit integer DEFAULT 10)
RETURNS TABLE (id uuid, amount numeric, reason text, provider text, account_ref text, payment_ref text, currency text, attempts integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH c AS (
    UPDATE public.payment_refunds f
       SET status = 'sending', attempts = f.attempts + 1
     WHERE f.id IN (
       SELECT x.id FROM public.payment_refunds x
        WHERE x.status = 'queued' OR (x.status = 'sending' AND x.updated_at < now() - interval '10 minutes')
        ORDER BY x.created_at
        LIMIT greatest(1, least(p_limit, 50))
        FOR UPDATE SKIP LOCKED)
    RETURNING f.*
  )
  SELECT c.id, c.amount, c.reason, p.provider, p.account_ref, p.payment_ref, p.currency, c.attempts
    FROM c JOIN public.payments p ON p.id = c.payment_id;
$$;

CREATE OR REPLACE FUNCTION public.refund_done(p_refund uuid, p_ok boolean, p_provider_ref text, p_error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  f public.payment_refunds;
  pay public.payments;
  v_state text;
BEGIN
  SELECT * INTO f FROM public.payment_refunds WHERE id = p_refund FOR UPDATE;
  IF NOT FOUND OR f.status <> 'sending' THEN
    RETURN;
  END IF;

  IF NOT p_ok THEN
    UPDATE public.payment_refunds
       SET status = CASE WHEN f.attempts >= 5 THEN 'failed' ELSE 'queued' END, last_error = left(p_error, 500)
     WHERE id = f.id;
    RETURN;
  END IF;

  UPDATE public.payment_refunds SET status = 'sent', provider_ref = left(p_provider_ref, 255), sent_at = now(), last_error = NULL
   WHERE id = f.id;
  UPDATE public.payments
     SET refunded = refunded + f.amount,
         status = CASE WHEN refunded + f.amount >= amount THEN 'refunded' ELSE 'partly_refunded' END
   WHERE id = f.payment_id
  RETURNING * INTO pay;
  v_state := CASE WHEN pay.refunded >= pay.amount THEN 'refunded' ELSE 'partly_refunded' END;

  IF f.appointment_id IS NOT NULL THEN
    PERFORM set_config('locappoint.trusted_write', 'on', true);
    UPDATE public.appointments SET payment_status = v_state WHERE id = f.appointment_id AND payment_status IN ('paid', 'partly_refunded');
    PERFORM set_config('locappoint.trusted_write', 'off', true);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_refunds(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_done(uuid, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_refunds(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_done(uuid, boolean, text, text) TO service_role;

-- 9. Wake the sender as soon as a refund is owed. Same Vault secrets as the notify function; the
-- payments-webhook function sits next to it. Never blocks the cancellation.
CREATE OR REPLACE FUNCTION public.payments_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT regexp_replace(decrypted_secret, '/notify/?$', '/payments-webhook')
    FROM vault.decrypted_secrets WHERE name = 'notify_url';
$$;

REVOKE EXECUTE ON FUNCTION public.payments_url() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.payment_refunds_kick()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := public.payments_url(),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_secret')
      ),
      body := '{"reason":"refund"}'::jsonb
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_refunds_kick() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS payment_refunds_kick ON public.payment_refunds;
CREATE TRIGGER payment_refunds_kick
  AFTER INSERT ON public.payment_refunds
  FOR EACH STATEMENT EXECUTE FUNCTION public.payment_refunds_kick();

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'payments-every-minute';

SELECT cron.schedule(
  'payments-every-minute',
  '* * * * *',
  $job$
  SELECT public.release_payment_holds();
  SELECT net.http_post(
    url := public.payments_url(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_secret')
    ),
    body := '{"reason":"cron"}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM public.payment_refunds WHERE status IN ('queued', 'sending'));
  $job$
);

COMMIT;
