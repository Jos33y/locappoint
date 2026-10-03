-- Time: buffer between bookings, and a guard on blocked time (closed dates and blocks from the calendar).
-- Several breaks a day need no change here: opening hours are already any number of windows per day.
-- Every client booking and move goes through get_available_slots, so the buffer holds everywhere. Safe to run again.

BEGIN;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS buffer_minutes integer NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_buffer_minutes_check') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_buffer_minutes_check CHECK (buffer_minutes IN (0, 5, 10, 15, 20, 30));
  END IF;
END $$;


-- Blocked time must be a real span inside one business, at most two months, and says who made it.
CREATE OR REPLACE FUNCTION public.time_blocks_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'The end has to be after the start' USING ERRCODE = '22023';
  END IF;
  IF NEW.ends_at - NEW.starts_at > interval '62 days' THEN
    RAISE EXCEPTION 'Block at most two months at a time' USING ERRCODE = '22023';
  END IF;
  IF NEW.staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_members m WHERE m.id = NEW.staff_id AND m.business_id = NEW.business_id AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'That person is not on this team' USING ERRCODE = '22023';
  END IF;
  NEW.reason := nullif(left(trim(coalesce(NEW.reason, '')), 80), '');
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS time_blocks_guard ON public.time_blocks;
CREATE TRIGGER time_blocks_guard
  BEFORE INSERT OR UPDATE ON public.time_blocks
  FOR EACH ROW EXECUTE FUNCTION public.time_blocks_guard();

CREATE INDEX IF NOT EXISTS time_blocks_business_span ON public.time_blocks (business_id, starts_at, ends_at);


-- Free times. Same as before, plus the business's buffer kept clear after every booking.
CREATE OR REPLACE FUNCTION public.get_available_slots(p_business_id uuid, p_service_id uuid, p_date date, p_staff_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid)
 RETURNS TABLE(slot_time time without time zone, staff_id uuid, staff_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  WITH biz AS (
    SELECT b.id, (now() AT TIME ZONE b.timezone) AS local_now, b.buffer_minutes * interval '1 minute' AS buf
      FROM public.businesses b
     WHERE b.id = p_business_id
       AND (b.is_active = true OR public.is_business_member(b.id))
  ),
  svc AS (
    SELECT s.id, s.duration_minutes * interval '1 minute' AS dur
      FROM public.services s
     WHERE s.id = p_service_id AND s.business_id = p_business_id AND s.is_active = true
  ),
  staff AS (
    SELECT m.id, m.display_name, m.sort_order, m.created_at
      FROM public.business_members m
     WHERE m.business_id = p_business_id
       AND m.status = 'active' AND m.is_bookable = true
       AND (p_staff_id IS NULL OR m.id = p_staff_id)
       AND (NOT EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id)
            OR EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.member_id = m.id AND ss.service_id = p_service_id))
  ),
  windows AS (
    SELECT st.id AS staff_id, st.display_name, st.sort_order, st.created_at, a.start_time, a.end_time
      FROM staff st
      JOIN public.availability a
        ON a.business_id = p_business_id
       AND a.is_active = true
       AND a.day_of_week = extract(dow FROM p_date)::int
       AND (a.staff_id = st.id
            OR (a.staff_id IS NULL
                AND NOT EXISTS (SELECT 1 FROM public.availability own
                                 WHERE own.staff_id = st.id AND own.is_active = true)))
  ),
  candidates AS (
    SELECT w.staff_id, w.display_name, w.sort_order, w.created_at, g.slot_start, g.slot_start + svc.dur AS slot_end, biz.buf
      FROM windows w
     CROSS JOIN svc
     CROSS JOIN biz
     CROSS JOIN LATERAL generate_series(
       p_date + w.start_time,
       p_date + w.end_time - svc.dur,
       interval '15 minutes'
     ) AS g(slot_start)
     WHERE g.slot_start > biz.local_now
       AND g.slot_start <= biz.local_now + interval '90 days'
  ),
  free AS (
    SELECT c.*
      FROM candidates c
     WHERE NOT EXISTS (
             SELECT 1 FROM public.appointments ap
              WHERE ap.staff_id = c.staff_id
                AND ap.status IN ('pending', 'confirmed')
                AND (p_ignore_appointment IS NULL OR ap.id <> p_ignore_appointment)
                AND tsrange(ap.appointment_date + ap.appointment_time,
                            ap.appointment_date + ap.appointment_time + ap.duration_minutes * interval '1 minute' + c.buf, '[)')
                    && tsrange(c.slot_start, c.slot_end + c.buf, '[)'))
       AND NOT EXISTS (
             SELECT 1 FROM public.time_blocks tb
              WHERE tb.business_id = p_business_id
                AND (tb.staff_id = c.staff_id OR tb.staff_id IS NULL)
                AND tsrange(tb.starts_at, tb.ends_at, '[)') && tsrange(c.slot_start, c.slot_end, '[)'))
  )
  SELECT DISTINCT ON (f.slot_start, CASE WHEN p_staff_id IS NULL THEN NULL ELSE f.staff_id END)
         f.slot_start::time, f.staff_id, f.display_name
    FROM free f
   ORDER BY f.slot_start, CASE WHEN p_staff_id IS NULL THEN NULL ELSE f.staff_id END, f.sort_order, f.created_at
$function$;

REVOKE EXECUTE ON FUNCTION public.time_blocks_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, uuid, date, uuid, uuid) TO anon, authenticated;

COMMIT;
