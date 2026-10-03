-- Reviews from people who actually booked: one per visit, left by link or signed in, answered by the owner.
-- Needs rebooking.sql first. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.queue_visit_followups()') IS NULL THEN
    RAISE EXCEPTION 'Run rebooking.sql first';
  END IF;
END;
$$;


CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (body IS NULL OR length(body) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  reply text CHECK (reply IS NULL OR length(reply) BETWEEN 1 AND 500),
  replied_at timestamptz,
  reported_at timestamptz,
  report_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_business_feed ON public.reviews (business_id, created_at DESC) WHERE status = 'published';

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO authenticated;

-- A client reads the reviews on their own bookings, including ones left as a guest before the booking joined the account.
DROP POLICY IF EXISTS reviews_client_read ON public.reviews;
CREATE POLICY reviews_client_read ON public.reviews
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.client_id = auth.uid()));

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- "Ana G.": the public never sees a full name.
CREATE OR REPLACE FUNCTION public.review_author(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
           WHEN coalesce(trim(p_name), '') = '' THEN 'A client'
           WHEN cardinality(w) = 1 THEN upper(left(w[1], 1)) || substr(w[1], 2)
           ELSE upper(left(w[1], 1)) || substr(w[1], 2) || ' ' || upper(left(w[cardinality(w)], 1)) || '.'
         END
    FROM (SELECT regexp_split_to_array(trim(coalesce(p_name, '')), '\s+') AS w) x;
$$;


-- Where a booking stands for reviewing: whether the visit counts, and whether a review can still be left or changed.
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
    SELECT (a.status = 'completed'
            OR (a.status = 'confirmed' AND a.appointment_date + a.appointment_time + a.duration_minutes * interval '1 minute' <= ctx.local_now))
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


CREATE OR REPLACE FUNCTION public.save_review(a public.appointments, p_rating integer, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_state jsonb := public.review_state(a);
  v_body text := nullif(left(trim(coalesce(p_body, '')), 500), '');
BEGIN
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Pick from one to five stars' USING ERRCODE = '22023';
  END IF;
  IF (v_state->>'can_review')::boolean THEN
    INSERT INTO public.reviews (appointment_id, business_id, rating, body)
    VALUES (a.id, a.business_id, p_rating, v_body);
  ELSIF (v_state->>'can_edit')::boolean THEN
    UPDATE public.reviews SET rating = p_rating, body = v_body WHERE appointment_id = a.id;
  ELSIF v_state->'review' IS NOT NULL AND v_state->'review' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'This review can no longer be changed' USING ERRCODE = '22023';
  ELSE
    RAISE EXCEPTION 'Reviews open once the visit has happened, for 60 days' USING ERRCODE = '22023';
  END IF;
  RETURN public.review_state(a);
END;
$$;


CREATE OR REPLACE FUNCTION public.review_by_link(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.review_state(a)
    FROM public.booking_links l JOIN public.appointments a ON a.id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32;
$$;

CREATE OR REPLACE FUNCTION public.submit_review_by_link(p_token text, p_rating integer, p_body text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
BEGIN
  SELECT ap.* INTO a
    FROM public.booking_links l JOIN public.appointments ap ON ap.id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32
   FOR UPDATE OF ap;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This link does not open a booking' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.save_review(a, p_rating, p_body);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_my_review(p_appointment_id uuid, p_rating integer, p_body text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR a.client_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'We could not find this booking' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.save_review(a, p_rating, p_body);
END;
$$;


-- The public page: summary and a page of reviews, newest first. Hidden reviews are left out of both.
CREATE OR REPLACE FUNCTION public.public_reviews(p_business_id uuid, p_limit integer DEFAULT 5, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH biz AS (
    SELECT b.id, b.business_name FROM public.businesses b WHERE b.id = p_business_id AND b.is_active = true
  ),
  pub AS (
    SELECT r.*, a.client_name, a.appointment_date, s.service_name
      FROM public.reviews r
      JOIN biz ON biz.id = r.business_id
      JOIN public.appointments a ON a.id = r.appointment_id
      LEFT JOIN public.services s ON s.id = a.service_id
     WHERE r.status = 'published'
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM pub),
    'average', (SELECT round(avg(rating)::numeric, 1) FROM pub),
    'stars', (SELECT jsonb_agg((SELECT count(*) FROM pub WHERE rating = n) ORDER BY n DESC) FROM generate_series(1, 5) n),
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.id, 'rating', p.rating, 'body', p.body, 'author', public.review_author(p.client_name),
               'service', p.service_name, 'visit_month', to_char(p.appointment_date, 'FMMonth YYYY'),
               'created_at', p.created_at, 'reply', p.reply, 'replied_at', p.replied_at)
             ORDER BY p.created_at DESC)
        FROM (SELECT * FROM pub ORDER BY created_at DESC LIMIT least(greatest(p_limit, 1), 20) OFFSET greatest(p_offset, 0)) p), '[]'::jsonb)
  )
  WHERE EXISTS (SELECT 1 FROM biz);
