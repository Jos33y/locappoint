-- Client payments, seen from both sides. For bookings paid online: what has been refunded and the
-- cancellation rule that applies, so the client's bookings, the cancel sheet and the business's
-- booking sheet can say what a cancel or no-show gives back before anyone presses the button.
-- The amounts still come only from appointments_refund when the status actually changes.
-- Read-only. Needs pay-at-booking.sql. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.payment_refunds') IS NULL OR to_regprocedure('public.booking_by_link(text)') IS NULL THEN
    RAISE EXCEPTION 'Run pay-at-booking.sql first';
  END IF;
END;
$$;

-- One row per paid booking the caller may see: the client who made it, the owner, or the team
-- member it is with. The same people the appointments policies let read the booking itself.
CREATE OR REPLACE FUNCTION public.booking_money(p_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'refund', (SELECT sum(f.amount) FROM public.payment_refunds f WHERE f.appointment_id = a.id AND f.status <> 'failed'),
    'policy', jsonb_build_object(
      'free_hours', r.free_cancel_hours,
      'keep_pct', r.late_cancel_fee_max_pct,
      'no_show_keep_pct', r.no_show_fee_pct)
  )), '[]'::jsonb)
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.market_rules r ON r.market = b.market
   WHERE auth.uid() IS NOT NULL
     AND a.id = ANY (p_ids[1:200])
     AND a.payment_status IN ('paid', 'refunded', 'partly_refunded')
     AND (a.client_id = auth.uid()
          OR public.is_business_owner(a.business_id)
          OR a.staff_id = public.my_member_id(a.business_id));
$$;

REVOKE EXECUTE ON FUNCTION public.booking_money(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_money(uuid[]) TO authenticated;

COMMIT;
