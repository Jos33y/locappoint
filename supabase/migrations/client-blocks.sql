-- Blocks with reasons. An owner can stop a client booking online, always with a reason. The block
-- catches the client's account, email and phone, so booking as a guest does not get round it. The
-- client sees a neutral line, never the word "blocked", and can tell Locappoint. Every block goes to
-- the admin queue, where staff keep it or lift it with a note and the business is told. "Rude or
-- unsafe" also opens a safety ticket. A business that blocks a lot is flagged.
-- The business can still add the client by hand. Existing bookings stay.
-- Needs support-desk.sql. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.support_team_notice(uuid, text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'Run support-desk.sql first';
  END IF;
END;
$$;

-- 1. The blocks. Who (account, email, phone), why, and what Locappoint decided.
CREATE TABLE IF NOT EXISTS public.client_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  email text CHECK (email IS NULL OR char_length(email) <= 320),
  phone_digits text CHECK (phone_digits IS NULL OR phone_digits ~ '^\d{6,15}$'),
  client_name text CHECK (client_name IS NULL OR char_length(client_name) <= 120),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('no_shows', 'late_cancels', 'unsafe', 'unpaid', 'other')),
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lifted')),
  review text NOT NULL DEFAULT 'pending' CHECK (review IN ('pending', 'kept', 'lifted')),
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 1000),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  lifted_at timestamptz,
  lifted_by text CHECK (lifted_by IS NULL OR lifted_by IN ('business', 'locappoint')),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_id IS NOT NULL OR email IS NOT NULL OR phone_digits IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS client_blocks_business ON public.client_blocks (business_id, status);
