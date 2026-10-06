-- Support done properly. Tickets are conversations: Open (with us), Waiting on you, Resolved.
-- "Report a problem" on every booking, for the client and for the business, up to 48 hours after
-- the visit. Guests without an account report and reply from their booking link. Replies go out by
-- email, in the bell and by push. The admin queue puts money and safety first, shows the booking,
-- the payment and both sides' history, and keeps internal notes and every action taken:
-- refund, no-show or attended, warn, suspend a business, ask the other side.
-- Everything is written through the functions below; nobody writes the tables directly.
-- Needs support-tickets.sql, pay-at-booking.sql, receipts.sql, formats-groups.sql, guard.sql, push.sql.
-- Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NULL THEN
    RAISE EXCEPTION 'Run support-tickets.sql first';
  END IF;
  IF to_regclass('public.payment_refunds') IS NULL THEN
    RAISE EXCEPTION 'Run pay-at-booking.sql first';
  END IF;
  IF to_regprocedure('public.rate_ok(text, integer, integer)') IS NULL THEN
    RAISE EXCEPTION 'Run guard.sql first';
  END IF;
END;
$$;

-- 1. Tickets: who (an account, or a guest from a booking link), which side they are on, the booking,
-- priority, outcome, and where the conversation stands.
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS number bigserial;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS side text NOT NULL DEFAULT 'business';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 3;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_from text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS user_seen_at timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- The old status and category checks give way to the new ones.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
     WHERE con.conrelid = 'public.support_tickets'::regclass AND con.contype = 'c'
       AND (pg_get_constraintdef(con.oid) LIKE '%answered%' OR pg_get_constraintdef(con.oid) LIKE '%business_page%')
  LOOP
    EXECUTE format('ALTER TABLE public.support_tickets DROP CONSTRAINT %I', c.conname);
  END LOOP;
END;
$$;

