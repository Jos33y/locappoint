-- One-tap rebooking: visit rhythm, "book again" data for clients and manage links,
-- the follow-up email the morning after a visit, and a way to stop those emails.
-- Needs booking-notifications.sql and guest-booking.sql first. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.booking_links') IS NULL OR to_regclass('public.inbox') IS NULL THEN
    RAISE EXCEPTION 'Run guest-booking.sql and booking-notifications.sql first';
  END IF;
END;
$$;


-- Clients cancel through cancel_my_booking, which enforces the cut-off. This policy skipped it.
DROP POLICY IF EXISTS appointments_client_cancel ON public.appointments;


CREATE TABLE IF NOT EXISTS public.email_optouts (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_optouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_optouts FROM anon, authenticated;


-- Whether a past booking can be booked again as it was: service still offered, person still bookable for it.
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
                     WHERE x.business_id = a.business_id AND x.status = 'active' AND x.is_bookable = true)
  )
    FROM (SELECT 1) one
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id;
$$;


-- A visit is a completed booking, or a confirmed one that has ended (the rule Insights uses for money earned).
-- Clients are matched by account or email only: a phone number is not verified, so it could expose someone else's visits.
CREATE OR REPLACE FUNCTION public.rebook_rhythm(p_business_id uuid, p_client_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamp;
  v_today date;
  v_email text := lower(nullif(trim(p_email), ''));
  v_last public.appointments;
  v_days date[];
  v_gap integer;
  v_due date;
  v_next jsonb;
  v_visits integer;
BEGIN
  SELECT now() AT TIME ZONE b.timezone INTO v_now FROM public.businesses b WHERE b.id = p_business_id;
  IF v_now IS NULL OR (p_client_id IS NULL AND v_email IS NULL) THEN
    RETURN NULL;
  END IF;
  v_today := v_now::date;

  SELECT count(*), array_agg(DISTINCT a.appointment_date ORDER BY a.appointment_date)
    INTO v_visits, v_days
    FROM public.appointments a
   WHERE a.business_id = p_business_id
     AND ((p_client_id IS NOT NULL AND a.client_id = p_client_id) OR (v_email IS NOT NULL AND lower(a.client_email) = v_email))
     AND (a.status = 'completed'
          OR (a.status = 'confirmed' AND a.appointment_date + a.appointment_time + a.duration_minutes * interval '1 minute' <= v_now));

  SELECT a.* INTO v_last
    FROM public.appointments a
   WHERE a.business_id = p_business_id
     AND ((p_client_id IS NOT NULL AND a.client_id = p_client_id) OR (v_email IS NOT NULL AND lower(a.client_email) = v_email))
     AND (a.status = 'completed'
          OR (a.status = 'confirmed' AND a.appointment_date + a.appointment_time + a.duration_minutes * interval '1 minute' <= v_now))
   ORDER BY a.appointment_date DESC, a.appointment_time DESC
   LIMIT 1;

  SELECT jsonb_build_object('date', a.appointment_date, 'time', to_char(a.appointment_time, 'HH24:MI'), 'status', a.status)
    INTO v_next
    FROM public.appointments a
   WHERE a.business_id = p_business_id
     AND ((p_client_id IS NOT NULL AND a.client_id = p_client_id) OR (v_email IS NOT NULL AND lower(a.client_email) = v_email))
     AND a.status IN ('pending', 'confirmed') AND a.appointment_date + a.appointment_time > v_now
   ORDER BY a.appointment_date, a.appointment_time
   LIMIT 1;

  IF v_last.id IS NULL THEN
    RETURN jsonb_build_object('visits', 0, 'upcoming', v_next);
  END IF;

  IF cardinality(v_days) >= 2 THEN
    SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY g))::int INTO v_gap
      FROM (SELECT v_days[i] - v_days[i - 1] AS g FROM generate_subscripts(v_days, 1) i WHERE i > 1) gaps;
    v_due := v_days[cardinality(v_days)] + v_gap;
  END IF;

  RETURN jsonb_build_object(
    'visits', v_visits,
    'last_date', v_days[cardinality(v_days)],
    'recent', to_jsonb(v_days[greatest(1, cardinality(v_days) - 5):cardinality(v_days)]),
    'gap_days', v_gap,
    'due_date', v_due,
    'suggested_date', CASE WHEN v_due IS NULL THEN NULL ELSE least(greatest(v_due, v_today), v_today + 89) END,
    'today', v_today,
    'upcoming', v_next,
    'last', public.rebook_target(v_last)
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.rebook_business(b public.businesses)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', b.id, 'business_name', b.business_name, 'slug', b.slug, 'address', b.address, 'city', b.city,
    'country', b.country, 'phone', b.phone, 'whatsapp', b.whatsapp, 'timezone', b.timezone,
    'banner_url', b.banner_url, 'logo_url', b.logo_url, 'category', b.category, 'category_detail', b.category_detail,
    'auto_confirm', b.auto_confirm, 'cancel_cutoff_minutes', b.cancel_cutoff_minutes);
$$;