CREATE INDEX IF NOT EXISTS client_blocks_review ON public.client_blocks (review, created_at);
CREATE INDEX IF NOT EXISTS client_blocks_client ON public.client_blocks (client_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS client_blocks_email ON public.client_blocks (lower(email)) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS client_blocks_phone ON public.client_blocks (phone_digits) WHERE status = 'active';

ALTER TABLE public.client_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_blocks FROM anon, authenticated;

-- The last nine digits: +351 912 345 678 and 912345678 are the same phone.
CREATE OR REPLACE FUNCTION public.block_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN length(d) >= 6 THEN right(d, 9) END
    FROM (SELECT regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') AS d) x;
$$;

-- Whether this person may book this business online.
CREATE OR REPLACE FUNCTION public.client_is_blocked(p_business uuid, p_client uuid, p_email text, p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_blocks k
     WHERE k.business_id = p_business AND k.status = 'active'
       AND ((p_client IS NOT NULL AND k.client_id = p_client)
            OR (nullif(trim(p_email), '') IS NOT NULL AND lower(k.email) = lower(trim(p_email)))
            OR (public.block_phone(p_phone) IS NOT NULL AND k.phone_digits = public.block_phone(p_phone))));
$$;

-- 2. Every booking a client makes is checked; the business adding one by hand is not.
CREATE OR REPLACE FUNCTION public.appointments_block_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_business_member(NEW.business_id) THEN
    RETURN NEW;
  END IF;
  IF public.client_is_blocked(NEW.business_id, coalesce(NEW.client_id, auth.uid()), NEW.client_email, NEW.client_phone) THEN
    RAISE EXCEPTION 'This business is not taking online bookings from you. Contact them directly.'
      USING ERRCODE = 'P0001', HINT = 'not_taking_you';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_block_guard ON public.appointments;
CREATE TRIGGER appointments_block_guard
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_block_guard();

-- 3. Flags: more than 3 blocks in 30 days, or blocks on more than 5% of the clients of the last year.
CREATE OR REPLACE FUNCTION public.block_flag(p_business uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH n AS (
    SELECT
      (SELECT count(*) FROM public.client_blocks k WHERE k.business_id = p_business AND k.created_at > now() - interval '30 days') AS recent,
      (SELECT count(*) FROM public.client_blocks k WHERE k.business_id = p_business AND k.status = 'active') AS active,
      (SELECT count(DISTINCT coalesce(a.client_id::text, lower(a.client_email), public.block_phone(a.client_phone), a.client_name))
         FROM public.appointments a
        WHERE a.business_id = p_business AND a.appointment_date > current_date - 365 AND a.status <> 'cancelled') AS clients
  )
  SELECT jsonb_build_object(
    'recent', n.recent,
    'active', n.active,
    'clients', n.clients,
    'share', CASE WHEN n.clients > 0 THEN round(100.0 * n.active / n.clients, 1) END,
    'flagged', n.recent > 3 OR (n.clients >= 20 AND n.active * 100 > n.clients * 5)
  ) FROM n;
$$;

-- 4. The owner blocks from a booking: the client's account, email and phone come from it.
CREATE OR REPLACE FUNCTION public.block_client(p_appointment uuid, p_reason text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  k public.client_blocks;
  t public.support_tickets;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_phone text;
  v_label text;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment;
  IF NOT FOUND OR NOT public.is_business_owner(a.business_id) THEN
    RAISE EXCEPTION 'Only the owner can block a client' USING ERRCODE = '42501';
  END IF;
  IF p_reason NOT IN ('no_shows', 'late_cancels', 'unsafe', 'unpaid', 'other') THEN
    RAISE EXCEPTION 'Pick a reason' USING ERRCODE = '22023';
  END IF;
  IF p_reason = 'other' AND (v_note IS NULL OR length(v_note) < 10) THEN
    RAISE EXCEPTION 'Say what happened, in a sentence or two' USING ERRCODE = '22023';
  END IF;
  v_phone := public.block_phone(a.client_phone);
  IF a.client_id IS NULL AND nullif(trim(a.client_email), '') IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'This booking has no account, email or phone to block. They could not book online anyway.' USING ERRCODE = '22023';
  END IF;
  IF public.client_is_blocked(a.business_id, a.client_id, a.client_email, a.client_phone) THEN
    RAISE EXCEPTION 'This client is already blocked' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.client_blocks (business_id, client_id, email, phone_digits, client_name, appointment_id, reason, note, created_by)
  VALUES (a.business_id, a.client_id, nullif(lower(trim(a.client_email)), ''), v_phone, left(a.client_name, 120), a.id, p_reason, left(v_note, 1000), auth.uid())
  RETURNING * INTO k;

  -- Rude or unsafe is a safety report as well: it goes to the front of the support queue.
  IF p_reason = 'unsafe' THEN
    v_label := 'Blocked for rude or unsafe behaviour' || coalesce(': ' || v_note, '.');
    INSERT INTO public.support_tickets (user_id, business_id, side, appointment_id, category, subject, message, status, priority, last_message_at, last_from)
    VALUES (auth.uid(), a.business_id, 'business', a.id, 'safety', left('Safety: ' || coalesce(a.client_name, 'a client'), 140),
            CASE WHEN length(v_label) >= 10 THEN left(v_label, 4000) ELSE 'Blocked for rude or unsafe behaviour.' END,
            'open', 1, now(), 'user')
    RETURNING * INTO t;
    INSERT INTO public.support_messages (ticket_id, author_id, role, body) VALUES (t.id, auth.uid(), 'user', t.message);
    UPDATE public.client_blocks SET ticket_id = t.id WHERE id = k.id;
    PERFORM public.support_team_notice(t.id, 'new', t.message, t.id::text);
  END IF;

  RETURN public.my_blocks(a.business_id);
END;
$$;

-- The owner lifts their own block.
CREATE OR REPLACE FUNCTION public.unblock_client(p_block uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  k public.client_blocks;
BEGIN
  SELECT * INTO k FROM public.client_blocks WHERE id = p_block FOR UPDATE;
  IF NOT FOUND OR NOT public.is_business_owner(k.business_id) THEN
    RAISE EXCEPTION 'Block not found' USING ERRCODE = 'P0002';
  END IF;
  IF k.status = 'active' THEN
    UPDATE public.client_blocks SET status = 'lifted', lifted_at = now(), lifted_by = 'business' WHERE id = k.id;
  END IF;
  RETURN public.my_blocks(k.business_id);
END;
$$;

-- The owner's list: active blocks first, with what Locappoint decided.
CREATE OR REPLACE FUNCTION public.my_blocks(p_business uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', k.id, 'name', k.client_name, 'email', k.email, 'phone', k.phone_digits, 'has_account', k.client_id IS NOT NULL,
           'reason', k.reason, 'note', k.note, 'status', k.status, 'review', k.review, 'review_note', k.review_note,
           'lifted_by', k.lifted_by, 'created_at', k.created_at, 'appointment_id', k.appointment_id
         ) ORDER BY (k.status = 'active') DESC, k.created_at DESC), '[]'::jsonb)
    FROM public.client_blocks k
   WHERE k.business_id = p_business AND public.is_business_owner(p_business)
     AND (k.status = 'active' OR k.created_at > now() - interval '90 days');
$$;

-- Whether the client in a booking is blocked, for the booking sheet.
CREATE OR REPLACE FUNCTION public.booking_block(p_appointment uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT jsonb_build_object('id', k.id, 'reason', k.reason, 'review', k.review)
            FROM public.client_blocks k
           WHERE k.business_id = a.business_id AND k.status = 'active'
             AND ((a.client_id IS NOT NULL AND k.client_id = a.client_id)
                  OR (nullif(trim(a.client_email), '') IS NOT NULL AND lower(k.email) = lower(trim(a.client_email)))
                  OR (public.block_phone(a.client_phone) IS NOT NULL AND k.phone_digits = public.block_phone(a.client_phone)))
           ORDER BY k.created_at DESC LIMIT 1)
    FROM public.appointments a
   WHERE a.id = p_appointment AND public.is_business_owner(a.business_id);
$$;

-- 5. Admin review. Pending first, oldest first; each with the business's flag and the client's record.
CREATE OR REPLACE FUNCTION public.admin_blocks(p_review text DEFAULT 'pending', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
  RETURN (
    WITH m AS (
      SELECT k.* FROM public.client_blocks k
       WHERE p_review IS NULL OR p_review = '' OR p_review = 'all' OR k.review = p_review
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM m),
      'counts', jsonb_build_object(
        'pending', (SELECT count(*) FROM public.client_blocks WHERE review = 'pending'),
        'kept', (SELECT count(*) FROM public.client_blocks WHERE review = 'kept'),
        'lifted', (SELECT count(*) FROM public.client_blocks WHERE review = 'lifted')),
      'rows', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', x.id, 'business_id', x.business_id, 'business_name', b.business_name, 'slug', b.slug,
                 'name', x.client_name, 'email', x.email, 'phone', x.phone_digits, 'has_account', x.client_id IS NOT NULL,
                 'reason', x.reason, 'note', x.note, 'status', x.status, 'review', x.review, 'review_note', x.review_note,
                 'reviewed_at', x.reviewed_at, 'created_at', x.created_at, 'ticket_id', x.ticket_id,
                 'flag', public.block_flag(x.business_id),
                 'client', jsonb_build_object(
                   'bookings', (SELECT count(*) FROM public.appointments a WHERE a.business_id = x.business_id
                                  AND ((x.client_id IS NOT NULL AND a.client_id = x.client_id) OR (x.email IS NOT NULL AND lower(a.client_email) = x.email) OR (x.phone_digits IS NOT NULL AND public.block_phone(a.client_phone) = x.phone_digits))),
                   'no_shows', (SELECT count(*) FROM public.appointments a WHERE a.business_id = x.business_id AND a.status = 'no_show'
                                  AND ((x.client_id IS NOT NULL AND a.client_id = x.client_id) OR (x.email IS NOT NULL AND lower(a.client_email) = x.email) OR (x.phone_digits IS NOT NULL AND public.block_phone(a.client_phone) = x.phone_digits))),
                   'late_cancels', (SELECT count(*) FROM public.appointments a JOIN public.payment_refunds f ON f.appointment_id = a.id AND f.reason = 'client_late_cancel'
                                     WHERE a.business_id = x.business_id
                                       AND ((x.client_id IS NOT NULL AND a.client_id = x.client_id) OR (x.email IS NOT NULL AND lower(a.client_email) = x.email) OR (x.phone_digits IS NOT NULL AND public.block_phone(a.client_phone) = x.phone_digits))),
                   'cancelled', (SELECT count(*) FROM public.appointments a WHERE a.business_id = x.business_id AND a.status = 'cancelled' AND a.cancelled_by = 'client'
                                  AND ((x.client_id IS NOT NULL AND a.client_id = x.client_id) OR (x.email IS NOT NULL AND lower(a.client_email) = x.email) OR (x.phone_digits IS NOT NULL AND public.block_phone(a.client_phone) = x.phone_digits))),
                   'blocked_elsewhere', (SELECT count(DISTINCT o.business_id) FROM public.client_blocks o WHERE o.business_id <> x.business_id AND o.status = 'active'
                                          AND ((x.client_id IS NOT NULL AND o.client_id = x.client_id) OR (x.email IS NOT NULL AND o.email = x.email) OR (x.phone_digits IS NOT NULL AND o.phone_digits = x.phone_digits))))
               ) ORDER BY x.created_at)
          FROM (SELECT * FROM m ORDER BY m.created_at LIMIT greatest(1, least(coalesce(p_limit, 50), 200)) OFFSET greatest(coalesce(p_offset, 0), 0)) x
          JOIN public.businesses b ON b.id = x.business_id
      ), '[]'::jsonb)
    )
  );