$$;

CREATE OR REPLACE FUNCTION public.business_ratings()
RETURNS TABLE (business_id uuid, average numeric, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.business_id, round(avg(r.rating)::numeric, 1), count(*)
    FROM public.reviews r JOIN public.businesses b ON b.id = r.business_id
   WHERE r.status = 'published' AND b.is_active = true
   GROUP BY r.business_id;
$$;


-- The owner's inbox of reviews: full client name and visit date, hidden ones included.
CREATE OR REPLACE FUNCTION public.owner_reviews(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can see reviews' USING ERRCODE = '42501';
  END IF;
  RETURN (
    WITH mine AS (
      SELECT r.*, a.client_name, a.appointment_date, a.appointment_time, s.service_name, m.display_name AS staff_name
        FROM public.reviews r
        JOIN public.appointments a ON a.id = r.appointment_id
        LEFT JOIN public.services s ON s.id = a.service_id
        LEFT JOIN public.business_members m ON m.id = a.staff_id
       WHERE r.business_id = p_business_id
    )
    SELECT jsonb_build_object(
      'count', (SELECT count(*) FROM mine WHERE status = 'published'),
      'average', (SELECT round(avg(rating)::numeric, 1) FROM mine WHERE status = 'published'),
      'stars', (SELECT jsonb_agg((SELECT count(*) FROM mine WHERE status = 'published' AND rating = n) ORDER BY n DESC) FROM generate_series(1, 5) n),
      'waiting', (SELECT count(*) FROM mine WHERE reply IS NULL AND status = 'published'),
      'items', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', x.id, 'appointment_id', x.appointment_id, 'rating', x.rating, 'body', x.body,
                 'client_name', x.client_name, 'author', public.review_author(x.client_name),
                 'service', x.service_name, 'staff_name', x.staff_name,
                 'date', x.appointment_date, 'time', to_char(x.appointment_time, 'HH24:MI'),
                 'created_at', x.created_at, 'reply', x.reply, 'replied_at', x.replied_at,
                 'hidden', x.status = 'hidden', 'reported', x.reported_at IS NOT NULL)
               ORDER BY x.created_at DESC)
          FROM mine x), '[]'::jsonb)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reply_to_review(p_review_id uuid, p_reply text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_business uuid;
  v_reply text := nullif(left(trim(coalesce(p_reply, '')), 500), '');
BEGIN
  SELECT r.business_id INTO v_business FROM public.reviews r WHERE r.id = p_review_id FOR UPDATE;
  IF v_business IS NULL OR NOT public.is_business_owner(v_business) THEN
    RAISE EXCEPTION 'We could not find this review' USING ERRCODE = 'P0002';
  END IF;
  IF v_reply IS NULL THEN
    RAISE EXCEPTION 'Write a reply first' USING ERRCODE = '22023';
  END IF;
  UPDATE public.reviews
     SET reply = v_reply, replied_at = coalesce(replied_at, now())
   WHERE id = p_review_id;
END;
$$;

-- Owners cannot hide a review. They report it; Locappoint decides, so reviews stay trustworthy.
CREATE OR REPLACE FUNCTION public.report_review(p_review_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  v_reason text := left(trim(coalesce(p_reason, '')), 1000);
BEGIN
  SELECT rv.id, rv.business_id, rv.rating, rv.body, rv.reported_at, a.client_name, a.appointment_date
    INTO r
    FROM public.reviews rv JOIN public.appointments a ON a.id = rv.appointment_id
   WHERE rv.id = p_review_id;
  IF r.id IS NULL OR NOT public.is_business_owner(r.business_id) THEN
    RAISE EXCEPTION 'We could not find this review' USING ERRCODE = 'P0002';
  END IF;
  IF length(v_reason) < 10 THEN
    RAISE EXCEPTION 'Tell us in a sentence what is wrong with it' USING ERRCODE = '22023';
  END IF;
  IF r.reported_at IS NOT NULL THEN
    RAISE EXCEPTION 'You already reported this review. We will reply by email.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.reviews SET reported_at = now(), report_reason = v_reason WHERE id = p_review_id;
  INSERT INTO public.support_tickets (user_id, business_id, category, subject, message)
  VALUES (auth.uid(), r.business_id, 'business_page', 'Review report',
          'Review ' || r.id || ' (' || r.rating || ' stars, visit ' || r.appointment_date || ', ' || r.client_name || E')\n'
          || coalesce(r.body, '(no text)') || E'\n\nReason: ' || v_reason);
END;
$$;


-- Told about a review: the owner when one arrives, the client when the owner first replies.
CREATE OR REPLACE FUNCTION public.notify_review_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_payload jsonb;
  v_owner uuid;
  v_owner_email text;
BEGIN
  BEGIN
    SELECT * INTO a FROM public.appointments WHERE id = NEW.appointment_id;
    v_payload := public.booking_notice_payload(a) || jsonb_build_object(
      'review_id', NEW.id, 'rating', NEW.rating, 'body', NEW.body, 'reply', NEW.reply,
      'author', public.review_author(a.client_name));

    IF TG_OP = 'INSERT' THEN
      SELECT b.user_id, u.email INTO v_owner, v_owner_email
        FROM public.businesses b LEFT JOIN auth.users u ON u.id = b.user_id
       WHERE b.id = NEW.business_id;
      IF EXISTS (SELECT 1 FROM public.users p WHERE p.id = v_owner) THEN
        INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
        VALUES (v_owner, 'business', 'review_new', NEW.business_id, NEW.appointment_id, v_payload,
                'review_new:business:' || v_owner || ':' || NEW.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
      IF v_owner_email IS NOT NULL THEN
        INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
        VALUES ('review_new', v_owner, v_owner_email, NEW.business_id, NEW.appointment_id,
                v_payload || jsonb_build_object('audience', 'business'),
                'review_new:business:email:' || v_owner || ':' || NEW.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
      RETURN NULL;
    END IF;

    IF OLD.reply IS NULL AND NEW.reply IS NOT NULL THEN
      IF a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users p WHERE p.id = a.client_id) THEN
        INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
        VALUES (a.client_id, 'client', 'review_reply', NEW.business_id, NEW.appointment_id, v_payload,
                'review_reply:client:' || a.client_id || ':' || NEW.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
      IF a.client_email IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.email_optouts o WHERE o.email = lower(a.client_email))
         AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id AND u.email_notifications = false) THEN
        INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
        VALUES ('review_reply', CASE WHEN EXISTS (SELECT 1 FROM public.users p WHERE p.id = a.client_id) THEN a.client_id END,
                a.client_email, NEW.business_id, NEW.appointment_id,
                v_payload || jsonb_build_object('audience', 'client'),
                'review_reply:client:email:' || lower(a.client_email) || ':' || NEW.id)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS notify_review_change ON public.reviews;
CREATE TRIGGER notify_review_change
  AFTER INSERT OR UPDATE OF reply ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_review_change();


-- The follow-up now also asks for stars. A client who already rebooked still gets it, without "Book again";
-- one who already rebooked and reviewed gets nothing.
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
  v_booked boolean;
  v_reviewed boolean;
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

      v_booked := EXISTS (
        SELECT 1 FROM public.appointments x
         WHERE x.business_id = a.business_id
           AND x.status IN ('pending', 'confirmed')
           AND x.appointment_date + x.appointment_time > v_now
           AND ((a.client_id IS NOT NULL AND x.client_id = a.client_id)
                OR (a.client_email IS NOT NULL AND lower(x.client_email) = lower(a.client_email))));
      v_reviewed := EXISTS (SELECT 1 FROM public.reviews r WHERE r.appointment_id = a.id);
      CONTINUE WHEN v_booked AND v_reviewed;

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
        'visits', v_rhythm->'visits',
        'booked_again', v_booked,
        'ask_review', NOT v_reviewed);

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


REVOKE EXECUTE ON FUNCTION public.review_state(public.appointments) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_review(public.appointments, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_review_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_visit_followups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.review_by_link(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_review_by_link(text, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.public_reviews(uuid, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.business_ratings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_by_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_by_link(text, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_reviews(uuid, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.business_ratings() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_my_review(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owner_reviews(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reply_to_review(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_my_review(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reply_to_review(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_review(uuid, text) TO authenticated;

COMMIT;
