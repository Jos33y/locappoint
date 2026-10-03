-- Money: what reminders did, for Insights. And Book again ticks the extras from the last visit.
-- The rebook change first checks that the live function is the one this was written against, and stops if not. Safe to run again.

BEGIN;

DO $$
DECLARE
  v_body text := (SELECT md5(regexp_replace(p.prosrc, '\s', '', 'g')) FROM pg_proc p
                   WHERE p.oid = 'public.rebook_target(public.appointments)'::regprocedure);
BEGIN
  IF v_body <> 'bdbbaf27116d55fef50211a12a0aeed4' AND position('addon_ids' IN (SELECT prosrc FROM pg_proc WHERE oid = 'public.rebook_target(public.appointments)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'rebook_target is not the version this change was written for. Nothing was changed; send it to the studio.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.rebook_target(a public.appointments)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'appointment_id', a.id,
    'date', a.appointment_date,
    'service', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', s.id, 'service_name', s.service_name, 'duration_minutes', s.duration_minutes,
      'price', s.price, 'active', coalesce(s.is_active, false)) END,
    'staff_id', CASE WHEN m.status = 'active' AND m.is_bookable = true
                      AND (NOT EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id)
                           OR EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = a.service_id))
                     THEN m.id END,
    'staff_name', m.display_name,
    'staff_count', (SELECT count(*) FROM public.business_members x
                     WHERE x.business_id = a.business_id AND x.status = 'active' AND x.is_bookable = true),
    -- Extras from that visit that are still offered, so Book again can tick them.
    'addon_ids', coalesce((SELECT jsonb_agg(e.id) FROM jsonb_array_elements(a.addons) x
                             JOIN public.services e ON e.id = (x->>'id')::uuid
                            WHERE e.is_active = true AND e.is_addon = true), '[]'::jsonb)
  )
    FROM (SELECT 1) one
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id;
$$;


-- For the owner: bookings in the period that have happened (or were no-shows), split by whether a reminder went out.
-- The saving is an estimate and only given when both groups are big enough to compare.
CREATE OR REPLACE FUNCTION public.reminder_effect(p_business_id uuid, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tz text;
  v_now timestamp;
  r record;
  v_rate_r numeric;
  v_rate_o numeric;
  v_saved numeric;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can see this' USING ERRCODE = '42501';
  END IF;
  SELECT b.timezone INTO v_tz FROM public.businesses b WHERE b.id = p_business_id;
  v_now := now() AT TIME ZONE v_tz;

  WITH done AS (
    SELECT a.id, a.price, a.status = 'no_show' AS no_show,
           EXISTS (SELECT 1 FROM public.notification_queue q
                    WHERE q.appointment_id = a.id AND q.kind = 'booking_reminder'
                      AND q.status = 'sent' AND q.payload->>'audience' = 'client') AS reminded
      FROM public.appointments a
     WHERE a.business_id = p_business_id
       AND a.appointment_date BETWEEN v_now::date - (greatest(p_days, 1) - 1) AND v_now::date
       AND a.appointment_date + a.appointment_time < v_now
       AND a.status IN ('completed', 'confirmed', 'no_show')
  )
  SELECT count(*) FILTER (WHERE reminded) AS reminded,
         count(*) FILTER (WHERE reminded AND NOT no_show) AS reminded_came,
         count(*) FILTER (WHERE reminded AND no_show) AS reminded_no_show,
         coalesce(sum(price) FILTER (WHERE reminded AND NOT no_show), 0) AS reminded_value,
         coalesce(avg(price) FILTER (WHERE reminded), 0) AS reminded_avg,
         count(*) FILTER (WHERE NOT reminded) AS other,
         count(*) FILTER (WHERE NOT reminded AND no_show) AS other_no_show
    INTO r FROM done;

  IF r.reminded >= 10 AND r.other >= 10 THEN
    v_rate_r := r.reminded_no_show::numeric / r.reminded;
    v_rate_o := r.other_no_show::numeric / r.other;
    v_saved := round(greatest(0, v_rate_o - v_rate_r) * r.reminded * r.reminded_avg);
  END IF;

  RETURN jsonb_build_object(
    'reminded', r.reminded, 'reminded_came', r.reminded_came, 'reminded_no_show', r.reminded_no_show,
    'reminded_value', r.reminded_value, 'other', r.other, 'other_no_show', r.other_no_show,
    'saved_estimate', v_saved);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rebook_target(public.appointments) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reminder_effect(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reminder_effect(uuid, integer) TO authenticated;

COMMIT;
