-- WhatsApp agent, 3c. Three things:
-- 1. Visits at the client's place, booked in the chat: the agent asks the area (one the business
--    covers), the street address and directions; free times leave room for travel; the booking goes
--    through book_appointment exactly as on the business page.
-- 2. Support from the chat: a client reports a problem (about a booking, or about anything) and gets a
--    ticket number; Locappoint's replies from /admin come back on WhatsApp; their answers go into
--    the same ticket.
-- 3. Search in Lagos.
-- Needs agent-6.sql and travel.sql. Safe to run again.

BEGIN;

-- 1. What the agent reads about a business: the areas it visits and each service's travel fee.
CREATE OR REPLACE FUNCTION public.wa_business(p_business uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'business_id', b.id, 'name', b.business_name, 'slug', b.slug, 'category', b.category,
    'address', b.address, 'area', b.neighbourhood, 'city', b.city, 'market', b.market, 'timezone', b.timezone,
    'phone', b.phone, 'whatsapp', b.whatsapp, 'description', left(b.description, 400),
    'confirms_automatically', b.auto_confirm, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes, 'currency', b.currency,
    'visit_areas', CASE WHEN cardinality(coalesce(b.service_zones, '{}')) > 0 THEN to_jsonb(b.service_zones) END,
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
               'price', s.price, 'price_per', s.price_per, 'max_people', s.max_people,
               'extra_person_minutes', CASE WHEN s.max_people > 1 THEN coalesce(s.extra_person_minutes, s.duration_minutes) END, 'ways', s.modes,
               'travel_fee', CASE WHEN 'at_client' = ANY (s.modes) THEN coalesce(s.travel_fee, 0) END,
               'about', left(s.description, 200)) ORDER BY s.sort_order, s.service_name)
        FROM public.services s WHERE s.business_id = b.id AND s.is_active AND NOT s.is_addon), '[]'::jsonb))
    FROM public.businesses b
   WHERE b.id = p_business AND b.is_active AND b.suspended_at IS NULL
$function$;