UPDATE public.support_tickets SET status = 'waiting' WHERE status = 'answered';
UPDATE public.support_tickets SET status = 'resolved', resolved_at = coalesce(resolved_at, updated_at) WHERE status = 'closed';
UPDATE public.support_tickets SET last_message_at = coalesce(last_message_at, updated_at, created_at), last_from = coalesce(last_from, CASE WHEN status = 'waiting' THEN 'admin' ELSE 'user' END);

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status CHECK (status IN ('open', 'waiting', 'resolved'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_category CHECK (category IN (
  'payment', 'safety', 'no_show', 'service', 'client', 'bookings', 'business_page', 'billing', 'account', 'other'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_side;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_side CHECK (side IN ('client', 'business'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_priority CHECK (priority BETWEEN 1 AND 3);
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_outcome;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_outcome CHECK (outcome IS NULL OR outcome IN ('upheld', 'not_upheld'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_last_from;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_last_from CHECK (last_from IS NULL OR last_from IN ('user', 'admin'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_who;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_who CHECK (
  user_id IS NOT NULL OR guest_email IS NOT NULL OR appointment_id IS NOT NULL);
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_guest;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_guest CHECK (
  (guest_email IS NULL OR char_length(guest_email) <= 320) AND (guest_name IS NULL OR char_length(guest_name) <= 120));

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_number ON public.support_tickets (number);
CREATE INDEX IF NOT EXISTS support_tickets_queue ON public.support_tickets (status, priority, last_message_at);
CREATE INDEX IF NOT EXISTS support_tickets_appointment ON public.support_tickets (appointment_id);
CREATE INDEX IF NOT EXISTS support_tickets_business ON public.support_tickets (business_id, side);

-- 2. The conversation. A note is for Locappoint staff only; a system line says what changed.
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('user', 'admin', 'note', 'system')),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- clock_timestamp: two messages written in one go (a reply and its note) keep their order.
ALTER TABLE public.support_messages ALTER COLUMN created_at SET DEFAULT clock_timestamp();

CREATE INDEX IF NOT EXISTS support_messages_thread ON public.support_messages (ticket_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_messages FROM anon, authenticated;

-- Tickets from before this file: their first message becomes the start of the conversation.
INSERT INTO public.support_messages (ticket_id, author_id, role, body, created_at)
SELECT t.id, t.user_id, 'user', t.message, t.created_at
  FROM public.support_tickets t
 WHERE NOT EXISTS (SELECT 1 FROM public.support_messages m WHERE m.ticket_id = t.id);

-- 3. Every action staff take on a ticket, with who and when. Read in /admin; batch 3 counts upheld reports.
CREATE TABLE IF NOT EXISTS public.support_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('refund', 'no_show', 'attended', 'warn', 'suspend', 'unsuspend', 'ask_other', 'status', 'priority', 'outcome')),
  target_user uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_business uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  target_email text,
  amount numeric,
  detail text CHECK (detail IS NULL OR char_length(detail) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_actions_ticket ON public.support_actions (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS support_actions_business ON public.support_actions (target_business, action);
CREATE INDEX IF NOT EXISTS support_actions_user ON public.support_actions (target_user, action);

ALTER TABLE public.support_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_actions FROM anon, authenticated;

-- 4. Tickets are read and written through the functions only.
DROP POLICY IF EXISTS tickets_own_insert ON public.support_tickets;
DROP POLICY IF EXISTS tickets_own_read ON public.support_tickets;
DROP POLICY IF EXISTS tickets_admin_update ON public.support_tickets;
REVOKE ALL ON public.support_tickets FROM anon, authenticated;

-- 5. A business paused by Locappoint while a report is looked into. Only the support functions set
-- or lift it; while it stands, the page cannot take bookings, whatever the owner switches.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS suspended_reason text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS suspended_was_active boolean;

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_suspended_reason;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_suspended_reason CHECK (suspended_reason IS NULL OR char_length(suspended_reason) <= 500);

CREATE OR REPLACE FUNCTION public.businesses_suspend_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('locappoint.trusted_write', true) IS DISTINCT FROM 'on' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.suspended_at := NULL;
      NEW.suspended_reason := NULL;
      NEW.suspended_was_active := NULL;
    ELSE
      NEW.suspended_at := OLD.suspended_at;
      NEW.suspended_reason := OLD.suspended_reason;
      NEW.suspended_was_active := OLD.suspended_was_active;
    END IF;
  END IF;
  IF NEW.suspended_at IS NOT NULL AND NEW.is_active THEN
    RAISE EXCEPTION 'Locappoint paused your page while we look into a report. Open Support to see why.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.businesses_suspend_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS businesses_suspend_guard ON public.businesses;
CREATE TRIGGER businesses_suspend_guard
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_suspend_guard();

-- 6. Refunds agreed in support get their own reason, and their own line on the receipt.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
     WHERE con.conrelid = 'public.payment_refunds'::regclass AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) LIKE '%late_payment%'
  LOOP
    EXECUTE format('ALTER TABLE public.payment_refunds DROP CONSTRAINT %I', c.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.payment_refunds ADD CONSTRAINT payment_refunds_reason CHECK (
  reason IN ('client_cancelled', 'client_late_cancel', 'business_cancelled', 'declined', 'no_show', 'late_payment', 'support'));


-- 7. Small pieces shared by everything below.

-- Money and safety first, then anything about a visit or a bill, then the rest.
CREATE OR REPLACE FUNCTION public.support_priority(p_category text)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (CASE WHEN p_category IN ('payment', 'safety') THEN 1
               WHEN p_category IN ('no_show', 'billing', 'service', 'client') THEN 2
               ELSE 3 END)::smallint;
$$;

CREATE OR REPLACE FUNCTION public.support_category_ok(p_side text, p_category text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_side
    WHEN 'client' THEN p_category IN ('payment', 'safety', 'no_show', 'service', 'bookings', 'account', 'other')
    WHEN 'business' THEN p_category IN ('payment', 'safety', 'no_show', 'client', 'bookings', 'business_page', 'billing', 'account', 'other')
    ELSE false END;
$$;

-- Reports about a visit close 48 hours after it ends, in the business's own time.
CREATE OR REPLACE FUNCTION public.support_report_open(a public.appointments)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT now() <= ((a.appointment_date + a.appointment_time) AT TIME ZONE coalesce(b.timezone, 'Europe/Lisbon'))
                  + make_interval(mins => coalesce(a.duration_minutes, 0)) + interval '48 hours'
    FROM public.businesses b WHERE b.id = a.business_id;
$$;

CREATE OR REPLACE FUNCTION public.support_subject(a public.appointments)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT left(coalesce(s.service_name, 'Booking') || ' at ' || b.business_name || ', ' || to_char(a.appointment_date, 'FMDD Mon'), 140)
    FROM public.businesses b
    LEFT JOIN public.services s ON s.id = a.service_id
   WHERE b.id = a.business_id;
$$;

-- Who may read and answer a ticket: the person who opened it, and for a business's own tickets, its owners.
CREATE OR REPLACE FUNCTION public.support_can_see(t public.support_tickets)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (t.user_id = auth.uid()
          OR (t.side = 'business' AND t.business_id IS NOT NULL AND public.is_business_owner(t.business_id)));
$$;

-- What the person sees: never a note, never who on our team wrote.
CREATE OR REPLACE FUNCTION public.support_thread(p_ticket uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id,
           'from', CASE m.role WHEN 'admin' THEN 'support' WHEN 'system' THEN 'system' ELSE 'you' END,
           'mine', m.role = 'user' AND (m.author_id IS NULL OR m.author_id = auth.uid()),
           'body', m.body,
           'at', m.created_at
         ) ORDER BY m.created_at, m.id), '[]'::jsonb)
    FROM public.support_messages m
   WHERE m.ticket_id = p_ticket AND m.role <> 'note';
$$;

CREATE OR REPLACE FUNCTION public.support_card(t public.support_tickets)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', t.id,
    'number', t.number,
    'subject', t.subject,
    'category', t.category,
    'status', t.status,
    'side', t.side,
    'created_at', t.created_at,
    'last_message_at', t.last_message_at,
    'unread', t.last_from = 'admin' AND t.last_message_at > coalesce(t.user_seen_at, '-infinity'::timestamptz),
    'from_us', t.parent_id IS NOT NULL,
    'booking', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', a.id,
      'business_name', b.business_name,
      'service_name', s.service_name,
      'client_name', CASE WHEN t.side = 'business' THEN a.client_name END,
      'date', a.appointment_date,
      'time', to_char(a.appointment_time, 'HH24:MI'),
      'status', a.status) END
  )
    FROM (SELECT 1) one
    LEFT JOIN public.appointments a ON a.id = t.appointment_id
    LEFT JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.services s ON s.id = a.service_id;
$$;

-- Adds one message and moves the conversation along.
CREATE OR REPLACE FUNCTION public.support_add(p_ticket uuid, p_role text, p_author uuid, p_body text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.support_messages (ticket_id, author_id, role, body)
  VALUES (p_ticket, p_author, p_role, left(trim(p_body), 4000))
  RETURNING id INTO v_id;
  IF p_role IN ('user', 'admin') THEN
    UPDATE public.support_tickets
       SET last_message_at = now(), last_from = p_role
     WHERE id = p_ticket;
  END IF;
  RETURN v_id;
END;
$$;

-- 8. Telling people. A reply from us reaches the person by email, in the bell and by push; a guest
-- by email, with a link back to their booking where the conversation lives.
CREATE OR REPLACE FUNCTION public.support_team_email()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT 'hello@locappoint.com' $$;

CREATE OR REPLACE FUNCTION public.support_notice(p_ticket uuid, p_kind text, p_body text, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  v_email text;
  v_name text;
  v_push boolean;
  v_audience text;
  v_payload jsonb;
BEGIN
  BEGIN
    SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
    IF NOT FOUND THEN RETURN; END IF;
    v_audience := CASE WHEN t.side = 'business' THEN 'business' ELSE 'client' END;
    IF t.user_id IS NOT NULL THEN
      SELECT u.email, u.full_name, u.push_enabled INTO v_email, v_name, v_push FROM public.users u WHERE u.id = t.user_id;
    END IF;
    v_email := coalesce(v_email, t.guest_email);
    v_name := coalesce(v_name, t.guest_name);
    v_payload := jsonb_build_object(
      'audience', v_audience,
      'ticket_id', t.id,
      'number', t.number,
      'subject', t.subject,
      'status', t.status,
      'body', left(coalesce(p_body, ''), 600),
      'name', split_part(coalesce(v_name, ''), ' ', 1),
      'business_name', (SELECT b.business_name FROM public.businesses b WHERE b.id = t.business_id),
      'guest', t.user_id IS NULL,
      'manage_token', CASE WHEN t.side = 'client' AND t.appointment_id IS NOT NULL
        THEN (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = t.appointment_id) END
    );

    IF t.user_id IS NOT NULL THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (t.user_id, v_audience, p_kind, CASE WHEN t.side = 'business' THEN t.business_id END, t.appointment_id, v_payload, 'support:inbox:' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
      IF coalesce(v_push, false) AND EXISTS (SELECT 1 FROM public.push_tokens p WHERE p.user_id = t.user_id) THEN
        INSERT INTO public.notification_queue (kind, channel, recipient_user, business_id, appointment_id, payload, dedupe_key)
        VALUES (p_kind, 'push', t.user_id, t.business_id, t.appointment_id, v_payload, 'support:push:' || p_key)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    END IF;
    IF v_email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (p_kind, t.user_id, v_email, t.business_id, t.appointment_id, v_payload, 'support:email:' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'support notice % for % not sent: %', p_kind, p_ticket, SQLERRM;
  END;
END;
$$;

-- A new ticket, or a reply on one, lands in the team's mailbox with what it is about.
CREATE OR REPLACE FUNCTION public.support_team_notice(p_ticket uuid, p_event text, p_body text, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  v_who text;
BEGIN
  BEGIN
    SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
    IF NOT FOUND THEN RETURN; END IF;
    SELECT coalesce(u.full_name, u.email) INTO v_who FROM public.users u WHERE u.id = t.user_id;
    INSERT INTO public.notification_queue (kind, recipient_email, business_id, appointment_id, payload, dedupe_key)
    VALUES ('support_team', public.support_team_email(), t.business_id, t.appointment_id, jsonb_build_object(
      'event', p_event,
      'ticket_id', t.id,
      'number', t.number,
      'subject', t.subject,
      'category', t.category,
      'priority', t.priority,
      'side', t.side,
      'who', coalesce(v_who, t.guest_name, t.guest_email, 'A guest'),
      'business_name', (SELECT b.business_name FROM public.businesses b WHERE b.id = t.business_id),
      'body', left(coalesce(p_body, ''), 600)
    ), 'support:team:' || p_key)
    ON CONFLICT (dedupe_key) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'support team notice for % not sent: %', p_ticket, SQLERRM;
  END;
END;
$$;

-- 9. Opening a ticket, signed in. With a booking it is a report on that booking; a second report on
-- the same booking joins the first while it is still open.
CREATE OR REPLACE FUNCTION public.open_ticket(
  p_side text,
  p_category text,
  p_message text,
  p_subject text DEFAULT NULL,
  p_business uuid DEFAULT NULL,
  p_appointment uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_msg text := trim(coalesce(p_message, ''));
  v_subject text := nullif(trim(coalesce(p_subject, '')), '');
  v_business uuid := p_business;
  a public.appointments;
  t public.support_tickets;
  v_mid uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to contact support' USING ERRCODE = '42501';
  END IF;
  IF NOT public.support_category_ok(p_side, p_category) THEN
    RAISE EXCEPTION 'Pick what it is about' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) < 10 THEN
    RAISE EXCEPTION 'Tell us a little more, so we can help first time.' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Keep it under 4000 characters' USING ERRCODE = '22023';
  END IF;

  IF p_appointment IS NOT NULL THEN
    SELECT * INTO a FROM public.appointments WHERE id = p_appointment;
    IF NOT FOUND
       OR (p_side = 'client' AND a.client_id IS DISTINCT FROM v_uid)
       OR (p_side = 'business' AND NOT public.is_business_member(a.business_id)) THEN
      RAISE EXCEPTION 'You cannot report this booking' USING ERRCODE = '42501';
    END IF;
    IF NOT public.support_report_open(a) THEN
      RAISE EXCEPTION 'Reports about a visit can be made up to 48 hours after it. For anything else, open a ticket in Support.' USING ERRCODE = '22023';
    END IF;
    v_business := a.business_id;

    SELECT * INTO t FROM public.support_tickets x
     WHERE x.appointment_id = a.id AND x.side = p_side AND x.user_id = v_uid AND x.status <> 'resolved' AND x.parent_id IS NULL
     ORDER BY x.created_at DESC LIMIT 1;
    IF FOUND THEN
      v_mid := public.support_add(t.id, 'user', v_uid, v_msg);
      UPDATE public.support_tickets SET status = 'open' WHERE id = t.id;
      PERFORM public.support_team_notice(t.id, 'reply', v_msg, v_mid::text);
      RETURN jsonb_build_object('id', t.id, 'number', t.number, 'added', true);
    END IF;
  ELSIF p_side = 'business' THEN
    IF v_business IS NULL OR NOT public.is_business_member(v_business) THEN
      RAISE EXCEPTION 'You cannot write for this business' USING ERRCODE = '42501';
    END IF;
  ELSE
    v_business := NULL;
  END IF;

  IF v_subject IS NULL THEN
    IF a.id IS NULL THEN
      RAISE EXCEPTION 'Give your question a short title.' USING ERRCODE = '22023';
    END IF;
    v_subject := public.support_subject(a);
  END IF;

  IF NOT public.rate_ok('support:user:' || v_uid, 10, 86400) THEN
    RAISE EXCEPTION 'You have opened a lot of tickets today. Add to one you already have.' USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.support_tickets (user_id, business_id, side, appointment_id, category, subject, message, status, priority, last_message_at, last_from)
  VALUES (v_uid, v_business, p_side, a.id, p_category, left(v_subject, 140), v_msg, 'open', public.support_priority(p_category), now(), 'user')
  RETURNING * INTO t;
  INSERT INTO public.support_messages (ticket_id, author_id, role, body) VALUES (t.id, v_uid, 'user', v_msg);
  PERFORM public.support_team_notice(t.id, 'new', v_msg, t.id::text);
  RETURN jsonb_build_object('id', t.id, 'number', t.number, 'added', false);
END;
$$;

-- The person's tickets, newest conversation first, with how many have a reply they have not seen.
CREATE OR REPLACE FUNCTION public.my_tickets(p_side text DEFAULT 'client', p_business uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH mine AS (
    SELECT t.*
      FROM public.support_tickets t
     WHERE auth.uid() IS NOT NULL
       AND t.side = p_side
       AND (t.user_id = auth.uid()
            OR (p_side = 'business' AND p_business IS NOT NULL AND t.business_id = p_business AND public.is_business_owner(p_business)))
       AND (p_side <> 'business' OR p_business IS NULL OR t.business_id = p_business)
  )
  SELECT jsonb_build_object(
    'unread', (SELECT count(*) FROM mine m WHERE m.last_from = 'admin' AND m.last_message_at > coalesce(m.user_seen_at, '-infinity'::timestamptz)),
    'rows', coalesce((SELECT jsonb_agg(public.support_card(m) ORDER BY (m.status = 'resolved'), m.last_message_at DESC) FROM (SELECT * FROM mine ORDER BY last_message_at DESC LIMIT 100) m), '[]'::jsonb)
  );
$$;

-- One conversation. Opening it marks our replies as seen.
CREATE OR REPLACE FUNCTION public.my_ticket(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id;
  IF NOT FOUND OR NOT public.support_can_see(t) THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.support_tickets SET user_seen_at = now() WHERE id = t.id;
  RETURN public.support_card(t) || jsonb_build_object(
    'unread', false,
    'can_reply', t.status <> 'resolved' OR t.resolved_at > now() - interval '30 days',
    'messages', public.support_thread(t.id));
END;
$$;

-- Answering us. A reply on a resolved ticket opens it again, for 30 days.
CREATE OR REPLACE FUNCTION public.reply_ticket(p_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  v_body text := trim(coalesce(p_body, ''));
  v_mid uuid;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT public.support_can_see(t) THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_body = '' OR length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Write a reply under 4000 characters' USING ERRCODE = '22023';
  END IF;
  IF t.status = 'resolved' AND t.resolved_at <= now() - interval '30 days' THEN
    RAISE EXCEPTION 'This ticket was closed over 30 days ago. Open a new one.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.rate_ok('support:reply:' || auth.uid(), 60, 3600) THEN
    RAISE EXCEPTION 'Too many replies at once. Wait a moment.' USING ERRCODE = '54000';
  END IF;
  v_mid := public.support_add(t.id, 'user', auth.uid(), v_body);
  UPDATE public.support_tickets SET status = 'open', resolved_at = NULL, user_seen_at = now() WHERE id = t.id;
  PERFORM public.support_team_notice(t.id, 'reply', v_body, v_mid::text);
  RETURN public.my_ticket(t.id);
END;
$$;

-- "This is sorted": the person closes their own ticket.
CREATE OR REPLACE FUNCTION public.close_ticket(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR NOT public.support_can_see(t) THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF t.status <> 'resolved' THEN
    UPDATE public.support_tickets SET status = 'resolved', resolved_at = now() WHERE id = t.id;
    PERFORM public.support_add(t.id, 'system', auth.uid(), 'Closed by you.');
  END IF;
  RETURN public.my_ticket(t.id);
END;
$$;

-- 10. Guests, from the booking link: the link itself proves who they are.
CREATE OR REPLACE FUNCTION public.support_link_booking(p_token text)
RETURNS public.appointments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.* FROM public.booking_links l JOIN public.appointments a ON a.id = l.appointment_id
   WHERE l.token = p_token AND length(coalesce(p_token, '')) >= 32;
$$;

CREATE OR REPLACE FUNCTION public.tickets_by_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
BEGIN
  a := public.support_link_booking(p_token);
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object(
    'can_report', public.support_report_open(a),
    'rows', coalesce((
      SELECT jsonb_agg(public.support_card(t) || jsonb_build_object(
               'can_reply', t.status <> 'resolved' OR t.resolved_at > now() - interval '30 days',
               'messages', public.support_thread(t.id)) ORDER BY t.created_at DESC)
        FROM public.support_tickets t
       WHERE t.appointment_id = a.id AND t.side = 'client'), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.report_by_link(p_token text, p_category text, p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  t public.support_tickets;
  v_msg text := trim(coalesce(p_message, ''));
  v_mid uuid;
BEGIN
  a := public.support_link_booking(p_token);
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.support_category_ok('client', p_category) THEN
    RAISE EXCEPTION 'Pick what it is about' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) < 10 OR length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Tell us a little more, so we can help first time.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.support_report_open(a) THEN
    RAISE EXCEPTION 'Reports about a visit can be made up to 48 hours after it. Write to hello@locappoint.com for anything else.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.rate_ok('support:link:' || a.id, 6, 86400)
     OR NOT public.rate_ok(CASE WHEN public.request_origin() IS NOT NULL THEN 'support:ip:' || public.request_origin() END, 10, 86400) THEN
    RAISE EXCEPTION 'Too many reports at once. Try again later.' USING ERRCODE = '54000';
  END IF;

  SELECT * INTO t FROM public.support_tickets x
   WHERE x.appointment_id = a.id AND x.side = 'client' AND x.status <> 'resolved' AND x.parent_id IS NULL
   ORDER BY x.created_at DESC LIMIT 1;
  IF FOUND THEN
    v_mid := public.support_add(t.id, 'user', NULL, v_msg);
    UPDATE public.support_tickets SET status = 'open' WHERE id = t.id;
    PERFORM public.support_team_notice(t.id, 'reply', v_msg, v_mid::text);
    RETURN jsonb_build_object('id', t.id, 'number', t.number, 'added', true);
  END IF;

  INSERT INTO public.support_tickets (user_id, guest_email, guest_name, business_id, side, appointment_id, category, subject, message, status, priority, last_message_at, last_from)
  VALUES (a.client_id, a.client_email, left(a.client_name, 120), a.business_id, 'client', a.id, p_category, public.support_subject(a), v_msg, 'open',
          public.support_priority(p_category), now(), 'user')
  RETURNING * INTO t;
  INSERT INTO public.support_messages (ticket_id, author_id, role, body) VALUES (t.id, NULL, 'user', v_msg);
  PERFORM public.support_team_notice(t.id, 'new', v_msg, t.id::text);
  RETURN jsonb_build_object('id', t.id, 'number', t.number, 'added', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.reply_by_link(p_token text, p_ticket uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  t public.support_tickets;
  v_body text := trim(coalesce(p_body, ''));
  v_mid uuid;
BEGIN
  a := public.support_link_booking(p_token);
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket FOR UPDATE;
  IF a.id IS NULL OR NOT FOUND OR t.appointment_id IS DISTINCT FROM a.id OR t.side <> 'client' THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_body = '' OR length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Write a reply under 4000 characters' USING ERRCODE = '22023';
  END IF;
  IF t.status = 'resolved' AND t.resolved_at <= now() - interval '30 days' THEN
    RAISE EXCEPTION 'This ticket was closed over 30 days ago. Write to hello@locappoint.com.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.rate_ok('support:link:reply:' || a.id, 30, 3600) THEN
    RAISE EXCEPTION 'Too many replies at once. Wait a moment.' USING ERRCODE = '54000';
  END IF;
  v_mid := public.support_add(t.id, 'user', NULL, v_body);
  UPDATE public.support_tickets SET status = 'open', resolved_at = NULL, user_seen_at = now() WHERE id = t.id;
  PERFORM public.support_team_notice(t.id, 'reply', v_body, v_mid::text);
  RETURN public.tickets_by_link(p_token);
END;
$$;

-- 11. The admin queue. Open first by priority, oldest wait first; then waiting on them; then resolved.
CREATE OR REPLACE FUNCTION public.admin_tickets(p_status text DEFAULT 'open', p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_num bigint := CASE WHEN v_q ~ '^#?\d{1,12}$' THEN replace(v_q, '#', '')::bigint END;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH base AS (
      SELECT t.*, u.full_name AS user_name, u.email AS user_email, b.business_name
        FROM public.support_tickets t
        LEFT JOIN public.users u ON u.id = t.user_id
        LEFT JOIN public.businesses b ON b.id = t.business_id
    ),
    matched AS (
      SELECT * FROM base
       WHERE (p_status IS NULL OR p_status = '' OR p_status = 'all' OR status = p_status)
         AND (v_q IS NULL
              OR number = v_num
              OR subject ILIKE '%' || v_q || '%'
              OR user_email ILIKE '%' || v_q || '%'
              OR user_name ILIKE '%' || v_q || '%'
              OR guest_email ILIKE '%' || v_q || '%'
              OR business_name ILIKE '%' || v_q || '%')
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM matched),
      'counts', jsonb_build_object(
        'open', (SELECT count(*) FROM base WHERE status = 'open'),
        'urgent', (SELECT count(*) FROM base WHERE status = 'open' AND priority = 1),
        'waiting', (SELECT count(*) FROM base WHERE status = 'waiting'),
        'resolved', (SELECT count(*) FROM base WHERE status = 'resolved')),
      'rows', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', m.id,
                 'number', m.number,
                 'subject', m.subject,
                 'category', m.category,
                 'priority', m.priority,
                 'status', m.status,
                 'side', m.side,
                 'outcome', m.outcome,
                 'who', coalesce(m.user_name, m.guest_name, 'Guest'),
                 'email', coalesce(m.user_email, m.guest_email),
                 'guest', m.user_id IS NULL,
                 'business_name', m.business_name,
                 'has_booking', m.appointment_id IS NOT NULL,
                 'from_us', m.parent_id IS NOT NULL,
                 'last_from', m.last_from,
                 'last_message_at', m.last_message_at,
                 'created_at', m.created_at
               ) ORDER BY m.o1, m.o2, m.o3)
          FROM (
            SELECT x.*,
                   CASE x.status WHEN 'open' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END AS o1,
                   CASE WHEN x.status = 'open' THEN x.priority ELSE 0 END AS o2,
                   CASE WHEN x.status = 'open' THEN extract(epoch FROM x.last_message_at) ELSE -extract(epoch FROM x.last_message_at) END AS o3
              FROM matched x
             ORDER BY o1, o2, o3
             LIMIT v_limit OFFSET greatest(coalesce(p_offset, 0), 0)
          ) m
      ), '[]'::jsonb)
    )
  );
END;
$$;

-- Everything needed to decide, on one screen: the conversation with notes, the booking, the money,
-- both sides' history, and what has been done so far.
CREATE OR REPLACE FUNCTION public.admin_ticket(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  a public.appointments;
  b public.businesses;
  v_client uuid;
  v_client_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO a FROM public.appointments WHERE id = t.appointment_id;
  SELECT * INTO b FROM public.businesses WHERE id = coalesce(t.business_id, a.business_id);
  v_client := CASE WHEN a.id IS NOT NULL THEN a.client_id WHEN t.side = 'client' THEN t.user_id END;
  v_client_email := CASE WHEN a.id IS NOT NULL THEN a.client_email WHEN t.side = 'client' THEN t.guest_email END;

  RETURN jsonb_build_object(
    'ticket', jsonb_build_object(
      'id', t.id, 'number', t.number, 'subject', t.subject, 'category', t.category, 'priority', t.priority,
      'status', t.status, 'side', t.side, 'outcome', t.outcome, 'created_at', t.created_at,
      'resolved_at', t.resolved_at, 'last_from', t.last_from, 'last_message_at', t.last_message_at,
      'parent_id', t.parent_id,
      'children', (SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'number', c.number, 'side', c.side, 'status', c.status) ORDER BY c.created_at), '[]'::jsonb)
                     FROM public.support_tickets c WHERE c.parent_id = t.id)),
    'reporter', (
      SELECT jsonb_build_object(
        'name', coalesce(u.full_name, t.guest_name, 'Guest'),
        'email', coalesce(u.email, t.guest_email),
        'has_account', t.user_id IS NOT NULL,
        'tickets', (SELECT count(*) FROM public.support_tickets x WHERE (t.user_id IS NOT NULL AND x.user_id = t.user_id) OR (t.user_id IS NULL AND x.guest_email = t.guest_email)),
        'upheld', (SELECT count(*) FROM public.support_tickets x WHERE x.outcome = 'upheld' AND ((t.user_id IS NOT NULL AND x.user_id = t.user_id) OR (t.user_id IS NULL AND x.guest_email = t.guest_email))),
        'not_upheld', (SELECT count(*) FROM public.support_tickets x WHERE x.outcome = 'not_upheld' AND ((t.user_id IS NOT NULL AND x.user_id = t.user_id) OR (t.user_id IS NULL AND x.guest_email = t.guest_email))))
        FROM (SELECT 1) one LEFT JOIN public.users u ON u.id = t.user_id),
    'messages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'id', m.id, 'role', m.role, 'body', m.body, 'at', m.created_at,
               'author', CASE WHEN m.role IN ('admin', 'note') THEN coalesce(u.full_name, u.email) WHEN m.role = 'user' THEN coalesce(u.full_name, t.guest_name, 'Guest') END
             ) ORDER BY m.created_at, m.id), '[]'::jsonb)
        FROM public.support_messages m LEFT JOIN public.users u ON u.id = m.author_id
       WHERE m.ticket_id = t.id),
    'booking', CASE WHEN a.id IS NULL THEN NULL ELSE (
      SELECT jsonb_build_object(
        'id', a.id, 'date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'),
        'duration_minutes', a.duration_minutes, 'status', a.status, 'service', s.service_name,
        'staff', st.display_name, 'mode', a.mode, 'people', a.people,
        'client_name', a.client_name, 'client_email', a.client_email, 'client_phone', a.client_phone,
        'has_account', a.client_id IS NOT NULL, 'source', a.source,
        'price', a.price, 'total', a.total, 'currency', coalesce(a.currency, CASE WHEN b.country = 'NG' THEN 'NGN' ELSE 'EUR' END),
        'payment_status', a.payment_status, 'payment_method', a.payment_method,
        'cancelled_by', a.cancelled_by, 'cancelled_at', a.cancelled_at, 'created_at', a.created_at,
        'started', (a.appointment_date + a.appointment_time) <= now() AT TIME ZONE coalesce(b.timezone, 'Europe/Lisbon'),
        'report_open', public.support_report_open(a))
        FROM (SELECT 1) one
        LEFT JOIN public.services s ON s.id = a.service_id
        LEFT JOIN public.business_members st ON st.id = a.staff_id) END,
    'payment', CASE WHEN a.id IS NULL THEN NULL ELSE (
      SELECT jsonb_build_object(
        'id', p.id, 'provider', p.provider, 'method', p.method, 'amount', p.amount, 'currency', p.currency,
        'refunded', p.refunded, 'status', p.status, 'paid_at', p.paid_at,
        'pending_refunds', (SELECT coalesce(sum(f.amount), 0) FROM public.payment_refunds f WHERE f.payment_id = p.id AND f.status IN ('queued', 'sending')),
        'refunds', (SELECT coalesce(jsonb_agg(jsonb_build_object('amount', f.amount, 'reason', f.reason, 'status', f.status, 'at', f.created_at) ORDER BY f.created_at), '[]'::jsonb)
                      FROM public.payment_refunds f WHERE f.payment_id = p.id))
        FROM public.payments p
       WHERE p.appointment_id = a.id AND p.status IN ('paid', 'partly_refunded', 'refunded')
       ORDER BY p.paid_at DESC NULLS LAST LIMIT 1) END,
    'business', CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', b.id, 'name', b.business_name, 'slug', b.slug, 'is_active', b.is_active,
      'suspended_at', b.suspended_at, 'suspended_reason', b.suspended_reason,
      'owner_email', (SELECT u.email FROM public.users u WHERE u.id = b.user_id),
      'bookings_90d', (SELECT count(*) FROM public.appointments x WHERE x.business_id = b.id AND x.appointment_date >= current_date - 90),
      'cancelled_by_business_90d', (SELECT count(*) FROM public.appointments x WHERE x.business_id = b.id AND x.appointment_date >= current_date - 90 AND x.status = 'cancelled' AND x.cancelled_by = 'business'),
      'no_shows_marked_90d', (SELECT count(*) FROM public.appointments x WHERE x.business_id = b.id AND x.appointment_date >= current_date - 90 AND x.status = 'no_show'),
      'reports_against', (SELECT count(*) FROM public.support_tickets x WHERE x.business_id = b.id AND x.side = 'client' AND x.parent_id IS NULL),
      'upheld_against', (SELECT count(*) FROM public.support_tickets x WHERE x.business_id = b.id AND x.side = 'client' AND x.outcome = 'upheld'),
      'warnings', (SELECT count(*) FROM public.support_actions x WHERE x.target_business = b.id AND x.action = 'warn')) END,
    'client', CASE WHEN v_client IS NULL AND v_client_email IS NULL THEN NULL ELSE jsonb_build_object(
      'has_account', v_client IS NOT NULL,
      'bookings', (SELECT count(*) FROM public.appointments x WHERE (v_client IS NOT NULL AND x.client_id = v_client) OR (v_client IS NULL AND lower(x.client_email) = lower(v_client_email))),
      'no_shows', (SELECT count(*) FROM public.appointments x WHERE x.status = 'no_show' AND ((v_client IS NOT NULL AND x.client_id = v_client) OR (v_client IS NULL AND lower(x.client_email) = lower(v_client_email)))),
      'late_cancels', (SELECT count(*) FROM public.payment_refunds f JOIN public.appointments x ON x.id = f.appointment_id
                        WHERE f.reason = 'client_late_cancel' AND ((v_client IS NOT NULL AND x.client_id = v_client) OR (v_client IS NULL AND lower(x.client_email) = lower(v_client_email)))),
      'warnings', (SELECT count(*) FROM public.support_actions x WHERE x.action = 'warn'
                     AND ((v_client IS NOT NULL AND x.target_user = v_client) OR (v_client IS NULL AND lower(x.target_email) = lower(v_client_email))))) END,
    'actions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'action', x.action, 'amount', x.amount, 'detail', x.detail, 'at', x.created_at,
               'by', coalesce(u.full_name, u.email)) ORDER BY x.created_at), '[]'::jsonb)
        FROM public.support_actions x LEFT JOIN public.users u ON u.id = x.admin_id
       WHERE x.ticket_id = t.id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.support_log(p_ticket uuid, p_action text, p_detail text, p_amount numeric DEFAULT NULL,
                                              p_user uuid DEFAULT NULL, p_business uuid DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.support_actions (ticket_id, admin_id, action, target_user, target_business, target_email, amount, detail)
  VALUES (p_ticket, auth.uid(), p_action, p_user, p_business, p_email, p_amount, left(p_detail, 2000));
$$;

-- A reply (the person is told), or a note (only staff see it). Replying sets "Waiting on you" unless
-- another status is chosen.
CREATE OR REPLACE FUNCTION public.admin_reply(p_id uuid, p_body text, p_note boolean DEFAULT false, p_status text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  v_body text := trim(coalesce(p_body, ''));
  v_status text;
  v_mid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_body = '' OR length(v_body) > 4000 THEN
    RAISE EXCEPTION 'Write something under 4000 characters' USING ERRCODE = '22023';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'waiting', 'resolved') THEN
    RAISE EXCEPTION 'Unknown status' USING ERRCODE = '22023';
  END IF;

  IF p_note THEN
    PERFORM public.support_add(t.id, 'note', auth.uid(), v_body);
    v_status := coalesce(p_status, t.status);
  ELSE
    v_mid := public.support_add(t.id, 'admin', auth.uid(), v_body);
    v_status := coalesce(p_status, 'waiting');
  END IF;
  UPDATE public.support_tickets
     SET status = v_status,
         resolved_at = CASE WHEN v_status = 'resolved' THEN coalesce(resolved_at, now()) END
   WHERE id = t.id;
  IF NOT p_note THEN
    PERFORM public.support_notice(t.id, 'support_reply', v_body, v_mid::text);
  END IF;
  RETURN public.admin_ticket(t.id);
END;
$$;

-- Status, priority and outcome. The outcome (upheld or not) is what batch 3 counts against a business.
CREATE OR REPLACE FUNCTION public.admin_update_ticket(p_id uuid, p_status text DEFAULT NULL, p_priority integer DEFAULT NULL, p_outcome text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  v_outcome text := nullif(p_outcome, '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'waiting', 'resolved') THEN
    RAISE EXCEPTION 'Unknown status' USING ERRCODE = '22023';
  END IF;
  IF p_priority IS NOT NULL AND p_priority NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Priority is 1, 2 or 3' USING ERRCODE = '22023';
  END IF;
  IF p_outcome IS NOT NULL AND v_outcome IS NOT NULL AND v_outcome NOT IN ('upheld', 'not_upheld') THEN
    RAISE EXCEPTION 'Unknown outcome' USING ERRCODE = '22023';
  END IF;

  IF p_status IS NOT NULL AND p_status <> t.status THEN
    UPDATE public.support_tickets
       SET status = p_status, resolved_at = CASE WHEN p_status = 'resolved' THEN now() END
     WHERE id = t.id;
    PERFORM public.support_add(t.id, 'system', auth.uid(),
      CASE p_status WHEN 'resolved' THEN 'Marked resolved.' WHEN 'waiting' THEN 'Waiting on you.' ELSE 'Opened again.' END);
    PERFORM public.support_log(t.id, 'status', p_status);
  END IF;
  IF p_priority IS NOT NULL AND p_priority <> t.priority THEN
    UPDATE public.support_tickets SET priority = p_priority WHERE id = t.id;
    PERFORM public.support_log(t.id, 'priority', p_priority::text);
  END IF;
  IF p_outcome IS NOT NULL AND v_outcome IS DISTINCT FROM t.outcome THEN
    UPDATE public.support_tickets SET outcome = v_outcome WHERE id = t.id;
    PERFORM public.support_log(t.id, 'outcome', coalesce(v_outcome, 'cleared'), NULL, NULL, CASE WHEN t.side = 'client' THEN t.business_id END);
  END IF;
  RETURN public.admin_ticket(t.id);
END;
$$;

-- 12. Actions. Each is written to the log with who and when, and leaves a note in the conversation.

-- Money back to the client, the way it came, from what is still unrefunded. Locappoint never holds
-- it: the refund goes through the same provider as every other refund.
CREATE OR REPLACE FUNCTION public.admin_refund(p_ticket uuid, p_amount numeric, p_detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  pay public.payments;
  v_left numeric;
  v_dec integer;
  v_amount numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  IF NOT FOUND OR t.appointment_id IS NULL THEN
    RAISE EXCEPTION 'This ticket has no booking to refund' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO pay FROM public.payments
   WHERE appointment_id = t.appointment_id AND status IN ('paid', 'partly_refunded')
   ORDER BY paid_at DESC NULLS LAST LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing was paid on Locappoint for this booking, so there is nothing to refund here' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payment_refunds f WHERE f.payment_id = pay.id AND f.reason = 'support') THEN
    RAISE EXCEPTION 'A support refund was already made on this payment' USING ERRCODE = '22023';
  END IF;
  v_dec := CASE WHEN pay.currency = 'NGN' THEN 0 ELSE 2 END;
  v_amount := round(coalesce(p_amount, 0), v_dec);
  v_left := pay.amount - pay.refunded
            - (SELECT coalesce(sum(f.amount), 0) FROM public.payment_refunds f WHERE f.payment_id = pay.id AND f.status IN ('queued', 'sending'));
  IF v_amount <= 0 OR v_amount > v_left THEN
    RAISE EXCEPTION 'Refund between 0 and %', v_left USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.payment_refunds (payment_id, appointment_id, amount, reason)
  VALUES (pay.id, t.appointment_id, v_amount, 'support');
  PERFORM public.support_log(t.id, 'refund', nullif(trim(coalesce(p_detail, '')), ''), v_amount, NULL, pay.business_id);
  PERFORM public.support_add(t.id, 'note', auth.uid(), 'Refund of ' || v_amount || ' ' || pay.currency || ' sent to the client.'
                             || coalesce(' ' || nullif(trim(coalesce(p_detail, '')), ''), ''));
  RETURN public.admin_ticket(t.id);
END;
$$;

-- No-show, or attended after all. Only once the visit has started. A no-show follows the written
-- rule for money like any other no-show.
CREATE OR REPLACE FUNCTION public.admin_set_visit(p_ticket uuid, p_status text, p_detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  a public.appointments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('no_show', 'completed') THEN
    RAISE EXCEPTION 'No-show or attended only' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  SELECT * INTO a FROM public.appointments WHERE id = t.appointment_id FOR UPDATE;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'This ticket has no booking' USING ERRCODE = '22023';
  END IF;
  IF a.status = p_status THEN
    RETURN public.admin_ticket(t.id);
  END IF;
  IF a.status NOT IN ('confirmed', 'completed', 'no_show') THEN
    RAISE EXCEPTION 'Only a confirmed visit can be marked' USING ERRCODE = '22023';
  END IF;
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  BEGIN
    UPDATE public.appointments SET status = p_status WHERE id = a.id;
  EXCEPTION WHEN others THEN
    PERFORM set_config('locappoint.trusted_write', 'off', true);
    RAISE;
  END;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  PERFORM public.support_log(t.id, CASE p_status WHEN 'no_show' THEN 'no_show' ELSE 'attended' END,
                             nullif(trim(coalesce(p_detail, '')), ''), NULL, a.client_id, a.business_id, a.client_email);
  PERFORM public.support_add(t.id, 'note', auth.uid(),
    CASE p_status WHEN 'no_show' THEN 'Marked as a no-show.' ELSE 'Marked as attended.' END
    || coalesce(' ' || nullif(trim(coalesce(p_detail, '')), ''), ''));
  RETURN public.admin_ticket(t.id);
END;
$$;

-- A written warning to the client or the business in the booking, sent to them and counted.
CREATE OR REPLACE FUNCTION public.admin_warn(p_ticket uuid, p_target text, p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  a public.appointments;
  b public.businesses;
  v_msg text := trim(coalesce(p_message, ''));
  v_user uuid;
  v_email text;
  v_name text;
  v_aud text;
  v_key text := gen_random_uuid()::text;
  v_payload jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_target NOT IN ('client', 'business') THEN
    RAISE EXCEPTION 'Warn the client or the business' USING ERRCODE = '22023';
  END IF;
  IF length(v_msg) < 10 OR length(v_msg) > 2000 THEN
    RAISE EXCEPTION 'Say what was wrong, in under 2000 characters' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO a FROM public.appointments WHERE id = t.appointment_id;
  SELECT * INTO b FROM public.businesses WHERE id = coalesce(t.business_id, a.business_id);

  IF p_target = 'business' THEN
    IF b.id IS NULL THEN
      RAISE EXCEPTION 'This ticket has no business' USING ERRCODE = '22023';
    END IF;
    v_user := b.user_id;
    v_aud := 'business';
  ELSE
    v_user := CASE WHEN a.id IS NOT NULL THEN a.client_id WHEN t.side = 'client' THEN t.user_id END;
    v_email := CASE WHEN a.id IS NOT NULL THEN a.client_email WHEN t.side = 'client' THEN t.guest_email END;
    v_name := CASE WHEN a.id IS NOT NULL THEN a.client_name ELSE t.guest_name END;
    v_aud := 'client';
  END IF;
  IF v_user IS NOT NULL THEN
    SELECT u.email, coalesce(u.full_name, v_name) INTO v_email, v_name FROM public.users u WHERE u.id = v_user;
  END IF;
  IF v_user IS NULL AND v_email IS NULL THEN
    RAISE EXCEPTION 'There is no way to reach them: no account and no email' USING ERRCODE = '22023';
  END IF;

  v_payload := jsonb_build_object(
    'audience', v_aud, 'ticket_id', t.id, 'number', t.number, 'body', v_msg,
    'name', split_part(coalesce(v_name, ''), ' ', 1),
    'business_name', b.business_name,
    'service_name', (SELECT s.service_name FROM public.services s WHERE s.id = a.service_id),
    'date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'));

  BEGIN
    IF v_user IS NOT NULL THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (v_user, v_aud, 'support_warning', CASE WHEN v_aud = 'business' THEN b.id END, a.id, v_payload, 'support:warn:inbox:' || v_key);
      IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_user AND u.push_enabled)
         AND EXISTS (SELECT 1 FROM public.push_tokens p WHERE p.user_id = v_user) THEN
        INSERT INTO public.notification_queue (kind, channel, recipient_user, business_id, appointment_id, payload, dedupe_key)
        VALUES ('support_warning', 'push', v_user, b.id, a.id, v_payload, 'support:warn:push:' || v_key);
      END IF;
    END IF;
    IF v_email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES ('support_warning', v_user, v_email, b.id, a.id, v_payload, 'support:warn:email:' || v_key);
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'support warning for % not sent: %', p_ticket, SQLERRM;
  END;

  PERFORM public.support_log(t.id, 'warn', p_target || ': ' || v_msg, NULL, v_user, CASE WHEN p_target = 'business' THEN b.id END, v_email);
  PERFORM public.support_add(t.id, 'note', auth.uid(), 'Warning sent to the ' || p_target || ': ' || v_msg);
  RETURN public.admin_ticket(t.id);
END;
$$;

-- Pause a business while a serious report is looked into. Its page stays, bookings stop, and the
-- owner cannot switch it back on until we lift it.
CREATE OR REPLACE FUNCTION public.admin_suspend(p_ticket uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  b public.businesses;
  v_reason text := trim(coalesce(p_reason, ''));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF length(v_reason) < 10 OR length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Give the reason the owner will see, in under 500 characters' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  SELECT * INTO b FROM public.businesses
   WHERE id = coalesce(t.business_id, (SELECT a.business_id FROM public.appointments a WHERE a.id = t.appointment_id)) FOR UPDATE;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'This ticket has no business' USING ERRCODE = '22023';
  END IF;
  IF b.suspended_at IS NOT NULL THEN
    RETURN public.admin_ticket(t.id);
  END IF;
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.businesses
     SET suspended_at = now(), suspended_reason = v_reason, suspended_was_active = is_active, is_active = false
   WHERE id = b.id;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  PERFORM public.support_log(t.id, 'suspend', v_reason, NULL, b.user_id, b.id);
  PERFORM public.support_add(t.id, 'note', auth.uid(), 'Business paused: ' || v_reason);
  PERFORM public.support_tell_business(t.id, 'We paused bookings on your page while we look into a report: ' || v_reason
    || E'\n\nYour page stays up. Reply here with your side and a person reviews it.');
  RETURN public.admin_ticket(t.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend(p_ticket uuid, p_detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  b public.businesses;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  SELECT * INTO b FROM public.businesses
   WHERE id = coalesce(t.business_id, (SELECT a.business_id FROM public.appointments a WHERE a.id = t.appointment_id)) FOR UPDATE;
  IF b.id IS NULL OR b.suspended_at IS NULL THEN
    RETURN public.admin_ticket(t.id);
  END IF;
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  UPDATE public.businesses
     SET suspended_at = NULL, suspended_reason = NULL, is_active = coalesce(suspended_was_active, true), suspended_was_active = NULL
   WHERE id = b.id;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
  PERFORM public.support_log(t.id, 'unsuspend', nullif(trim(coalesce(p_detail, '')), ''), NULL, b.user_id, b.id);
  PERFORM public.support_add(t.id, 'note', auth.uid(), 'Business back on.' || coalesce(' ' || nullif(trim(coalesce(p_detail, '')), ''), ''));
  PERFORM public.support_tell_business(t.id, 'Bookings on your page are back on. Thank you for your patience.');
  RETURN public.admin_ticket(t.id);
END;
$$;

-- Ask the other side of the booking for their account, in a ticket of their own linked to this one.
CREATE OR REPLACE FUNCTION public.admin_ask_other(p_ticket uuid, p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  a public.appointments;
  b public.businesses;
  c public.support_tickets;
  v_msg text := trim(coalesce(p_message, ''));
  v_side text;
  v_mid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF length(v_msg) < 10 OR length(v_msg) > 4000 THEN
    RAISE EXCEPTION 'Write the question, in under 4000 characters' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO a FROM public.appointments WHERE id = t.appointment_id;
  SELECT * INTO b FROM public.businesses WHERE id = coalesce(t.business_id, a.business_id);
  v_side := CASE WHEN t.side = 'client' THEN 'business' ELSE 'client' END;
  IF (v_side = 'client' AND a.id IS NULL) OR (v_side = 'business' AND b.id IS NULL) THEN
    RAISE EXCEPTION 'This ticket has no other side to ask' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO c FROM public.support_tickets x WHERE x.parent_id = t.id AND x.side = v_side ORDER BY x.created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    v_mid := public.support_add(c.id, 'admin', auth.uid(), v_msg);
    UPDATE public.support_tickets SET status = 'waiting', resolved_at = NULL WHERE id = c.id;
  ELSE
    IF v_side = 'client' AND a.client_id IS NULL AND a.client_email IS NULL THEN
      RAISE EXCEPTION 'This client left no account and no email, so we cannot reach them here' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.support_tickets (user_id, guest_email, guest_name, business_id, side, appointment_id, parent_id, category, subject, message,
                                        status, priority, last_message_at, last_from)
    VALUES (CASE WHEN v_side = 'business' THEN b.user_id ELSE a.client_id END,
            CASE WHEN v_side = 'client' THEN a.client_email END,
            CASE WHEN v_side = 'client' THEN left(a.client_name, 120) END,
            b.id, v_side, a.id, t.id,
            CASE WHEN public.support_category_ok(v_side, t.category) THEN t.category ELSE 'bookings' END,
            CASE WHEN a.id IS NOT NULL THEN public.support_subject(a) ELSE left('About ' || t.subject, 140) END,
            v_msg, 'waiting', t.priority, now(), 'admin')
    RETURNING * INTO c;
    INSERT INTO public.support_messages (ticket_id, author_id, role, body) VALUES (c.id, auth.uid(), 'admin', v_msg) RETURNING id INTO v_mid;
  END IF;
  PERFORM public.support_notice(c.id, 'support_reply', v_msg, v_mid::text);
  PERFORM public.support_log(t.id, 'ask_other', v_side || ' #' || c.number, NULL,
                             CASE WHEN v_side = 'business' THEN b.user_id ELSE a.client_id END, b.id,
                             CASE WHEN v_side = 'client' THEN a.client_email END);
  PERFORM public.support_add(t.id, 'note', auth.uid(), 'Asked the ' || v_side || ' in #' || c.number || ': ' || v_msg);
  RETURN public.admin_ticket(t.id);
END;
$$;

-- Tells the business owner on a ticket they can see and answer: the ticket itself when it is
-- theirs, otherwise the linked one we keep with them.
CREATE OR REPLACE FUNCTION public.support_tell_business(p_ticket uuid, p_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.support_tickets;
  v_mid uuid;
BEGIN
  SELECT * INTO t FROM public.support_tickets WHERE id = p_ticket;
  IF t.side = 'business' THEN
    v_mid := public.support_add(t.id, 'admin', auth.uid(), p_message);
    UPDATE public.support_tickets SET status = 'waiting', resolved_at = NULL WHERE id = t.id;
    PERFORM public.support_notice(t.id, 'support_reply', p_message, v_mid::text);
  ELSE
    PERFORM public.admin_ask_other(t.id, p_message);
  END IF;
END;
$$;

-- What a paused business sees on its own screens.
CREATE OR REPLACE FUNCTION public.my_business_suspension(p_business uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN b.suspended_at IS NULL THEN NULL
              ELSE jsonb_build_object('since', b.suspended_at, 'reason', b.suspended_reason) END
    FROM public.businesses b
   WHERE b.id = p_business AND public.is_business_member(b.id);
$$;

-- 13. Tickets waiting on the person for 7 days close themselves; a reply opens them again.
CREATE OR REPLACE FUNCTION public.support_tidy()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t record;
  v_count integer := 0;
BEGIN
  FOR t IN
    SELECT x.id FROM public.support_tickets x
     WHERE x.status = 'waiting' AND x.last_message_at < now() - interval '7 days'
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.support_tickets SET status = 'resolved', resolved_at = now() WHERE id = t.id;
    PERFORM public.support_add(t.id, 'system', NULL, 'Closed after 7 days without a reply. Reply to open it again.');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;


-- 14. A refund agreed in support says so on the receipt.
CREATE OR REPLACE FUNCTION public.issue_receipt(p_appointment uuid, p_kind text, p_refund uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  b public.businesses;
  pay public.payments;
  f public.payment_refunds;
  v_service text;
  v_staff text;
  v_seq integer;
  v_prefix text;
  v_lines jsonb;
  v_total numeric;
  v_currency text;
  v_method text;
  v_refund_of text;
  v_id uuid;
  r public.receipts;
BEGIN
  BEGIN
    IF p_kind = 'refund' THEN
      SELECT * INTO f FROM public.payment_refunds WHERE id = p_refund;
      IF NOT FOUND OR f.status <> 'sent' THEN RETURN NULL; END IF;
      SELECT * INTO pay FROM public.payments WHERE id = f.payment_id;
      SELECT * INTO a FROM public.appointments WHERE id = coalesce(f.appointment_id, pay.appointment_id);
      SELECT * INTO b FROM public.businesses WHERE id = pay.business_id;
    ELSE
      SELECT * INTO a FROM public.appointments WHERE id = p_appointment;
      IF NOT FOUND THEN RETURN NULL; END IF;
      SELECT * INTO b FROM public.businesses WHERE id = a.business_id;
    END IF;
    IF b.id IS NULL THEN RETURN NULL; END IF;

    IF p_kind IN ('payment', 'visit') AND EXISTS (SELECT 1 FROM public.receipts x WHERE x.appointment_id = a.id AND x.kind = p_kind) THEN
      RETURN NULL;
    END IF;
    IF p_kind = 'refund' AND EXISTS (SELECT 1 FROM public.receipts x WHERE x.refund_id = f.id) THEN
      RETURN NULL;
    END IF;

    SELECT s.service_name INTO v_service FROM public.services s WHERE s.id = a.service_id;
    SELECT m.display_name INTO v_staff FROM public.business_members m WHERE m.id = a.staff_id;
    IF coalesce(a.people, 1) > 1 THEN
      v_service := coalesce(v_service, 'Booking') || ' for ' || a.people || ' people';
    END IF;
    IF jsonb_array_length(coalesce(a.addons, '[]')) > 0 THEN
      v_service := concat_ws(' + ', v_service, (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(a.addons) x));
    END IF;
    v_currency := coalesce(pay.currency, a.currency, CASE WHEN b.country = 'NG' THEN 'NGN' ELSE 'EUR' END);

    IF p_kind = 'payment' THEN
      SELECT * INTO pay FROM public.payments x
       WHERE x.appointment_id = a.id AND x.status IN ('paid', 'refunded', 'partly_refunded')
       ORDER BY x.paid_at DESC NULLS LAST LIMIT 1;
      IF NOT FOUND OR coalesce(a.total, 0) <= 0 THEN RETURN NULL; END IF;
      v_currency := pay.currency;
      v_total := pay.amount;
      v_method := coalesce(pay.method, a.payment_method, 'card');
      v_lines := jsonb_build_array(jsonb_build_object('label', coalesce(v_service, 'Booking'), 'amount', a.price))
        || CASE WHEN coalesce(a.travel_fee, 0) > 0 THEN jsonb_build_array(jsonb_build_object('label', 'Travel to you', 'amount', a.travel_fee)) ELSE '[]'::jsonb END
        || CASE WHEN coalesce(a.client_fee, 0) > 0 THEN jsonb_build_array(jsonb_build_object('label', 'Locappoint service fee', 'amount', a.client_fee)) ELSE '[]'::jsonb END;
    ELSIF p_kind = 'refund' THEN
      v_total := f.amount;
      v_method := coalesce(pay.method, 'card');
      SELECT x.number INTO v_refund_of FROM public.receipts x WHERE x.payment_id = pay.id AND x.kind = 'payment' LIMIT 1;
      v_lines := jsonb_build_array(jsonb_build_object(
        'label', CASE f.reason
          WHEN 'client_cancelled' THEN 'Cancelled in time, full refund'
          WHEN 'client_late_cancel' THEN 'Cancelled after free cancellation closed'
          WHEN 'business_cancelled' THEN 'Cancelled by the business, full refund'
          WHEN 'declined' THEN 'Not accepted by the business, full refund'
          WHEN 'no_show' THEN 'Missed visit'
          WHEN 'support' THEN 'Refund agreed with Locappoint support'
          ELSE 'Paid after the time was released, full refund' END,
        'amount', f.amount));
    ELSE
      IF coalesce(a.price, 0) <= 0 OR a.payment_status <> 'at_visit' THEN RETURN NULL; END IF;
      v_total := a.price + coalesce(a.travel_fee, 0);
      v_method := 'at_visit';
      v_lines := jsonb_build_array(jsonb_build_object('label', coalesce(v_service, 'Visit'), 'amount', a.price))
        || CASE WHEN coalesce(a.travel_fee, 0) > 0 THEN jsonb_build_array(jsonb_build_object('label', 'Travel to you', 'amount', a.travel_fee)) ELSE '[]'::jsonb END;
    END IF;

    -- Numbered per business, in order, without gaps between concurrent issues.
    PERFORM pg_advisory_xact_lock(hashtext('receipts:' || b.id::text));
    SELECT coalesce(max(x.seq), 0) + 1 INTO v_seq FROM public.receipts x WHERE x.business_id = b.id;
    v_prefix := upper(left(regexp_replace(coalesce(b.slug, b.business_name, ''), '[^A-Za-z]', '', 'g'), 3));
    IF char_length(v_prefix) < 3 THEN v_prefix := 'LOC'; END IF;

    INSERT INTO public.receipts (business_id, appointment_id, payment_id, refund_id, kind, seq, number, client_name, client_email,
                                 business, booking, lines, total, currency, method, refund_of)
    VALUES (
      b.id, a.id, pay.id, f.id, p_kind, v_seq, v_prefix || '-' || lpad(v_seq::text, 5, '0'),
      a.client_name, a.client_email,
      jsonb_build_object('name', b.business_name, 'address', b.address, 'city', b.city, 'country', b.country, 'slug', b.slug),
      jsonb_build_object('service', coalesce(v_service, 'Booking'), 'staff', v_staff,
                         'date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'), 'duration_minutes', a.duration_minutes),
      v_lines, v_total, v_currency, v_method, v_refund_of
    )
    RETURNING * INTO r;
    v_id := r.id;

    -- Emailed under the same rule as booking emails: the client's own account, or a booking they made.
    IF current_setting('locappoint.receipts_quiet', true) IS DISTINCT FROM 'on' AND a.id IS NOT NULL AND a.client_email IS NOT NULL AND (a.client_id IS NOT NULL OR a.source = 'web') THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        'receipt',
        CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN a.client_id END,
        a.client_email, b.id, a.id,
        jsonb_build_object('audience', 'client', 'kind', r.kind, 'number', r.number, 'token', r.token, 'business', r.business,
                           'booking', r.booking, 'lines', r.lines, 'total', r.total, 'currency', r.currency, 'method', r.method,
                           'refund_of', r.refund_of, 'client_name', r.client_name, 'issued_at', r.issued_at),
        'receipt:' || r.id
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN v_id;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'receipt not issued for % (%): %', coalesce(p_appointment, p_refund), p_kind, SQLERRM;
    RETURN NULL;
  END;
END;
$$;


-- 15. Who may call what. Everything else stays inside the database.
REVOKE EXECUTE ON FUNCTION public.support_priority(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_category_ok(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_report_open(public.appointments) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_subject(public.appointments) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_can_see(public.support_tickets) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_thread(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_card(public.support_tickets) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_add(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_team_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_notice(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_team_notice(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_link_booking(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_log(uuid, text, text, numeric, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_tell_business(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_tidy() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_receipt(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.open_ticket(text, text, text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_ticket(text, text, text, text, uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_tickets(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_tickets(text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_ticket(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reply_ticket(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_ticket(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.close_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_ticket(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.my_business_suspension(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_business_suspension(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_tickets(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_tickets(text, text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_ticket(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ticket(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reply(uuid, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reply(uuid, text, boolean, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_ticket(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_ticket(uuid, text, integer, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_refund(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund(uuid, numeric, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_visit(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_visit(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_warn(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_warn(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_suspend(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_suspend(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unsuspend(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_ask_other(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ask_other(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.tickets_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tickets_by_link(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.report_by_link(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_by_link(text, text, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reply_by_link(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reply_by_link(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_tidy() TO service_role;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'support-tidy';
SELECT cron.schedule('support-tidy', '17 3 * * *', $cron$SELECT public.support_tidy()$cron$);

NOTIFY pgrst, 'reload schema';

COMMIT;
