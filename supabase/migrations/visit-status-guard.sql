-- Completed and no-show only once a visit has started, and reviews only once it has ended.
-- Without this, a booking marked completed early counted as a visit and could be reviewed before it happened.
-- Needs reviews.sql first. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.review_state(public.appointments)') IS NULL THEN
    RAISE EXCEPTION 'Run reviews.sql first';
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.appointments_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('completed', 'no_show') AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.appointment_date + NEW.appointment_time
         > now() AT TIME ZONE (SELECT b.timezone FROM public.businesses b WHERE b.id = NEW.business_id) THEN
    RAISE EXCEPTION 'You can mark this once the visit has started' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.appointments_status_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS appointments_status_guard ON public.appointments;
CREATE TRIGGER appointments_status_guard
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_status_guard();


CREATE OR REPLACE FUNCTION public.review_state(a public.appointments)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH ctx AS (
    SELECT now() AT TIME ZONE b.timezone AS local_now, b.is_active
      FROM public.businesses b WHERE b.id = a.business_id
  ),
  visit AS (
    SELECT a.status IN ('completed', 'confirmed')
           AND a.appointment_date + a.appointment_time + a.duration_minutes * interval '1 minute' <= ctx.local_now
           AND a.appointment_date >= (ctx.local_now)::date - 60
           AND ctx.is_active AS open
      FROM ctx
  )
  SELECT jsonb_build_object(
    'can_review', v.open AND r.id IS NULL,
    'can_edit', v.open AND r.id IS NOT NULL AND r.reply IS NULL AND r.created_at > now() - interval '7 days',
    'review', CASE WHEN r.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', r.id, 'rating', r.rating, 'body', r.body, 'reply', r.reply, 'replied_at', r.replied_at,
      'created_at', r.created_at, 'hidden', r.status = 'hidden') END
  )
    FROM visit v
    LEFT JOIN public.reviews r ON r.appointment_id = a.id;
$$;

REVOKE EXECUTE ON FUNCTION public.review_state(public.appointments) FROM PUBLIC, anon, authenticated;

COMMIT;
