-- Receipts. Proof of payment, never a tax invoice ("Comprovativo", not "Fatura"):
-- - payment: the moment a booking is paid online (price, service fee, total, how it was paid);
-- - refund: when a refund has actually been sent;
-- - visit: when the business marks a pay-at-the-visit booking or walk-in completed, if it has a price.
-- Each business numbers its own receipts (FEM-00001). A receipt is a snapshot: later changes to the
-- business or the booking never rewrite it. Issued only by these database functions. The client gets
-- it by email (when the booking may be emailed) and at /r/<token>; the business sees it on the booking.
-- Needs pay-at-booking.sql. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.payments') IS NULL OR to_regclass('public.payment_refunds') IS NULL THEN
    RAISE EXCEPTION 'Run pay-at-booking.sql first';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  refund_id uuid UNIQUE REFERENCES public.payment_refunds(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('payment', 'refund', 'visit')),
  seq integer NOT NULL CHECK (seq > 0),
  number text NOT NULL CHECK (char_length(number) BETWEEN 5 AND 20),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  client_name text,
  client_email text,
  business jsonb NOT NULL,
  booking jsonb NOT NULL,
  lines jsonb NOT NULL,
  total numeric NOT NULL,
  currency text NOT NULL CHECK (currency IN ('EUR', 'NGN')),
  method text NOT NULL CHECK (method IN ('card', 'transfer', 'at_visit')),
  refund_of text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, seq)
);

CREATE UNIQUE INDEX IF NOT EXISTS receipts_one_per_booking ON public.receipts (appointment_id, kind) WHERE kind IN ('payment', 'visit');
CREATE INDEX IF NOT EXISTS receipts_appointment ON public.receipts (appointment_id);
CREATE INDEX IF NOT EXISTS receipts_business ON public.receipts (business_id, issued_at DESC);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.receipts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.receipts FROM authenticated;
GRANT SELECT ON public.receipts TO authenticated;

DROP POLICY IF EXISTS receipts_owner_read ON public.receipts;
CREATE POLICY receipts_owner_read ON public.receipts FOR SELECT USING (public.is_business_owner(business_id));

DROP POLICY IF EXISTS receipts_client_read ON public.receipts;
CREATE POLICY receipts_client_read ON public.receipts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.client_id = auth.uid()));

-- One receipt, numbered, stored and (when allowed) emailed. Returns its id, or null when there is
-- nothing to issue. Never raises: a receipt problem must not stop a payment, refund or completion.
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
          ELSE 'Paid after the time was released, full refund' END,
        'amount', f.amount));
    ELSE
      IF coalesce(a.price, 0) <= 0 OR a.payment_status <> 'at_visit' THEN RETURN NULL; END IF;
      v_total := a.price;
      v_method := 'at_visit';
      v_lines := jsonb_build_array(jsonb_build_object('label', coalesce(v_service, 'Visit'), 'amount', a.price));
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

REVOKE EXECUTE ON FUNCTION public.issue_receipt(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- Paid online, or a pay-at-the-visit booking marked completed.
CREATE OR REPLACE FUNCTION public.appointments_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.payment_status = 'awaiting' AND NEW.payment_status = 'paid' THEN
    PERFORM public.issue_receipt(NEW.id, 'payment');
  END IF;
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.payment_status = 'at_visit' THEN
    PERFORM public.issue_receipt(NEW.id, 'visit');
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointments_receipt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS appointments_receipt ON public.appointments;
CREATE TRIGGER appointments_receipt
  AFTER UPDATE OF status, payment_status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_receipt();

-- A refund the provider has confirmed sending.
CREATE OR REPLACE FUNCTION public.payment_refunds_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
    PERFORM public.issue_receipt(NULL, 'refund', NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_refunds_receipt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS payment_refunds_receipt ON public.payment_refunds;
CREATE TRIGGER payment_refunds_receipt
  AFTER UPDATE OF status ON public.payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.payment_refunds_receipt();

-- The public receipt page. The token is the key; nothing else about the client is shown.
CREATE OR REPLACE FUNCTION public.receipt_by_token(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'kind', r.kind, 'number', r.number, 'client_name', r.client_name, 'business', r.business, 'booking', r.booking,
    'lines', r.lines, 'total', r.total, 'currency', r.currency, 'method', r.method, 'refund_of', r.refund_of,
    'issued_at', r.issued_at,
    'manage_token', (SELECT l.token FROM public.booking_links l WHERE l.appointment_id = r.appointment_id))
    FROM public.receipts r
   WHERE r.token = p_token AND length(p_token) = 32;
$$;

REVOKE EXECUTE ON FUNCTION public.receipt_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receipt_by_token(text) TO anon, authenticated;

-- The manage page lists the booking's receipts.
CREATE OR REPLACE FUNCTION public.receipts_by_link(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('kind', r.kind, 'number', r.number, 'token', r.token, 'total', r.total,
                                               'currency', r.currency, 'issued_at', r.issued_at) ORDER BY r.seq), '[]'::jsonb)
    FROM public.booking_links l
    JOIN public.receipts r ON r.appointment_id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32;
$$;

REVOKE EXECUTE ON FUNCTION public.receipts_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receipts_by_link(text) TO anon, authenticated;

-- Bookings already paid before receipts existed get theirs now (not emailed: they were told at payment).
DO $$
DECLARE
  x record;
BEGIN
  PERFORM set_config('locappoint.receipts_quiet', 'on', true);
  FOR x IN
    SELECT a.id FROM public.appointments a
     WHERE a.payment_status IN ('paid', 'refunded', 'partly_refunded')
       AND NOT EXISTS (SELECT 1 FROM public.receipts r WHERE r.appointment_id = a.id AND r.kind = 'payment')
  LOOP
    PERFORM public.issue_receipt(x.id, 'payment');
  END LOOP;
  FOR x IN
    SELECT f.id FROM public.payment_refunds f
     WHERE f.status = 'sent' AND NOT EXISTS (SELECT 1 FROM public.receipts r WHERE r.refund_id = f.id)
  LOOP
    PERFORM public.issue_receipt(NULL, 'refund', x.id);
  END LOOP;
  PERFORM set_config('locappoint.receipts_quiet', 'off', true);
END;
$$;

COMMIT;