END;
$$;

-- Keep or lift, with a note the business reads. The owner is told either way.
CREATE OR REPLACE FUNCTION public.admin_review_block(p_block uuid, p_decision text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  k public.client_blocks;
  b public.businesses;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_payload jsonb;
  v_owner uuid;
  v_email text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('kept', 'lifted') THEN
    RAISE EXCEPTION 'Keep or lift' USING ERRCODE = '22023';
  END IF;
  IF p_decision = 'lifted' AND (v_note IS NULL OR length(v_note) < 10) THEN
    RAISE EXCEPTION 'Say why it is lifted; the owner reads it' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO k FROM public.client_blocks WHERE id = p_block FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Block not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id = k.business_id;

  UPDATE public.client_blocks
     SET review = p_decision, review_note = left(v_note, 1000), reviewed_by = auth.uid(), reviewed_at = now(),
         status = CASE WHEN p_decision = 'lifted' THEN 'lifted' ELSE status END,
         lifted_at = CASE WHEN p_decision = 'lifted' AND status = 'active' THEN now() ELSE lifted_at END,
         lifted_by = CASE WHEN p_decision = 'lifted' AND status = 'active' THEN 'locappoint' ELSE lifted_by END
   WHERE id = k.id;

  -- What the owner reads in the bell and by email.
  v_owner := b.user_id;
  SELECT u.email INTO v_email FROM public.users u WHERE u.id = v_owner;
  v_payload := jsonb_build_object('audience', 'business', 'decision', p_decision, 'client_name', k.client_name,
                                  'reason', k.reason, 'note', v_note, 'business_name', b.business_name, 'block_id', k.id);
  BEGIN
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, payload, dedupe_key)
      VALUES (v_owner, 'business', 'block_review', b.id, v_payload, 'block:inbox:' || k.id || ':' || p_decision)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF v_email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, payload, dedupe_key)
      VALUES ('block_review', v_owner, v_email, b.id, v_payload, 'block:email:' || k.id || ':' || p_decision)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'block review notice for % not sent: %', k.id, SQLERRM;
  END;

  RETURN public.admin_blocks('pending', 50, 0);
END;
$$;

-- 6. The flag also shows next to the business in every support ticket.
CREATE OR REPLACE FUNCTION public.admin_business_blocks(p_business uuid)
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
  RETURN public.block_flag(p_business);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.block_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.client_is_blocked(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.appointments_block_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_flag(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_client(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unblock_client(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_blocks(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.booking_block(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_blocks(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_block(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_business_blocks(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_client(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_blocks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_block(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_blocks(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_block(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_business_blocks(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