-- What a client sees of a booking: a visit at their place shows their own address, not the shop's.
CREATE OR REPLACE FUNCTION public.wa_client_view(p_appointment uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'id', a.id, 'status', a.status, 'payment_status', a.payment_status, 'hold_until', a.hold_until,
    'price', a.price, 'total', a.total, 'client_fee', a.client_fee, 'travel_fee', a.travel_fee, 'currency', coalesce(a.currency, b.currency),
    'business_id', b.id, 'business_name', b.business_name, 'slug', b.slug,
    'address', CASE WHEN a.mode = 'at_client' THEN a.client_address ELSE b.address END,
    'city', CASE WHEN a.mode = 'at_client' THEN a.client_zone ELSE b.city END,
    'landmark', CASE WHEN a.mode = 'at_client' THEN a.client_landmark END,
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
$function$;

-- 2. Free times for the way and the area asked, so a visit leaves room for travel.
DROP FUNCTION IF EXISTS public.wa_times(uuid, uuid, date, uuid, integer);
CREATE OR REPLACE FUNCTION public.wa_times(p_business uuid, p_service uuid, p_date date, p_ignore uuid DEFAULT NULL, p_people integer DEFAULT 1, p_mode text DEFAULT NULL, p_zone text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(t ORDER BY t), '[]'::jsonb) FROM (
    SELECT DISTINCT to_char(s.slot_time, 'HH24:MI') AS t
      FROM public.get_available_slots(p_business, p_service, p_date, NULL, p_ignore, NULL, greatest(coalesce(p_people, 1), 1),
                                      NULLIF(p_mode, ''), NULLIF(btrim(p_zone), '')) s
     LIMIT 48) x
$function$;

DROP FUNCTION IF EXISTS public.wa_free_days(uuid, uuid, date, integer);
CREATE OR REPLACE FUNCTION public.wa_free_days(p_business uuid, p_service uuid, p_from date DEFAULT NULL, p_people integer DEFAULT 1, p_mode text DEFAULT NULL, p_zone text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(jsonb_build_object('date', y.d) || y.t ORDER BY y.d), '[]'::jsonb) FROM (
    SELECT x.d, x.t FROM (
      SELECT g.d::date AS d,
             (SELECT jsonb_build_object('first', min(z.v), 'last', max(z.v), 'count', count(*),
                                        'examples', jsonb_agg(z.v ORDER BY z.v) FILTER (WHERE (z.n - 1) % ceil(z.c / 8.0)::int = 0))
                FROM (
                SELECT u.v, row_number() OVER (ORDER BY u.v) AS n, count(*) OVER () AS c FROM (
                  SELECT DISTINCT to_char(s.slot_time, 'HH24:MI') AS v
                    FROM public.get_available_slots(p_business, p_service, g.d::date, NULL, NULL, NULL, greatest(coalesce(p_people, 1), 1),
                                                    NULLIF(p_mode, ''), NULLIF(btrim(p_zone), '')) s) u) z) AS t
        FROM public.businesses b
        CROSS JOIN LATERAL generate_series(
               greatest(coalesce(p_from, (now() AT TIME ZONE b.timezone)::date), (now() AT TIME ZONE b.timezone)::date)::timestamp,
               (now() AT TIME ZONE b.timezone)::date + 20, interval '1 day') AS g(d)
       WHERE b.id = p_business AND b.is_active AND b.suspended_at IS NULL
         AND EXISTS (SELECT 1 FROM public.services s2 WHERE s2.id = p_service AND s2.business_id = b.id AND s2.is_active)) x
     WHERE (x.t->>'count')::int > 0
     ORDER BY x.d
     LIMIT 5) y
$function$;

-- 3. Booking a visit at the client's place: the area, the address and directions go to book_appointment,
-- which checks the area is covered and keeps the address from the business until it confirms.
DROP FUNCTION IF EXISTS public.wa_book(text, uuid, uuid, date, time without time zone, text, text, text, integer);
CREATE OR REPLACE FUNCTION public.wa_book(p_phone text, p_business uuid, p_service uuid, p_date date, p_time time without time zone, p_name text,
                                          p_email text DEFAULT NULL, p_mode text DEFAULT NULL, p_people integer DEFAULT 1,
                                          p_address text DEFAULT NULL, p_landmark text DEFAULT NULL, p_zone text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_modes text[];
  v_mode text;
  v_zone text;
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
    -- The area as the business lists it, whatever the case they typed.
    SELECT z INTO v_zone FROM public.businesses b, unnest(coalesce(b.service_zones, '{}')) z
     WHERE b.id = p_business AND lower(z) = lower(btrim(coalesce(p_zone, ''))) LIMIT 1;
    IF v_zone IS NULL THEN
      RAISE EXCEPTION 'This business does not go to that area. Pick one of the areas it lists.' USING ERRCODE = '22023';
    END IF;
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
      p_mode => v_mode, p_people => greatest(coalesce(p_people, 1), 1),
      p_client_address => CASE WHEN v_mode = 'at_client' THEN NULLIF(btrim(coalesce(p_address, '')), '') END,
      p_client_landmark => CASE WHEN v_mode = 'at_client' THEN NULLIF(btrim(coalesce(p_landmark, '')), '') END,
      p_client_zone => v_zone);
  EXCEPTION WHEN others THEN
    PERFORM set_config('locappoint.channel', '', true);
    RAISE;
  END;
  PERFORM set_config('locappoint.channel', '', true);
  RETURN public.wa_client_view(v_id);
END;
$function$;

-- 4. Search, with visits: an area turns the search to businesses that come to it.
DROP FUNCTION IF EXISTS public.wa_search(text, text, date[], text, time without time zone, integer);
CREATE OR REPLACE FUNCTION public.wa_search(p_market text, p_query text, p_dates date[] DEFAULT NULL, p_window text DEFAULT 'any', p_at time without time zone DEFAULT NULL, p_people integer DEFAULT 1, p_zone text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  r jsonb;
  v_zone text := NULLIF(btrim(coalesce(p_zone, '')), '');
BEGIN
  IF v_zone IS NOT NULL THEN
    SELECT z.name INTO v_zone FROM public.market_zones z WHERE z.market = lower(trim(p_market)) AND lower(z.name) = lower(v_zone);
    IF v_zone IS NULL THEN
      RAISE EXCEPTION 'That area is not on the list for this city' USING ERRCODE = '22023';
    END IF;
  END IF;
  r := public.engine_match(lower(trim(p_market)), p_query, CASE WHEN v_zone IS NOT NULL THEN 'at_client' END, p_dates,
                           CASE WHEN p_window IN ('morning', 'afternoon', 'evening') THEN p_window ELSE 'any' END,
                           p_at, greatest(coalesce(p_people, 1), 1), NULL, NULL, v_zone);
  IF v_zone IS NOT NULL THEN
    RETURN r;
  END IF;
  RETURN r || jsonb_build_object(
    'options', coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(r->'options') o WHERE o->>'mode' IS DISTINCT FROM 'at_client'), '[]'::jsonb),
    'later', coalesce((SELECT jsonb_agg(o) FROM jsonb_array_elements(r->'later') o WHERE o->>'mode' IS DISTINCT FROM 'at_client'), '[]'::jsonb));
