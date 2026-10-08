-- WhatsApp agent for clients (WhatsApp v1, part 3b). Someone writes to the Locappoint number; the
-- agent finds the business or the right one, shows free times, and books, moves or cancels through
-- the same functions as the website. Every fact comes from these functions, never from the model.
-- - Nothing is booked, moved or cancelled until the client taps Yes (or answers yes) to a summary.
-- - No account: the client is their WhatsApp number. Email is optional.
-- - Services paid at booking: the time is held and the client gets a Stripe Checkout link; the
--   booking confirms only from the payment webhook.
-- - Their messages after booking (request received, confirmed, declined, moved, cancelled,
--   reminders) come on WhatsApp, for bookings made on WhatsApp.
-- - A client's bookings here are the ones made from this WhatsApp number, nothing else.
-- Needs whatsapp.sql, actor-fix.sql, pay-at-booking.sql, formats-groups.sql, engine-v1.sql. Safe to run again.

BEGIN;

-- 1. The conversation the agent remembers: the business in focus, the client's name and email if
--    given, the last turns, and one action waiting for a yes. Forgotten after 24 hours without a message.
CREATE TABLE IF NOT EXISTS public.wa_threads (
  phone text PRIMARY KEY CHECK (phone ~ '^[0-9]{8,15}$'),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  client_name text CHECK (client_name IS NULL OR char_length(client_name) <= 120),
  client_email text CHECK (client_email IS NULL OR char_length(client_email) <= 254),
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wa_threads ADD COLUMN IF NOT EXISTS lang text CHECK (lang IS NULL OR lang IN ('en', 'pt'));
ALTER TABLE public.wa_threads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_threads FROM anon, authenticated;

-- 2. What the agent costs, per day, and the switch and cap that stop it.
ALTER TABLE public.wa_config ADD COLUMN IF NOT EXISTS agent_on boolean NOT NULL DEFAULT true;
ALTER TABLE public.wa_config ADD COLUMN IF NOT EXISTS agent_cap_eur numeric NOT NULL DEFAULT 5 CHECK (agent_cap_eur >= 0);

CREATE TABLE IF NOT EXISTS public.wa_agent_days (
  day date PRIMARY KEY,
  calls integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cost_eur numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.wa_agent_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_agent_days FROM anon, authenticated;

-- 3. Helpers. Only bookings made from this WhatsApp number are "theirs".
CREATE OR REPLACE FUNCTION public.wa_mine(p_phone text, p_appointment uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.id = p_appointment AND a.source = 'whatsapp'
       AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = p_phone)
$$;

-- One booking as the agent and the client messages see it.
CREATE OR REPLACE FUNCTION public.wa_client_view(p_appointment uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', a.id, 'status', a.status, 'payment_status', a.payment_status, 'hold_until', a.hold_until,
    'price', a.price, 'total', a.total, 'client_fee', a.client_fee, 'currency', coalesce(a.currency, b.currency),
    'business_id', b.id, 'business_name', b.business_name, 'slug', b.slug, 'address', b.address, 'city', b.city,
    'service_id', a.service_id, 'service_name', coalesce(s.service_name, 'Booking'), 'date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'),
    'minutes', a.duration_minutes, 'staff_name', m.display_name, 'mode', a.mode, 'people', a.people,
    'timezone', b.timezone, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes,
    'meeting_url', CASE WHEN a.mode = 'online' AND a.status = 'confirmed' THEN coalesce(a.meeting_url, b.meeting_url) END,
    'manage_token', (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = a.id))
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE a.id = p_appointment
$$;

-- 4. The conversation: read it (fresh after 24 quiet hours) and save it.
CREATE OR REPLACE FUNCTION public.wa_thread(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.wa_threads;
BEGIN
  IF p_phone !~ '^[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'Bad phone' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.wa_threads (phone) VALUES (p_phone) ON CONFLICT (phone) DO NOTHING;
  UPDATE public.wa_threads
     SET history = '[]'::jsonb, pending = NULL, business_id = NULL, updated_at = now()
   WHERE phone = p_phone AND updated_at < now() - interval '24 hours';
  SELECT * INTO t FROM public.wa_threads WHERE phone = p_phone;
  RETURN jsonb_build_object(
    'business', (SELECT jsonb_build_object('business_id', b.id, 'name', b.business_name, 'slug', b.slug, 'city', b.city)
                   FROM public.businesses b WHERE b.id = t.business_id),
    'name', t.client_name, 'email', t.client_email, 'lang', t.lang, 'history', t.history,
    'pending', CASE WHEN (t.pending->>'expires_at')::timestamptz > now() THEN t.pending END);
END;
$$;

DROP FUNCTION IF EXISTS public.wa_thread_save(text, jsonb, uuid, text, text, jsonb);

-- The last 16 turns are kept. Business, name and email keep their value unless a new one is given;
-- pending is replaced as given (NULL clears it).
CREATE OR REPLACE FUNCTION public.wa_thread_save(p_phone text, p_history jsonb, p_business uuid, p_name text, p_email text, p_pending jsonb, p_lang text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.wa_threads
     SET history = coalesce((SELECT jsonb_agg(x ORDER BY i) FROM (
                      SELECT x, i FROM jsonb_array_elements(coalesce(p_history, '[]'::jsonb)) WITH ORDINALITY AS h(x, i)
                       ORDER BY i DESC LIMIT 16) y), '[]'::jsonb),
         business_id = coalesce(p_business, business_id),
         client_name = coalesce(left(NULLIF(trim(p_name), ''), 120), client_name),
         client_email = coalesce(CASE WHEN lower(trim(p_email)) ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN left(lower(trim(p_email)), 254) END, client_email),
         pending = p_pending,
         lang = CASE WHEN p_lang IN ('en', 'pt') THEN p_lang ELSE lang END,
         updated_at = now()
   WHERE phone = p_phone;
END;
$$;

-- 5. What the agent may know. Businesses by name or page address; never a demo unless named exactly.
CREATE OR REPLACE FUNCTION public.wa_find(p_query text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (SELECT lower(trim(coalesce(p_query, ''))) AS raw,
                    replace(replace(replace(lower(trim(coalesce(p_query, ''))), '\', ''), '%', ''), '_', '') AS clean)
  SELECT coalesce(jsonb_agg(x ORDER BY ord, name), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('business_id', b.id, 'name', b.business_name, 'slug', b.slug, 'city', b.city,
                              'area', b.neighbourhood, 'category', b.category) AS x,
           CASE WHEN b.slug = q.raw THEN 0 ELSE 1 END AS ord, b.business_name AS name
      FROM public.businesses b, q
     WHERE b.is_active AND b.suspended_at IS NULL AND length(q.clean) BETWEEN 2 AND 80
       AND (b.slug = q.raw
            OR (NOT b.is_demo AND (b.business_name ILIKE '%' || q.clean || '%' OR b.slug ILIKE '%' || replace(q.clean, ' ', '-') || '%')))
     ORDER BY 2, 3 LIMIT 5) y
$$;

-- One business: where, when it is open, what it offers and what it costs.
CREATE OR REPLACE FUNCTION public.wa_business(p_business uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'business_id', b.id, 'name', b.business_name, 'slug', b.slug, 'category', b.category,
    'address', b.address, 'area', b.neighbourhood, 'city', b.city, 'market', b.market, 'timezone', b.timezone,
    'phone', b.phone, 'whatsapp', b.whatsapp, 'description', left(b.description, 400),
    'confirms_automatically', b.auto_confirm, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes, 'currency', b.currency,
    'today', (now() AT TIME ZONE b.timezone)::date, 'now', to_char(now() AT TIME ZONE b.timezone, 'HH24:MI'),
    'hours', coalesce((
      SELECT jsonb_agg(jsonb_build_object('day', d.dname, 'open', d.ranges) ORDER BY d.dow)
        FROM (SELECT h.day_of_week AS dow,
                     (ARRAY['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[h.day_of_week + 1] AS dname,
                     string_agg(DISTINCT to_char(h.start_time, 'HH24:MI') || '-' || to_char(h.end_time, 'HH24:MI'), ', ') AS ranges
                FROM public.availability h
               WHERE h.business_id = b.id AND h.is_active
               GROUP BY h.day_of_week) d), '[]'::jsonb),
    'services', coalesce((
      SELECT jsonb_agg(jsonb_build_object('service_id', s.id, 'name', s.service_name, 'minutes', s.duration_minutes,
               'price', s.price, 'price_per', s.price_per, 'max_people', s.max_people, 'ways', s.modes,
               'about', left(s.description, 200)) ORDER BY s.sort_order, s.service_name)
        FROM public.services s WHERE s.business_id = b.id AND s.is_active AND NOT s.is_addon), '[]'::jsonb))
    FROM public.businesses b
   WHERE b.id = p_business AND b.is_active AND b.suspended_at IS NULL
$$;

-- Free times for one service on one day (another booking of theirs can be ignored, for a move).
CREATE OR REPLACE FUNCTION public.wa_times(p_business uuid, p_service uuid, p_date date, p_ignore uuid DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb) FROM (
    SELECT DISTINCT to_char(s.slot_time, 'HH24:MI') AS t
      FROM public.get_available_slots(p_business, p_service, p_date, NULL, p_ignore, NULL, greatest(coalesce(p_people, 1), 1)) s
     LIMIT 48) x
$$;

-- Price before booking: what is paid now online, or at the visit.
CREATE OR REPLACE FUNCTION public.wa_quote(p_business uuid, p_service uuid, p_mode text DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.payment_quote(p_business, p_service, NULL, p_mode, greatest(coalesce(p_people, 1), 1))
      || jsonb_build_object('service_price', s.price, 'price_per', s.price_per, 'currency_hint', b.currency,
                            'cancel_cutoff_minutes', b.cancel_cutoff_minutes, 'confirms_automatically', b.auto_confirm)
    FROM public.services s JOIN public.businesses b ON b.id = s.business_id
   WHERE s.id = p_service AND s.business_id = p_business
$$;

-- "What do you need?" from WhatsApp: the same engine as the website. Visits at the client's place
-- are left out until the address flow comes to WhatsApp.
CREATE OR REPLACE FUNCTION public.wa_search(p_market text, p_query text, p_dates date[] DEFAULT NULL, p_window text DEFAULT 'any', p_at time DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r jsonb;
BEGIN
  r := public.engine_match(lower(trim(p_market)), p_query, NULL, p_dates,
                           CASE WHEN p_window IN ('morning', 'afternoon', 'evening') THEN p_window ELSE 'any' END,
                           p_at, greatest(coalesce(p_people, 1), 1), NULL, NULL, NULL);
  RETURN r || jsonb_build_object(
    'options', coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(r->'options') o WHERE o->>'mode' IS DISTINCT FROM 'at_client'), '[]'::jsonb),
    'later', coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(r->'later') o WHERE o->>'mode' IS DISTINCT FROM 'at_client'), '[]'::jsonb));
END;
$$;

-- 6. Book, after the client said yes. The same book_appointment as the website, marked as WhatsApp,
--    with the WhatsApp number as the phone. Three upcoming WhatsApp bookings per number at most.
CREATE OR REPLACE FUNCTION public.wa_book(p_phone text, p_business uuid, p_service uuid, p_date date, p_time time,
                                          p_name text, p_email text DEFAULT NULL, p_mode text DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_modes text[];
  v_mode text;
  v_id uuid;
BEGIN
  IF p_phone !~ '^[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'Bad phone' USING ERRCODE = '22023';
  END IF;
  SELECT s.modes INTO v_modes FROM public.services s WHERE s.id = p_service AND s.business_id = p_business AND s.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;
  v_mode := CASE WHEN NULLIF(p_mode, '') IS NOT NULL THEN p_mode
                 WHEN 'at_business' = ANY (v_modes) THEN 'at_business'
                 WHEN 'online' = ANY (v_modes) THEN 'online'
                 ELSE v_modes[1] END;
  IF v_mode = 'at_client' THEN
    RAISE EXCEPTION 'Visits at your place are booked on the business page for now' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.appointments a
        JOIN public.businesses b ON b.id = a.business_id
       WHERE a.source = 'whatsapp' AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = p_phone
         AND a.status IN ('pending', 'confirmed') AND a.payment_status <> 'failed'
         AND a.appointment_date + a.appointment_time > now() AT TIME ZONE b.timezone) >= 3 THEN
    RAISE EXCEPTION 'You already have three upcoming bookings from WhatsApp. Change or cancel one first.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('locappoint.channel', 'whatsapp', true);
  BEGIN
    v_id := public.book_appointment(
      p_business_id => p_business, p_service_id => p_service, p_date => p_date, p_time => p_time,
      p_client_name => p_name, p_client_email => NULLIF(trim(coalesce(p_email, '')), ''), p_client_phone => '+' || p_phone,
      p_mode => v_mode, p_people => greatest(coalesce(p_people, 1), 1));
  EXCEPTION WHEN others THEN
    PERFORM set_config('locappoint.channel', '', true);
    RAISE;
  END;
  PERFORM set_config('locappoint.channel', '', true);
  RETURN public.wa_client_view(v_id);
END;
$$;

-- Their upcoming bookings made from this number, and a hold still waiting for payment.
CREATE OR REPLACE FUNCTION public.wa_my(p_phone text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(public.wa_client_view(a.id) ORDER BY a.appointment_date, a.appointment_time), '[]'::jsonb)
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
   WHERE a.source = 'whatsapp' AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = p_phone
     AND a.status IN ('pending', 'confirmed')
     AND (a.payment_status <> 'awaiting' OR a.hold_until > now())
     AND a.payment_status <> 'failed'
     AND a.appointment_date + a.appointment_time > now() AT TIME ZONE b.timezone
$$;

-- Cancel and move: their own booking only, by the manage-link rules (cut-off, free times).
CREATE OR REPLACE FUNCTION public.wa_cancel(p_phone text, p_appointment uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.wa_mine(p_phone, p_appointment) THEN
    RAISE EXCEPTION 'That booking was not made from this WhatsApp' USING ERRCODE = '42501';
  END IF;
  PERFORM public.cancel_by_link((SELECT l.token FROM public.booking_links l WHERE l.appointment_id = p_appointment));
  RETURN public.wa_client_view(p_appointment);
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_move(p_phone text, p_appointment uuid, p_date date, p_time time)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.wa_mine(p_phone, p_appointment) THEN
    RAISE EXCEPTION 'That booking was not made from this WhatsApp' USING ERRCODE = '42501';
  END IF;
  PERFORM public.reschedule_by_link((SELECT l.token FROM public.booking_links l WHERE l.appointment_id = p_appointment), p_date, p_time);
  RETURN public.wa_client_view(p_appointment);
END;
$$;

-- 7. The client's messages after booking, on WhatsApp, for bookings made on WhatsApp. Called from
--    send_booking_notice, so they follow exactly the same rules as the emails.
CREATE OR REPLACE FUNCTION public.wa_client_notice(a public.appointments, p_kind text, p_payload jsonb, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g');
BEGIN
  IF a.source <> 'whatsapp' OR v_phone !~ '^[0-9]{8,15}$'
     OR p_kind NOT IN ('booking_requested', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'booking_moved', 'booking_reminder') THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.wa_contacts c WHERE c.phone = v_phone AND c.stopped_at IS NOT NULL) THEN
    RETURN;
  END IF;
  INSERT INTO public.notification_queue (kind, channel, business_id, appointment_id, payload, dedupe_key)
  VALUES ('wa_client_' || p_kind, 'whatsapp', a.business_id, a.id,
          p_payload || jsonb_build_object('phone', v_phone, 'event', p_kind, 'audience', 'client', 'appointment_id', a.id,
                                          'lang', coalesce((SELECT t.lang FROM public.wa_threads t WHERE t.phone = v_phone), 'en')),
          'wa:' || p_kind || ':client:' || v_phone || ':' || p_key)
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$$;

-- 8. Cost: the switch, today's cap, and what was spent.
CREATE OR REPLACE FUNCTION public.wa_agent_budget()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'on', c.agent_on,
    'cap', c.agent_cap_eur,
    'spent', coalesce((SELECT d.cost_eur FROM public.wa_agent_days d WHERE d.day = current_date), 0),
    'left', c.agent_cap_eur - coalesce((SELECT d.cost_eur FROM public.wa_agent_days d WHERE d.day = current_date), 0))
    FROM public.wa_config c WHERE c.id = 1
$$;

CREATE OR REPLACE FUNCTION public.wa_agent_spent(p_input integer, p_output integer, p_cost numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.wa_agent_days AS d (day, calls, input_tokens, output_tokens, cost_eur)
  VALUES (current_date, 1, greatest(p_input, 0), greatest(p_output, 0), greatest(p_cost, 0))
  ON CONFLICT (day) DO UPDATE
    SET calls = d.calls + 1, input_tokens = d.input_tokens + EXCLUDED.input_tokens,
        output_tokens = d.output_tokens + EXCLUDED.output_tokens, cost_eur = d.cost_eur + EXCLUDED.cost_eur;
$$;

-- The number on business pages, only once WhatsApp is live and the agent is on.
CREATE OR REPLACE FUNCTION public.wa_book_number()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.number FROM public.wa_config c WHERE c.id = 1 AND c.live AND c.agent_on
$$;

-- 9. Admin: every WhatsApp conversation, newest first, and one in full.
CREATE OR REPLACE FUNCTION public.admin_wa_threads(p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_q text := NULLIF(regexp_replace(coalesce(p_search, ''), '[^0-9A-Za-z ]', '', 'g'), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH t AS (
      SELECT m.phone, max(m.created_at) AS last_at, count(*) AS messages,
             count(*) FILTER (WHERE m.direction = 'in') AS inbound
        FROM public.wa_messages m
       GROUP BY m.phone),
    rows AS (
      SELECT t.*, c.profile_name, u.full_name AS linked_name,
             (SELECT left(x.body, 140) FROM public.wa_messages x WHERE x.phone = t.phone ORDER BY x.id DESC LIMIT 1) AS last_body,
             (SELECT count(*) FROM public.appointments a WHERE a.source = 'whatsapp'
                 AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = t.phone) AS bookings
        FROM t
        LEFT JOIN public.wa_contacts c ON c.phone = t.phone
        LEFT JOIN public.users u ON u.id = c.user_id AND c.verified_at IS NOT NULL
       WHERE v_q IS NULL
          OR (regexp_replace(v_q, '\D', '', 'g') <> '' AND t.phone LIKE '%' || regexp_replace(v_q, '\D', '', 'g') || '%')
          OR c.profile_name ILIKE '%' || v_q || '%' OR u.full_name ILIKE '%' || v_q || '%')
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM rows),
      'rows', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.last_at DESC) FROM (
                 SELECT * FROM rows ORDER BY last_at DESC LIMIT least(greatest(coalesce(p_limit, 50), 1), 100) OFFSET greatest(coalesce(p_offset, 0), 0)) r), '[]'::jsonb)));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_wa_thread(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'phone', p_phone,
    'messages', coalesce((SELECT jsonb_agg(jsonb_build_object('direction', m.direction, 'kind', m.kind, 'body', m.body, 'at', m.created_at) ORDER BY m.id)
                            FROM (SELECT * FROM public.wa_messages x WHERE x.phone = p_phone ORDER BY x.id DESC LIMIT 300) m), '[]'::jsonb),
    'bookings', coalesce((SELECT jsonb_agg(public.wa_client_view(a.id) ORDER BY a.created_at DESC)
                            FROM public.appointments a WHERE a.source = 'whatsapp'
                             AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = p_phone), '[]'::jsonb));
END;
$$;

-- 10. Tidy: conversations idle 30 days go; cost days stay a year.
CREATE OR REPLACE FUNCTION public.wa_tidy()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.wa_messages WHERE created_at < now() - interval '90 days';
  DELETE FROM public.wa_codes WHERE expires_at < now() - interval '1 day';
  DELETE FROM public.wa_threads WHERE updated_at < now() - interval '30 days';
  DELETE FROM public.wa_agent_days WHERE day < current_date - 400;
$$;

-- 11. book_appointment: a WhatsApp booking may leave the email out and is marked as WhatsApp.
--     Otherwise exactly as in formats-groups.sql.
CREATE OR REPLACE FUNCTION public.book_appointment(p_business_id uuid, p_service_id uuid, p_date date, p_time time without time zone, p_client_name text, p_client_email text, p_client_phone text, p_notes text DEFAULT NULL::text, p_staff_id uuid DEFAULT NULL::uuid, p_addon_ids uuid[] DEFAULT NULL::uuid[], p_mode text DEFAULT NULL::text, p_client_address text DEFAULT NULL::text, p_client_landmark text DEFAULT NULL::text, p_client_zone text DEFAULT NULL::text, p_client_lat double precision DEFAULT NULL::double precision, p_client_lng double precision DEFAULT NULL::double precision, p_client_place_id text DEFAULT NULL::text, p_people integer DEFAULT 1)
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
  v_email text := NULLIF(lower(trim(p_client_email)), '');
  -- Booked from WhatsApp by the whatsapp function (service role only): the phone is the client and
  -- the email may be left out.
  v_wa boolean := coalesce(current_setting('locappoint.channel', true), '') = 'whatsapp'
                  AND coalesce(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'service_role';
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
  v_people integer := coalesce(p_people, 1);
  v_max integer;
  v_price_per text;
  v_each integer;
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

  SELECT s.duration_minutes, s.price, s.modes, s.travel_fee, s.max_people, s.price_per, coalesce(s.extra_person_minutes, s.duration_minutes)
    INTO v_duration, v_price, v_modes, v_travel, v_max, v_price_per, v_each
    FROM public.services s
   WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service is not available' USING ERRCODE = 'P0002';
  END IF;

  -- A group: one booking, one staff member, everyone one after another. Extras stay one-person.
  IF v_people < 1 OR v_people > coalesce(v_max, 1) THEN
    RAISE EXCEPTION 'This service is for up to % %', coalesce(v_max, 1), CASE WHEN coalesce(v_max, 1) = 1 THEN 'person' ELSE 'people' END USING ERRCODE = '22023';
  END IF;
  IF v_people > 1 AND cardinality(v_ids) > 0 THEN
    RAISE EXCEPTION 'Extras are for one person. Book them on their own.' USING ERRCODE = '22023';
  END IF;
  IF v_people > 1 THEN
    v_duration := v_duration + (v_people - 1) * v_each;
    IF v_price_per = 'person' THEN
      v_price := v_price * v_people;
    END IF;
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
  ELSIF v_people = 1 THEN
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
  IF (v_email IS NULL AND NOT v_wa) OR (v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')) THEN
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
    FROM public.get_available_slots(p_business_id, p_service_id, p_date, p_staff_id, NULL, CASE WHEN cardinality(v_ids) > 0 THEN v_ids END, v_people) s
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
      client_address, client_landmark, client_zone, travel_fee, client_place_id, people
    ) VALUES (
      p_business_id, v_staff, v_uid, p_service_id, p_date, p_time,
      v_duration + v_extra, CASE WHEN v_auto THEN 'confirmed' ELSE 'pending' END, CASE WHEN v_wa THEN 'whatsapp' ELSE 'web' END,
      v_name, v_email, v_phone, left(NULLIF(trim(p_notes), ''), 1000), v_addons, v_price,
      CASE WHEN v_online THEN v_terms.client_fee ELSE 0 END,
      CASE WHEN v_online THEN v_terms.business_fee ELSE 0 END,
      CASE WHEN v_online THEN 'awaiting' ELSE 'at_visit' END,
      CASE WHEN v_online THEN now() + make_interval(mins => v_terms.hold_minutes) END,
      v_mode,
      v_address, v_landmark, v_zone, coalesce(v_travel, 0), v_place, v_people
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

-- 12. send_booking_notice: a booking made on WhatsApp also hears back on WhatsApp.
--     Otherwise exactly as in pay-at-booking.sql.
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
    -- Booked on WhatsApp: the same news on WhatsApp too.
    IF a.source = 'whatsapp' THEN
      PERFORM public.wa_client_notice(a, p_kind, v_payload, p_key);
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

REVOKE EXECUTE ON FUNCTION public.wa_mine(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_mine(text, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_client_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_client_view(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_thread(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_thread(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_thread_save(text, jsonb, uuid, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_thread_save(text, jsonb, uuid, text, text, jsonb, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_find(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_find(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_business(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_business(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_times(uuid, uuid, date, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_times(uuid, uuid, date, uuid, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_quote(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_quote(uuid, uuid, text, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_search(text, text, date[], text, time, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_search(text, text, date[], text, time, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_book(text, uuid, uuid, date, time, text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_book(text, uuid, uuid, date, time, text, text, text, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_my(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_my(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_cancel(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_cancel(text, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_move(text, uuid, date, time) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_move(text, uuid, date, time) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_agent_budget() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_agent_budget() TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_agent_spent(integer, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_agent_spent(integer, integer, numeric) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_client_notice(public.appointments, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_tidy() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_book_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wa_book_number() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_wa_threads(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wa_threads(text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_wa_thread(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wa_thread(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, date, time without time zone, text, text, text, text, uuid, uuid[], text, text, text, text, double precision, double precision, text, integer) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.send_booking_notice(public.appointments, text, text, text) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
