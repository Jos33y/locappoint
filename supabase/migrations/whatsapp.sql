-- WhatsApp, business side (WhatsApp v1, part 3a). One Locappoint number for everyone.
-- - A person links their WhatsApp by sending us a code from it: proof they hold the number, free,
--   and no template to wait for. A linked phone is the "phone confirmed" check of the blue badge
--   once WhatsApp is live.
-- - Owners and staff who switch it on get new bookings, requests, moves and cancellations on
--   WhatsApp, the same ones the bell gets. A request comes with Accept and Decline.
-- - "today" lists the day; home visits get "On my way" and "Arrived", the live trip already built.
-- - Every message in and out is kept 90 days. STOP turns WhatsApp off for that phone.
-- Needs reliability.sql, live-trips.sql, pay-at-booking.sql (send_booking_notice). Safe to run again.

BEGIN;

-- 1. The number and whether WhatsApp is live. Until live, the badge keeps "a phone on the page".
CREATE TABLE IF NOT EXISTS public.wa_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  number text NOT NULL CHECK (number ~ '^[0-9]{8,15}$'),
  live boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.wa_config (id, number) VALUES (1, '15556461337') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.wa_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_config FROM anon, authenticated;

-- 2. Every phone that wrote to us or that we write to. Linked to one Locappoint user at most.
CREATE TABLE IF NOT EXISTS public.wa_contacts (
  phone text PRIMARY KEY CHECK (phone ~ '^[0-9]{8,15}$'),
  user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  profile_name text,
  verified_at timestamptz,
  last_inbound_at timestamptz,
  stopped_at timestamptz,
  hits integer NOT NULL DEFAULT 0,
  hits_since timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_contacts FROM anon, authenticated;

-- Link codes: valid 30 minutes, one at a time per person.
CREATE TABLE IF NOT EXISTS public.wa_codes (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.wa_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_codes FROM anon, authenticated;

-- What was said, both ways, for 90 days.
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  kind text NOT NULL,
  body text,
  wa_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wa_messages_phone ON public.wa_messages (phone, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_in_once ON public.wa_messages (wa_id) WHERE direction = 'in' AND wa_id IS NOT NULL;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wa_messages FROM anon, authenticated;

-- 3. Per person and business: bookings on WhatsApp, off until they switch it on.
ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS wa_alerts boolean NOT NULL DEFAULT false;

-- 4. Helpers.
CREATE OR REPLACE FUNCTION public.wa_live()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((SELECT live FROM public.wa_config WHERE id = 1), false)
$$;

CREATE OR REPLACE FUNCTION public.wa_phone_of(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.phone FROM public.wa_contacts c WHERE c.user_id = p_user AND c.verified_at IS NOT NULL AND c.stopped_at IS NULL
$$;

-- Keep a line of what was said. Never blocks anything.
CREATE OR REPLACE FUNCTION public.wa_log(p_phone text, p_direction text, p_kind text, p_body text, p_wa_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wa_messages (phone, direction, kind, body, wa_id)
  VALUES (p_phone, p_direction, left(coalesce(p_kind, 'text'), 40), left(p_body, 2000), p_wa_id);
  RETURN true;
EXCEPTION WHEN unique_violation THEN
  RETURN false;
END;
$$;

-- 5. For the signed-in person, in Settings: the number to write to, their link, and per business
--    whether bookings come on WhatsApp.
CREATE OR REPLACE FUNCTION public.my_whatsapp()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  c public.wa_contacts;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.wa_contacts WHERE user_id = v_uid;
  RETURN jsonb_build_object(
    'number', (SELECT number FROM public.wa_config WHERE id = 1),
    'live', public.wa_live(),
    'linked', CASE WHEN c.phone IS NOT NULL AND c.verified_at IS NOT NULL THEN jsonb_build_object(
                'ends', right(c.phone, 3), 'since', c.verified_at, 'stopped', c.stopped_at IS NOT NULL) END,
    'code', (SELECT jsonb_build_object('code', k.code, 'expires_at', k.expires_at) FROM public.wa_codes k WHERE k.user_id = v_uid AND k.expires_at > now()),
    'businesses', coalesce((
      SELECT jsonb_agg(jsonb_build_object('member_id', m.id, 'business_id', b.id, 'business_name', b.business_name, 'role', m.role, 'on', m.wa_alerts) ORDER BY b.business_name)
        FROM public.business_members m JOIN public.businesses b ON b.id = m.business_id
       WHERE m.user_id = v_uid AND m.status = 'active'), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_link_start()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := lpad((floor(random() * 1000000))::int::text, 6, '0');
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.wa_codes (user_id, code, expires_at) VALUES (v_uid, v_code, now() + interval '30 minutes')
  ON CONFLICT (user_id) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at;
  RETURN public.my_whatsapp();
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_unlink()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  UPDATE public.wa_contacts SET user_id = NULL, verified_at = NULL WHERE user_id = v_uid;
  UPDATE public.business_members SET wa_alerts = false WHERE user_id = v_uid;
  DELETE FROM public.wa_codes WHERE user_id = v_uid;
  RETURN public.my_whatsapp();
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_set_alerts(p_member uuid, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.business_members m WHERE m.id = p_member AND m.user_id = v_uid AND m.status = 'active') THEN
    RAISE EXCEPTION 'Not your team place' USING ERRCODE = '42501';
  END IF;
  IF p_on AND public.wa_phone_of(v_uid) IS NULL THEN
    RAISE EXCEPTION 'Link your WhatsApp first' USING ERRCODE = '22023';
  END IF;
  UPDATE public.business_members SET wa_alerts = coalesce(p_on, false) WHERE id = p_member;
  RETURN public.my_whatsapp();
END;
$$;

-- 6. From the whatsapp function only (service role). A message arrived: note it, slow down a phone
--    that floods us, and say who it is.
CREATE OR REPLACE FUNCTION public.wa_inbound(p_phone text, p_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c public.wa_contacts;
  v_limited boolean;
BEGIN
  IF p_phone !~ '^[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'Bad phone' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.wa_contacts AS x (phone, profile_name, last_inbound_at, hits, hits_since)
  VALUES (p_phone, left(p_name, 80), now(), 1, now())
  ON CONFLICT (phone) DO UPDATE
    SET profile_name = coalesce(left(EXCLUDED.profile_name, 80), x.profile_name),
        last_inbound_at = now(),
        hits = CASE WHEN x.hits_since < now() - interval '10 minutes' THEN 1 ELSE x.hits + 1 END,
        hits_since = CASE WHEN x.hits_since < now() - interval '10 minutes' THEN now() ELSE x.hits_since END
  RETURNING * INTO c;
  v_limited := c.hits > 30;

  RETURN jsonb_build_object(
    'limited', v_limited,
    'stopped', c.stopped_at IS NOT NULL,
    'user_id', CASE WHEN c.verified_at IS NOT NULL THEN c.user_id END,
    'name', (SELECT u.full_name FROM public.users u WHERE u.id = c.user_id AND c.verified_at IS NOT NULL),
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object('member_id', m.id, 'business_id', b.id, 'business_name', b.business_name, 'role', m.role, 'on', m.wa_alerts))
        FROM public.business_members m JOIN public.businesses b ON b.id = m.business_id
       WHERE c.verified_at IS NOT NULL AND m.user_id = c.user_id AND m.status = 'active'), '[]'::jsonb));
END;
$$;

-- The code they sent from WhatsApp. The phone now belongs to that person; if it was linked to
-- someone else, that link goes.
CREATE OR REPLACE FUNCTION public.wa_link_confirm(p_phone text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  k public.wa_codes;
BEGIN
  SELECT * INTO k FROM public.wa_codes WHERE code = p_code AND expires_at > now() ORDER BY expires_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  UPDATE public.wa_contacts SET user_id = NULL, verified_at = NULL WHERE user_id = k.user_id AND phone <> p_phone;
  UPDATE public.wa_contacts SET user_id = k.user_id, verified_at = now(), stopped_at = NULL WHERE phone = p_phone;
  DELETE FROM public.wa_codes WHERE user_id = k.user_id;
  RETURN jsonb_build_object('ok', true, 'name', (SELECT full_name FROM public.users WHERE id = k.user_id),
                            'businesses', (SELECT count(*) FROM public.business_members m WHERE m.user_id = k.user_id AND m.status = 'active'));
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_stop(p_phone text, p_on boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.wa_contacts SET stopped_at = CASE WHEN p_on THEN NULL ELSE now() END WHERE phone = p_phone;
END;
$$;

-- 7. What a linked phone can see and do: its people's day, and confirm, decline, on my way,
--    arrived. Owners act on every booking of their business, staff on their own.
CREATE OR REPLACE FUNCTION public.wa_member_for(p_phone text, p_appointment uuid)
RETURNS public.business_members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
  a public.appointments;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That booking is gone' USING ERRCODE = 'P0002';
  END IF;
  SELECT bm.* INTO m
    FROM public.wa_contacts c
    JOIN public.business_members bm ON bm.user_id = c.user_id AND bm.status = 'active' AND bm.business_id = a.business_id
   WHERE c.phone = p_phone AND c.verified_at IS NOT NULL AND c.stopped_at IS NULL;
  IF m.id IS NULL OR (m.role <> 'owner' AND m.id IS DISTINCT FROM a.staff_id) THEN
    RAISE EXCEPTION 'That booking is not yours to change' USING ERRCODE = '42501';
  END IF;
  RETURN m;
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_booking_view(p_appointment uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', a.id, 'status', a.status, 'date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'),
    'minutes', a.duration_minutes, 'client_name', a.client_name, 'service_name', coalesce(s.service_name, 'Booking'),
    'mode', a.mode, 'zone', a.client_zone, 'people', a.people, 'staff_name', m.display_name, 'business_name', b.business_name, 'timezone', b.timezone,
    'trip', (SELECT t.status FROM public.visit_trips t WHERE t.appointment_id = a.id))
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE a.id = p_appointment
$$;

CREATE OR REPLACE FUNCTION public.wa_today(p_phone text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(public.wa_booking_view(a.id) ORDER BY b.business_name, a.appointment_time), '[]'::jsonb)
    FROM public.wa_contacts c
    JOIN public.business_members bm ON bm.user_id = c.user_id AND bm.status = 'active'
    JOIN public.businesses b ON b.id = bm.business_id
    JOIN public.appointments a ON a.business_id = b.id
   WHERE c.phone = p_phone AND c.verified_at IS NOT NULL
     AND a.appointment_date = (now() AT TIME ZONE b.timezone)::date
     AND a.status IN ('pending', 'confirmed', 'completed')
     AND a.payment_status <> 'awaiting'
     AND (bm.role = 'owner' OR a.staff_id = bm.id)
$$;

-- Confirm or decline a request, the same change the dashboard makes, as that person.
CREATE OR REPLACE FUNCTION public.wa_answer(p_phone text, p_appointment uuid, p_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
  a public.appointments;
BEGIN
  IF p_answer NOT IN ('confirm', 'decline') THEN
    RAISE EXCEPTION 'Confirm or decline' USING ERRCODE = '22023';
  END IF;
  m := public.wa_member_for(p_phone, p_appointment);
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment FOR UPDATE;
  IF a.status <> 'pending' THEN
    RETURN public.wa_booking_view(a.id) || jsonb_build_object('already', true);
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', m.user_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', m.user_id::text, true);
  UPDATE public.appointments SET status = CASE WHEN p_answer = 'confirm' THEN 'confirmed' ELSE 'cancelled' END WHERE id = a.id;
  RETURN public.wa_booking_view(a.id) || jsonb_build_object('already', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_trip(p_phone text, p_appointment uuid, p_minutes integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
BEGIN
  IF p_minutes NOT IN (10, 15, 20, 30, 45) THEN
    RAISE EXCEPTION 'Pick 10, 15, 20, 30 or 45 minutes' USING ERRCODE = '22023';
  END IF;
  m := public.wa_member_for(p_phone, p_appointment);
  RETURN public.trip_start(p_appointment, m.id, p_minutes * 60, 'guess');
END;
$$;

CREATE OR REPLACE FUNCTION public.wa_arrived(p_phone text, p_appointment uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.wa_member_for(p_phone, p_appointment);
  RETURN public.trip_end(p_appointment, true);
END;
$$;

-- 8. The same booking news the bell gets, on WhatsApp, for people who switched it on. A row in the
--    queue for the notify function, which sends it inside the 24 hour window or as a template.
CREATE OR REPLACE FUNCTION public.inbox_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone text;
BEGIN
  IF NEW.audience <> 'business' OR NEW.kind NOT IN ('booking_new', 'booking_request', 'booking_cancelled', 'booking_moved')
     OR NEW.appointment_id IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.business_members m
                    WHERE m.business_id = NEW.business_id AND m.user_id = NEW.user_id AND m.status = 'active' AND m.wa_alerts) THEN
      RETURN NULL;
    END IF;
    v_phone := public.wa_phone_of(NEW.user_id);
    IF v_phone IS NULL THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.notification_queue (kind, channel, recipient_user, business_id, appointment_id, payload, dedupe_key)
    VALUES ('wa_' || NEW.kind, 'whatsapp', NEW.user_id, NEW.business_id, NEW.appointment_id,
            NEW.payload || public.wa_booking_view(NEW.appointment_id) || jsonb_build_object('phone', v_phone, 'event', NEW.kind),
            'wa:' || coalesce(NEW.dedupe_key, NEW.id::text))
    ON CONFLICT (dedupe_key) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'whatsapp notice for % not queued: %', NEW.id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS inbox_whatsapp ON public.inbox;
CREATE TRIGGER inbox_whatsapp
  AFTER INSERT ON public.inbox
  FOR EACH ROW EXECUTE FUNCTION public.inbox_whatsapp();

-- 9. 90 days of messages, then gone. Codes that ran out go too.
CREATE OR REPLACE FUNCTION public.wa_tidy()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.wa_messages WHERE created_at < now() - interval '90 days';
  DELETE FROM public.wa_codes WHERE expires_at < now() - interval '1 day';
$$;

-- 10. The blue badge's phone check, confirmed on WhatsApp once it is live.
CREATE OR REPLACE FUNCTION public.reliability_compute(p_business uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  v_today date;
  v_base integer;
  v_completed integer;
  v_cancels integer;
  v_late integer;
  v_excused integer;
  v_noshows integer;
  v_requests integer;
  v_late_req integer;
  v_reports integer;
  v_safety integer;
  v_safety180 boolean;
  v_kept numeric;
  v_showed numeric;
  v_answers numeric;
  v_clean numeric;
  v_score integer;
  v_email boolean;
  v_phone boolean;
  v_shown boolean;
  v_items jsonb;
  v_unit numeric;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = p_business;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_today := (now() AT TIME ZONE b.timezone)::date;

  -- Bookings that were confirmed at some point, visit in the last 90 days, plus any the business
  -- cancelled in the last 90 days whatever the visit date.
  SELECT count(*),
         count(*) FILTER (WHERE w.status = 'completed'),
         count(*) FILTER (WHERE w.biz_cancel AND NOT w.excused),
         count(*) FILTER (WHERE w.biz_cancel AND NOT w.excused AND w.is_late),
         count(*) FILTER (WHERE w.biz_cancel AND w.excused)
    INTO v_base, v_completed, v_cancels, v_late, v_excused
    FROM (
      SELECT a.status,
             (a.status = 'cancelled' AND a.cancelled_by = 'business') AS biz_cancel,
             coalesce(a.cancelled_at > ((a.appointment_date + a.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours', false) AS is_late,
             EXISTS (SELECT 1 FROM public.reliability_excuses x WHERE x.appointment_id = a.id) AS excused
        FROM public.appointments a
       WHERE a.business_id = b.id AND a.was_confirmed
         AND ((a.appointment_date > v_today - 90 AND a.appointment_date <= v_today)
              OR (a.status = 'cancelled' AND a.cancelled_by = 'business' AND a.cancelled_at >= now() - interval '90 days'))
    ) w;

  -- No-shows by the business: a client's "they did not come" upheld by us. A booking the business
  -- cancelled is already counted above, so it does not count twice.
  SELECT count(DISTINCT coalesce(t.appointment_id, t.id))
    INTO v_noshows
    FROM public.support_tickets t
    LEFT JOIN public.appointments a ON a.id = t.appointment_id
   WHERE t.business_id = b.id AND t.side = 'client' AND t.category = 'no_show' AND t.outcome = 'upheld'
     AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '90 days'
     AND NOT (coalesce(a.status, '') = 'cancelled' AND coalesce(a.cancelled_by, '') = 'business');

  SELECT count(DISTINCT coalesce(t.appointment_id, t.id)) FILTER (WHERE t.category <> 'safety'),
         count(DISTINCT coalesce(t.appointment_id, t.id)) FILTER (WHERE t.category = 'safety')
    INTO v_reports, v_safety
    FROM public.support_tickets t
   WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld' AND t.category <> 'no_show'
     AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '90 days';

  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
     WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld' AND t.category = 'safety'
       AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '180 days')
    INTO v_safety180;

  -- Requests: answered, still waiting, or given up on by the client after 12 hours.
  SELECT count(*), count(*) FILTER (WHERE r.late)
    INTO v_requests, v_late_req
    FROM (
      SELECT CASE
               WHEN a.answered_at IS NOT NULL THEN a.answered_at - a.requested_at > interval '12 hours'
               WHEN a.status = 'pending' THEN now() - a.requested_at > interval '12 hours'
               ELSE true
             END AS late
        FROM public.appointments a
       WHERE a.business_id = b.id AND a.requested_at >= now() - interval '90 days'
         AND (a.answered_at IS NOT NULL OR a.status = 'pending'
              OR (a.status = 'cancelled' AND a.cancelled_by = 'client' AND a.cancelled_at - a.requested_at > interval '12 hours'))
    ) r;

  v_unit := greatest(v_base, 1);
  v_kept := greatest(0, 1 - 4.0 * (v_cancels + v_late) / v_unit);
  v_showed := greatest(0, 1 - 10.0 * v_noshows / v_unit);
  v_answers := CASE WHEN v_requests > 0 THEN greatest(0, 1 - 2.0 * v_late_req / v_requests) ELSE 1 END;
  v_clean := greatest(0, 1 - 5.0 * (v_reports + 3 * v_safety) / v_unit);
  v_score := round(40 * v_kept + 25 * v_showed + 20 * v_answers + 15 * v_clean);
  v_shown := v_base >= 10;

  SELECT au.email_confirmed_at IS NOT NULL INTO v_email FROM auth.users au WHERE au.id = b.user_id;
  -- Once WhatsApp is live, the phone must be confirmed on WhatsApp; until then, a phone on the page.
  v_phone := CASE WHEN public.wa_live() THEN public.wa_phone_of(b.user_id) IS NOT NULL
                  ELSE length(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g')) >= 7 END;

  -- What cost points, newest first, with roughly how many.
  SELECT coalesce(jsonb_agg(i ORDER BY i->>'at' DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT i FROM (
        SELECT jsonb_build_object(
                 'kind', CASE WHEN x.is_late THEN 'late_cancel' ELSE 'cancel' END,
                 'appointment_id', x.id, 'date', x.appointment_date, 'time', to_char(x.appointment_time, 'HH24:MI'),
                 'client_name', x.client_name, 'at', x.cancelled_at,
                 'points', round(40 * least(1, (CASE WHEN x.is_late THEN 8.0 ELSE 4.0 END) / v_unit), 1)) AS i
          FROM (
            SELECT a.id, a.appointment_date, a.appointment_time, a.client_name, a.cancelled_at,
                   coalesce(a.cancelled_at > ((a.appointment_date + a.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours', false) AS is_late
              FROM public.appointments a
             WHERE a.business_id = b.id AND a.was_confirmed AND a.status = 'cancelled' AND a.cancelled_by = 'business'
               AND NOT EXISTS (SELECT 1 FROM public.reliability_excuses e WHERE e.appointment_id = a.id)
               AND ((a.appointment_date > v_today - 90 AND a.appointment_date <= v_today) OR a.cancelled_at >= now() - interval '90 days')
          ) x
        UNION ALL
        SELECT jsonb_build_object(
                 'kind', CASE WHEN t.category = 'no_show' THEN 'no_show' WHEN t.category = 'safety' THEN 'safety' ELSE 'report' END,
                 'appointment_id', t.appointment_id, 'ticket_number', t.number, 'subject', t.subject,
                 'at', coalesce(t.resolved_at, t.updated_at),
                 'points', round(CASE WHEN t.category = 'no_show' THEN 25 * least(1, 10.0 / v_unit)
                                      WHEN t.category = 'safety' THEN 15 * least(1, 15.0 / v_unit)
                                      ELSE 15 * least(1, 5.0 / v_unit) END, 1))
          FROM public.support_tickets t
          LEFT JOIN public.appointments a ON a.id = t.appointment_id
         WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld'
           AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '90 days'
           AND NOT (t.category = 'no_show' AND coalesce(a.status, '') = 'cancelled' AND coalesce(a.cancelled_by, '') = 'business')
        UNION ALL
        SELECT jsonb_build_object(
                 'kind', 'late_request', 'appointment_id', a.id, 'date', a.appointment_date,
                 'time', to_char(a.appointment_time, 'HH24:MI'), 'client_name', a.client_name, 'at', a.requested_at,
                 'waited_hours', round(extract(epoch FROM coalesce(a.answered_at, CASE WHEN a.status = 'pending' THEN now() ELSE a.cancelled_at END) - a.requested_at) / 3600),
                 'points', round(20 * least(1, 2.0 / greatest(v_requests, 1)), 1))
          FROM public.appointments a
         WHERE a.business_id = b.id AND a.requested_at >= now() - interval '90 days'
           AND ((a.answered_at IS NOT NULL AND a.answered_at - a.requested_at > interval '12 hours')
                OR (a.answered_at IS NULL AND a.status = 'pending' AND now() - a.requested_at > interval '12 hours')
                OR (a.status = 'cancelled' AND a.cancelled_by = 'client' AND a.answered_at IS NULL AND a.cancelled_at - a.requested_at > interval '12 hours'))
      ) z
      ORDER BY i->>'at' DESC
      LIMIT 20
    ) q;

  RETURN jsonb_build_object(
    'score', v_score,
    'shown', v_shown,
    'bookings', v_base,
    'completed', v_completed,
    'kept_pct', CASE WHEN v_base > 0 THEN round(100.0 * (v_base - v_cancels) / v_base) END,
    'parts', jsonb_build_object(
      'kept', round(40 * v_kept, 1), 'showed', round(25 * v_showed, 1),
      'answers', round(20 * v_answers, 1), 'clean', round(15 * v_clean, 1)),
    'counts', jsonb_build_object(
      'cancels', v_cancels, 'late_cancels', v_late, 'excused', v_excused, 'no_shows', v_noshows,
      'requests', v_requests, 'late_requests', v_late_req, 'reports', v_reports, 'safety', v_safety),
    'checks', jsonb_build_object(
      'score', v_shown AND v_score >= 90,
      'completed', v_completed >= 10,
      'email', coalesce(v_email, false),
      'phone', v_phone,
      'safety', NOT v_safety180,
      'active', coalesce(b.is_active, false) AND b.suspended_at IS NULL),
    'items', v_items,
    'today', v_today,
    'wa_live', public.wa_live()
  );
END;
$$;


REVOKE EXECUTE ON FUNCTION public.wa_live() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_phone_of(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_log(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_whatsapp() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wa_link_start() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wa_unlink() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wa_set_alerts(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wa_inbound(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_link_confirm(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_stop(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_member_for(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_booking_view(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_today(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_answer(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_trip(text, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_arrived(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.inbox_whatsapp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_tidy() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_whatsapp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wa_link_start() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wa_unlink() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wa_set_alerts(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wa_log(text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_inbound(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_link_confirm(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_stop(text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_today(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_booking_view(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_answer(text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_trip(text, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_arrived(text, uuid) TO service_role;

-- 11. Every night at 04:13 UTC.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'whatsapp-tidy';
SELECT cron.schedule('whatsapp-tidy', '13 4 * * *', 'SELECT public.wa_tidy()');

NOTIFY pgrst, 'reload schema';

COMMIT;