END;
$function$;

-- 5. The areas of a city, for "which areas do you cover" and for checking what they typed.
CREATE OR REPLACE FUNCTION public.wa_areas(p_market text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(z.name ORDER BY z.sort_order, z.name), '[]'::jsonb)
    FROM public.market_zones z WHERE z.market = lower(trim(coalesce(p_market, '')))
$function$;

-- 6. Support from WhatsApp. A ticket remembers the number it came from, so replies go back there.
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS wa_phone text;
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_wa_phone;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_wa_phone CHECK (wa_phone IS NULL OR wa_phone ~ '^[0-9]{8,15}$');
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_who;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_who CHECK (
  user_id IS NOT NULL OR guest_email IS NOT NULL OR appointment_id IS NOT NULL OR wa_phone IS NOT NULL);
CREATE INDEX IF NOT EXISTS support_tickets_wa_phone ON public.support_tickets (wa_phone) WHERE wa_phone IS NOT NULL;

-- Their bookings that ended in the last 48 hours: those can still be reported.
CREATE OR REPLACE FUNCTION public.wa_recent(p_phone text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(public.wa_client_view(a.id) ORDER BY a.appointment_date DESC, a.appointment_time DESC), '[]'::jsonb)
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
   WHERE a.source = 'whatsapp' AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = p_phone
     AND a.status IN ('confirmed', 'completed', 'no_show', 'cancelled')
     AND a.appointment_date + a.appointment_time <= now() AT TIME ZONE b.timezone
     AND public.support_report_open(a)
$function$;

-- Their tickets still open or waiting on them, with Locappoint's last reply.
CREATE OR REPLACE FUNCTION public.wa_tickets(p_phone text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'ticket_id', t.id, 'number', t.number, 'subject', t.subject, 'status', t.status,
           'last_reply', (SELECT left(m.body, 400) FROM public.support_messages m WHERE m.ticket_id = t.id AND m.role = 'admin' ORDER BY m.created_at DESC LIMIT 1))
           ORDER BY t.last_message_at DESC), '[]'::jsonb)
    FROM public.support_tickets t
   WHERE t.wa_phone = p_phone AND t.side = 'client' AND (t.status <> 'resolved' OR t.resolved_at > now() - interval '7 days')
$function$;

-- A problem reported in the chat. About a booking from this number (up to 48 hours after the visit),
-- or about anything else. A second report on the same booking joins the open ticket.
CREATE OR REPLACE FUNCTION public.wa_report(p_phone text, p_category text, p_message text, p_appointment uuid DEFAULT NULL, p_name text DEFAULT NULL, p_email text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  a public.appointments;
  t public.support_tickets;
  v_msg text := btrim(coalesce(p_message, ''));
  v_email text := lower(NULLIF(btrim(coalesce(p_email, '')), ''));
  v_mid uuid;
BEGIN
  IF p_phone !~ '^[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'Bad phone' USING ERRCODE = '22023';
  END IF;
  IF NOT public.support_category_ok('client', p_category) THEN
    RAISE EXCEPTION 'Pick what it is about' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) < 10 OR length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Tell us a little more, so we can help first time.' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    v_email := NULL;
  END IF;
  IF NOT public.rate_ok('support:wa:' || p_phone, 5, 86400) THEN
    RAISE EXCEPTION 'Too many reports today. Write to hello@locappoint.com.' USING ERRCODE = '54000';
  END IF;

  IF p_appointment IS NOT NULL THEN
    SELECT * INTO a FROM public.appointments x
     WHERE x.id = p_appointment AND x.source = 'whatsapp' AND regexp_replace(coalesce(x.client_phone, ''), '\D', '', 'g') = p_phone;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That booking was not made from this WhatsApp' USING ERRCODE = '42501';
    END IF;
    IF NOT public.support_report_open(a) THEN
      RAISE EXCEPTION 'Reports about a visit can be made up to 48 hours after it. Write to hello@locappoint.com for anything else.' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO t FROM public.support_tickets x
     WHERE x.appointment_id = a.id AND x.side = 'client' AND x.status <> 'resolved' AND x.parent_id IS NULL
     ORDER BY x.created_at DESC LIMIT 1;
    IF FOUND THEN
      v_mid := public.support_add(t.id, 'user', NULL, v_msg);
      UPDATE public.support_tickets SET status = 'open', wa_phone = coalesce(wa_phone, p_phone) WHERE id = t.id;
      PERFORM public.support_team_notice(t.id, 'reply', v_msg, v_mid::text);
      RETURN jsonb_build_object('ticket_id', t.id, 'number', t.number, 'added', true);
    END IF;
  END IF;

  INSERT INTO public.support_tickets (user_id, guest_email, guest_name, business_id, side, appointment_id, category, subject, message, status, priority, last_message_at, last_from, wa_phone)
  VALUES (a.client_id, coalesce(a.client_email, v_email), left(coalesce(NULLIF(btrim(coalesce(p_name, '')), ''), a.client_name), 120), a.business_id, 'client', a.id,
          p_category,
          CASE WHEN a.id IS NOT NULL THEN public.support_subject(a) ELSE left('WhatsApp: ' || regexp_replace(v_msg, '\s+', ' ', 'g'), 140) END,
          v_msg, 'open', public.support_priority(p_category), now(), 'user', p_phone)
  RETURNING * INTO t;
  INSERT INTO public.support_messages (ticket_id, author_id, role, body) VALUES (t.id, NULL, 'user', v_msg);
  INSERT INTO public.support_messages (ticket_id, author_id, role, body)
  VALUES (t.id, NULL, 'system', 'Opened on WhatsApp from +' || p_phone || '. Replies here are sent to that WhatsApp.');
  PERFORM public.support_team_notice(t.id, 'new', v_msg, t.id::text);
  RETURN jsonb_build_object('ticket_id', t.id, 'number', t.number, 'added', false);