-- Every place the signed-in client has visited, soonest due first.
CREATE OR REPLACE FUNCTION public.my_rebook()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_out jsonb := '[]'::jsonb;
  r public.businesses;
  v_rhythm jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN v_out;
  END IF;
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid AND u.email_confirmed_at IS NOT NULL;

  FOR r IN
    SELECT b.* FROM public.businesses b
     WHERE b.is_active = true
       AND EXISTS (SELECT 1 FROM public.appointments a
                    WHERE a.business_id = b.id
                      AND (a.client_id = v_uid OR (v_email IS NOT NULL AND lower(a.client_email) = v_email)))
  LOOP
    v_rhythm := public.rebook_rhythm(r.id, v_uid, v_email);
    IF coalesce((v_rhythm->>'visits')::int, 0) > 0 THEN
      v_out := v_out || jsonb_build_array(jsonb_build_object('business', public.rebook_business(r), 'rhythm', v_rhythm));
    END IF;
  END LOOP;

  RETURN coalesce((
    SELECT jsonb_agg(x ORDER BY (x->'rhythm'->'upcoming') IS NOT NULL,
                                coalesce((x->'rhythm'->>'due_date')::date, (x->'rhythm'->>'last_date')::date + 3650),
                                (x->'rhythm'->>'last_date')::date DESC)
      FROM jsonb_array_elements(v_out) x), '[]'::jsonb);
END;
$$;


-- The manage link's "Book again": this booking as the starting point, the client's rhythm, and their details.
CREATE OR REPLACE FUNCTION public.rebook_by_link(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'business', public.rebook_business(b),
    'booking', public.rebook_target(a),
    'rhythm', public.rebook_rhythm(a.business_id, a.client_id, a.client_email),
    'client', jsonb_build_object('name', a.client_name, 'email', a.client_email, 'phone', a.client_phone),
    'emails_stopped', EXISTS (SELECT 1 FROM public.email_optouts o WHERE o.email = lower(a.client_email))
  )
    FROM public.booking_links l
    JOIN public.appointments a ON a.id = l.appointment_id
    JOIN public.businesses b ON b.id = a.business_id
   WHERE l.token = p_token AND length(p_token) >= 32 AND b.is_active = true;
$$;


CREATE OR REPLACE FUNCTION public.stop_emails_by_link(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(a.client_email) INTO v_email
    FROM public.booking_links l JOIN public.appointments a ON a.id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'This link does not open a booking' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.email_optouts (email) VALUES (v_email) ON CONFLICT (email) DO NOTHING;
  RETURN true;
END;
$$;


-- The morning after a visit, 10:00 business time, with a two-day window so a late run still sends
-- and old visits never do. Checked at send time, which gives the owner a day to mark a no-show.
CREATE OR REPLACE FUNCTION public.queue_visit_followups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_now timestamp;
  v_rhythm jsonb;
  v_payload jsonb;
  v_account boolean;
  v_email_ok boolean;
BEGIN
  FOR a IN
    SELECT ap.*
      FROM public.appointments ap
      JOIN public.businesses b ON b.id = ap.business_id
     WHERE ap.status IN ('confirmed', 'completed')
       AND b.is_active = true
       AND ap.appointment_date BETWEEN current_date - 4 AND current_date
       AND now() AT TIME ZONE b.timezone >= ap.appointment_date + 1 + time '10:00'
       AND now() AT TIME ZONE b.timezone < ap.appointment_date + 3 + time '10:00'
       AND (ap.client_id IS NOT NULL OR (ap.source = 'web' AND ap.client_email IS NOT NULL))
  LOOP
    BEGIN
      SELECT now() AT TIME ZONE b.timezone INTO v_now FROM public.businesses b WHERE b.id = a.business_id;

      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.appointments x
         WHERE x.business_id = a.business_id
           AND x.status IN ('pending', 'confirmed')
           AND x.appointment_date + x.appointment_time > v_now
           AND ((a.client_id IS NOT NULL AND x.client_id = a.client_id)
                OR (a.client_email IS NOT NULL AND lower(x.client_email) = lower(a.client_email))));

      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.notification_queue q
         WHERE q.kind = 'visit_followup' AND q.business_id = a.business_id
           AND q.appointment_id IS DISTINCT FROM a.id
           AND q.created_at > now() - interval '7 days'
           AND (lower(q.recipient_email) = lower(a.client_email) OR (a.client_id IS NOT NULL AND q.recipient_user = a.client_id)))
        OR EXISTS (
        SELECT 1 FROM public.inbox i
         WHERE i.kind = 'visit_followup' AND i.business_id = a.business_id
           AND i.appointment_id IS DISTINCT FROM a.id
           AND i.created_at > now() - interval '7 days'
           AND a.client_id IS NOT NULL AND i.user_id = a.client_id);

      v_rhythm := public.rebook_rhythm(a.business_id, a.client_id, a.client_email);
      v_payload := public.booking_notice_payload(a) || jsonb_build_object(
        'suggested_date', v_rhythm->'suggested_date',
        'gap_days', v_rhythm->'gap_days',
        'visits', v_rhythm->'visits');

      v_account := a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id);
      IF v_account THEN
        INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
        VALUES (a.client_id, 'client', 'visit_followup', a.business_id, a.id, v_payload,
                'visit_followup:client:' || a.client_id || ':' || a.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;

      v_email_ok := a.client_email IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.email_optouts o WHERE o.email = lower(a.client_email))
        AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id AND u.email_notifications = false);
      IF v_email_ok THEN
        INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
        VALUES ('visit_followup', CASE WHEN v_account THEN a.client_id END, a.client_email, a.business_id, a.id,
                v_payload || jsonb_build_object('audience', 'client'),
                'visit_followup:client:email:' || lower(a.client_email) || ':' || a.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END;
$$;


REVOKE EXECUTE ON FUNCTION public.rebook_target(public.appointments) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rebook_rhythm(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rebook_business(public.businesses) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_visit_followups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_rebook() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_rebook() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rebook_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebook_by_link(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stop_emails_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stop_emails_by_link(text) TO anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'visit-followups';
SELECT cron.schedule('visit-followups', '*/15 * * * *', 'SELECT public.queue_visit_followups()');

COMMIT;
