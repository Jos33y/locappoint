-- Payout account checks by Support (Lagos). Payouts go only to an account in the owner's or the
-- business's name (payouts function, nameMatches). A genuine account under another registered name
-- can be sent to Support: a person checks it and approves that one account (bank, last four digits and
-- the name the bank gave). The owner then saves it again and it goes through. The full account number
-- is never stored, here or in the ticket.
-- Run once in the Supabase SQL editor. Safe to run again.

BEGIN;

CREATE TABLE IF NOT EXISTS public.payout_name_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  account_name text NOT NULL CHECK (char_length(account_name) BETWEEN 1 AND 200),
  bank_code text NOT NULL CHECK (bank_code ~ '^[0-9A-Za-z]{2,12}$'),
  bank_name text CHECK (bank_name IS NULL OR char_length(bank_name) <= 100),
  account_last4 text NOT NULL CHECK (account_last4 ~ '^[0-9]{4}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  decided_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payout_name_reviews_business ON public.payout_name_reviews (business_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS payout_name_reviews_ticket ON public.payout_name_reviews (ticket_id);

-- Only the payouts function (service role) and the functions below touch it.
ALTER TABLE public.payout_name_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payout_name_reviews FROM PUBLIC, anon, authenticated;

-- Support's log learns the new action.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.support_actions'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%''refund''%'
  LOOP
    EXECUTE format('ALTER TABLE public.support_actions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.support_actions ADD CONSTRAINT support_actions_action CHECK (action IN (
  'refund', 'no_show', 'attended', 'warn', 'suspend', 'unsuspend', 'ask_other', 'status', 'priority', 'outcome', 'payout_name'));

-- The owner asks: a Support request about money (priority 1) and the account waiting for a decision.
-- The same account asked about again while it waits returns the same request.
CREATE OR REPLACE FUNCTION public.payout_review_open(
  p_business uuid, p_user uuid, p_account_name text, p_bank_code text, p_bank_name text, p_last4 text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  r public.payout_name_reviews;
  t public.support_tickets;
  v_owner text;
  v_name text := upper(trim(coalesce(p_account_name, '')));
  v_msg text;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = p_business AND user_id = p_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the owner can ask about payouts' USING ERRCODE = '42501';
  END IF;
  IF v_name = '' OR p_bank_code !~ '^[0-9A-Za-z]{2,12}$' OR p_last4 !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Pick your bank and type your account number' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO r FROM public.payout_name_reviews x
   WHERE x.business_id = b.id AND x.status = 'pending' AND x.bank_code = p_bank_code AND x.account_last4 = p_last4 AND x.account_name = v_name
   ORDER BY x.created_at DESC LIMIT 1;
  IF FOUND THEN
    SELECT * INTO t FROM public.support_tickets WHERE id = r.ticket_id;
    RETURN jsonb_build_object('number', t.number, 'again', true);
  END IF;

  IF NOT public.rate_ok('payout_review:' || b.id, 3, 86400) THEN
    RAISE EXCEPTION 'You have asked about three accounts today. Support replies on the ones you sent.' USING ERRCODE = '54000';
  END IF;

  SELECT u.full_name INTO v_owner FROM public.users u WHERE u.id = p_user;
  v_msg := format(
    'Please check my payout account. The bank says it is in the name of %s (%s, ending %s). My name on Locappoint is %s and my business is %s.',
    v_name, coalesce(nullif(trim(p_bank_name), ''), 'bank ' || p_bank_code), p_last4, coalesce(nullif(trim(v_owner), ''), 'not given'), b.business_name);

  INSERT INTO public.support_tickets (user_id, business_id, side, category, subject, message, status, priority, last_message_at, last_from)
  VALUES (p_user, b.id, 'business', 'payment', 'Payout account check', v_msg, 'open', public.support_priority('payment'), now(), 'user')
  RETURNING * INTO t;
  INSERT INTO public.support_messages (ticket_id, author_id, role, body) VALUES (t.id, p_user, 'user', v_msg);
  INSERT INTO public.payout_name_reviews (business_id, ticket_id, account_name, bank_code, bank_name, account_last4)
  VALUES (b.id, t.id, v_name, p_bank_code, nullif(trim(p_bank_name), ''), p_last4);
  PERFORM public.support_team_notice(t.id, 'new', v_msg, t.id::text);
  RETURN jsonb_build_object('number', t.number, 'again', false);
END;
$$;

-- On save: was this exact account (bank, last four, the bank's name for it) approved for this business?
CREATE OR REPLACE FUNCTION public.payout_review_ok(p_business uuid, p_account_name text, p_bank_code text, p_last4 text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payout_name_reviews x
     WHERE x.business_id = p_business AND x.status = 'approved' AND x.bank_code = p_bank_code
       AND x.account_last4 = p_last4 AND x.account_name = upper(trim(coalesce(p_account_name, ''))));
$$;

-- Support's view of the account on a ticket, beside the owner's and business's names.
CREATE OR REPLACE FUNCTION public.admin_payout_review(p_ticket uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.payout_name_reviews;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.payout_name_reviews WHERE ticket_id = p_ticket ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT jsonb_build_object(
      'account_name', r.account_name, 'bank_name', r.bank_name, 'account_last4', r.account_last4, 'status', r.status,
      'decided_at', r.decided_at, 'decided_by', (SELECT coalesce(u.full_name, u.email) FROM public.users u WHERE u.id = r.decided_by),
      'owner_name', (SELECT u.full_name FROM public.users u WHERE u.id = b.user_id), 'business_name', b.business_name)
      FROM public.businesses b WHERE b.id = r.business_id);
END;
$$;

-- Approve or decline. The owner is told on the ticket (email, bell, push) and the decision is logged.
CREATE OR REPLACE FUNCTION public.admin_payout_decide(p_ticket uuid, p_approve boolean, p_detail text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.payout_name_reviews;
  v_detail text := nullif(trim(coalesce(p_detail, '')), '');
  v_where text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.payout_name_reviews WHERE ticket_id = p_ticket AND status = 'pending' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No payout account waiting on this ticket' USING ERRCODE = '22023';
  END IF;
  UPDATE public.payout_name_reviews
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'declined' END, decided_by = auth.uid(), decided_at = now()
   WHERE id = r.id;
  v_where := format('the account in the name of %s (%s, ending %s)', r.account_name, coalesce(r.bank_name, 'your bank'), r.account_last4);
  PERFORM public.support_log(p_ticket, 'payout_name',
    left(CASE WHEN p_approve THEN 'Approved ' ELSE 'Declined ' END || v_where || coalesce('. ' || v_detail, ''), 2000),
    NULL, NULL, r.business_id);
  RETURN public.admin_reply(p_ticket,
    CASE WHEN p_approve
      THEN format('We checked %s and approved it for your payouts. Go to Payments, pick the bank and type the account number again: it goes through now.', v_where)
      ELSE format('We could not approve %s for your payouts. Payouts go to an account in your name or your business''s name.', v_where)
    END || coalesce(' ' || v_detail, ''),
    false, 'resolved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payout_review_open(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payout_review_open(uuid, uuid, text, text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.payout_review_ok(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payout_review_ok(uuid, text, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.admin_payout_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_review(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_payout_decide(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_decide(uuid, boolean, text) TO authenticated;

COMMIT;