END;
$function$;

-- Their answer to one of their tickets.
CREATE OR REPLACE FUNCTION public.wa_support_reply(p_phone text, p_ticket uuid, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  t public.support_tickets;
  v_msg text := btrim(coalesce(p_message, ''));
  v_mid uuid;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket AND wa_phone = p_phone AND side = 'client' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That ticket is not one of theirs' USING ERRCODE = '42501';
  END IF;
  IF v_msg = '' OR length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Write a reply under 4000 characters' USING ERRCODE = '22023';
  END IF;
  IF t.status = 'resolved' AND t.resolved_at <= now() - interval '30 days' THEN
    RAISE EXCEPTION 'This ticket was closed over 30 days ago. Write to hello@locappoint.com.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.rate_ok('support:wa:reply:' || p_phone, 30, 3600) THEN
    RAISE EXCEPTION 'Too many replies at once. Wait a moment.' USING ERRCODE = '54000';
  END IF;
  v_mid := public.support_add(t.id, 'user', NULL, v_msg);
  UPDATE public.support_tickets SET status = 'open', resolved_at = NULL, user_seen_at = now() WHERE id = t.id;
  PERFORM public.support_team_notice(t.id, 'reply', v_msg, v_mid::text);
  RETURN jsonb_build_object('ticket_id', t.id, 'number', t.number);
END;
$function$;

-- Locappoint's replies on a WhatsApp ticket go back to that WhatsApp (notify sends them; outside the
-- 24 hours, the lc_client_support template).
CREATE OR REPLACE FUNCTION public.support_messages_whatsapp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  t public.support_tickets;
BEGIN
  IF NEW.role <> 'admin' THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF t.wa_phone IS NULL OR EXISTS (SELECT 1 FROM public.wa_contacts c WHERE c.phone = t.wa_phone AND c.stopped_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notification_queue (kind, channel, business_id, appointment_id, payload, dedupe_key)
  VALUES ('wa_client_support_reply', 'whatsapp', t.business_id, t.appointment_id,
          jsonb_build_object('phone', t.wa_phone, 'event', 'support_reply', 'audience', 'client', 'number', t.number,
                             'subject', t.subject, 'body', left(NEW.body, 900),
                             'lang', coalesce((SELECT w.lang FROM public.wa_threads w WHERE w.phone = t.wa_phone), 'en')),
          'wa:support:' || NEW.id)
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS support_messages_whatsapp ON public.support_messages;
CREATE TRIGGER support_messages_whatsapp AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.support_messages_whatsapp();

REVOKE EXECUTE ON FUNCTION public.wa_client_view(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_client_view(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_business(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_business(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_times(uuid, uuid, date, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_times(uuid, uuid, date, uuid, integer, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_free_days(uuid, uuid, date, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_free_days(uuid, uuid, date, integer, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_book(text, uuid, uuid, date, time without time zone, text, text, text, integer, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_book(text, uuid, uuid, date, time without time zone, text, text, text, integer, text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_search(text, text, date[], text, time without time zone, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_search(text, text, date[], text, time without time zone, integer, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_areas(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_areas(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_recent(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_recent(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_tickets(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_tickets(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_report(text, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_report(text, text, text, uuid, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.wa_support_reply(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_support_reply(text, uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.support_messages_whatsapp() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
