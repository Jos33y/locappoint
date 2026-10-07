-- Reliability score and the blue badge ("Reliable"). Every night each business gets a score out of
-- 100 from the last 90 days: kept bookings (40), showed up (25), answers requests in 12 hours (20)
-- and a clean support record (15). Only cancellations by the business, business no-shows and reports
-- upheld by Locappoint count; anything the client does never does. The score shows from 10 bookings.
-- Clients see "Keeps 98% of bookings" and the badge, never the number. The badge comes at 90 with 10
-- completed visits, a confirmed email, a phone on file and no upheld safety report in 180 days; it
-- goes after 7 days below 85. Owners see everything in Insights; staff can excuse a cancellation or
-- remove the badge with a note. The engine ranks with the score instead of the old cancel rate.
-- Needs engine-v1.sql, weekly-statement.sql, support-desk.sql, client-blocks.sql. Safe to run again.

BEGIN;

-- 1. When a request was made and answered, and whether a booking was ever confirmed. A decline is an
--    answer, never a cancellation. Requests before this file have no time, so they never count.
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS requested_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS answered_at timestamptz;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS was_confirmed boolean NOT NULL DEFAULT false;

UPDATE public.appointments a
   SET was_confirmed = true
 WHERE NOT a.was_confirmed
   AND (a.status IN ('confirmed', 'completed', 'no_show')
        OR (a.status = 'cancelled' AND a.cancelled_by = 'client')
        OR (a.status = 'cancelled' AND a.cancelled_by = 'business'
            AND NOT EXISTS (SELECT 1 FROM public.notification_queue q WHERE q.appointment_id = a.id AND q.kind = 'booking_declined')
            AND NOT EXISTS (SELECT 1 FROM public.inbox i WHERE i.appointment_id = a.id AND i.kind = 'booking_declined')
            AND NOT EXISTS (SELECT 1 FROM public.payment_refunds r WHERE r.appointment_id = a.id AND r.reason = 'declined')));

CREATE OR REPLACE FUNCTION public.appointments_timing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    NEW.requested_at := now();
    NEW.answered_at := NULL;
  END IF;
  -- The business answered: confirmed, declined, or moved on. A client giving up is not an answer.
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> 'pending'
     AND NOT (NEW.status = 'cancelled' AND NEW.cancelled_by = 'client') THEN
    NEW.answered_at := now();
  END IF;
  IF NEW.status IN ('confirmed', 'completed', 'no_show') THEN
    NEW.was_confirmed := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Named to run after appointments_lifecycle, which decides who cancelled.
DROP TRIGGER IF EXISTS appointments_timing ON public.appointments;
CREATE TRIGGER appointments_timing
  BEFORE INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointments_timing();

CREATE INDEX IF NOT EXISTS appointments_requested_idx ON public.appointments (business_id, requested_at) WHERE requested_at IS NOT NULL;

-- 2. Cancellations Locappoint staff excuse (illness with proof, a flood). They stay in the history.
CREATE TABLE IF NOT EXISTS public.reliability_excuses (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(note) BETWEEN 10 AND 1000),
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reliability_excuses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reliability_excuses FROM anon, authenticated;

-- 3. The score and the badge, one row per business, written every night.
CREATE TABLE IF NOT EXISTS public.business_reliability (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  score integer,
  shown boolean NOT NULL DEFAULT false,
  bookings integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  kept_pct integer,
  parts jsonb NOT NULL DEFAULT '{}'::jsonb,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  badge boolean NOT NULL DEFAULT false,
  badge_since timestamptz,
  below_since timestamptz,
  warned_at timestamptz,
  removed_at timestamptz,
  removed_note text,
  removed_by uuid,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_reliability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_reliability FROM anon, authenticated;

-- Twelve weeks of history for the trend in Insights: the last score of each week.
CREATE TABLE IF NOT EXISTS public.business_reliability_weeks (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  week date NOT NULL,
  score integer,
  badge boolean NOT NULL DEFAULT false,
  PRIMARY KEY (business_id, week)
);
ALTER TABLE public.business_reliability_weeks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_reliability_weeks FROM anon, authenticated;

-- 4. The score, worked out live. Points: kept 40, showed up 25, answers 20, clean record 15.
--    Kept: every cancellation by the business costs 4% of the bookings it had (a late one, under 24
--    hours, costs double). Showed up: a no-show by the business, upheld in Support, costs 10%.
--    Answers: a request still waiting after 12 hours costs 2% of requests. Clean record: an upheld
--    report costs 5% of bookings, a safety report three times that.
CREATE OR REPLACE FUNCTION public.reliability_compute(p_business uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  v_today date;
  v_base integer;
  v_completed integer;
  v_cancels integer;
  v_late integer;
  v_excused integer;
  v_noshows integer;
  v_requests integer;
  v_late_req integer;
  v_reports integer;
  v_safety integer;
  v_safety180 boolean;
  v_kept numeric;
  v_showed numeric;
  v_answers numeric;
  v_clean numeric;
  v_score integer;
  v_email boolean;
  v_phone boolean;
  v_shown boolean;
  v_items jsonb;
  v_unit numeric;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = p_business;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_today := (now() AT TIME ZONE b.timezone)::date;

  -- Bookings that were confirmed at some point, visit in the last 90 days, plus any the business
  -- cancelled in the last 90 days whatever the visit date.
  SELECT count(*),
         count(*) FILTER (WHERE w.status = 'completed'),
         count(*) FILTER (WHERE w.biz_cancel AND NOT w.excused),
         count(*) FILTER (WHERE w.biz_cancel AND NOT w.excused AND w.is_late),
         count(*) FILTER (WHERE w.biz_cancel AND w.excused)
    INTO v_base, v_completed, v_cancels, v_late, v_excused
    FROM (
      SELECT a.status,
             (a.status = 'cancelled' AND a.cancelled_by = 'business') AS biz_cancel,
             coalesce(a.cancelled_at > ((a.appointment_date + a.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours', false) AS is_late,
             EXISTS (SELECT 1 FROM public.reliability_excuses x WHERE x.appointment_id = a.id) AS excused
        FROM public.appointments a
       WHERE a.business_id = b.id AND a.was_confirmed
         AND ((a.appointment_date > v_today - 90 AND a.appointment_date <= v_today)
              OR (a.status = 'cancelled' AND a.cancelled_by = 'business' AND a.cancelled_at >= now() - interval '90 days'))
    ) w;

  -- No-shows by the business: a client's "they did not come" upheld by us. A booking the business
  -- cancelled is already counted above, so it does not count twice.
  SELECT count(DISTINCT coalesce(t.appointment_id, t.id))
    INTO v_noshows
    FROM public.support_tickets t
    LEFT JOIN public.appointments a ON a.id = t.appointment_id
   WHERE t.business_id = b.id AND t.side = 'client' AND t.category = 'no_show' AND t.outcome = 'upheld'
     AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '90 days'
     AND NOT (coalesce(a.status, '') = 'cancelled' AND coalesce(a.cancelled_by, '') = 'business');

  SELECT count(DISTINCT coalesce(t.appointment_id, t.id)) FILTER (WHERE t.category <> 'safety'),
         count(DISTINCT coalesce(t.appointment_id, t.id)) FILTER (WHERE t.category = 'safety')
    INTO v_reports, v_safety
    FROM public.support_tickets t
   WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld' AND t.category <> 'no_show'
     AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '90 days';

  SELECT EXISTS (
    SELECT 1 FROM public.support_tickets t
     WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld' AND t.category = 'safety'
       AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '180 days')
    INTO v_safety180;

  -- Requests: answered, still waiting, or given up on by the client after 12 hours.
  SELECT count(*), count(*) FILTER (WHERE r.late)
    INTO v_requests, v_late_req
    FROM (
      SELECT CASE
               WHEN a.answered_at IS NOT NULL THEN a.answered_at - a.requested_at > interval '12 hours'
               WHEN a.status = 'pending' THEN now() - a.requested_at > interval '12 hours'
               ELSE true
             END AS late
        FROM public.appointments a
       WHERE a.business_id = b.id AND a.requested_at >= now() - interval '90 days'
         AND (a.answered_at IS NOT NULL OR a.status = 'pending'
              OR (a.status = 'cancelled' AND a.cancelled_by = 'client' AND a.cancelled_at - a.requested_at > interval '12 hours'))
    ) r;

  v_unit := greatest(v_base, 1);
  v_kept := greatest(0, 1 - 4.0 * (v_cancels + v_late) / v_unit);
  v_showed := greatest(0, 1 - 10.0 * v_noshows / v_unit);
  v_answers := CASE WHEN v_requests > 0 THEN greatest(0, 1 - 2.0 * v_late_req / v_requests) ELSE 1 END;
  v_clean := greatest(0, 1 - 5.0 * (v_reports + 3 * v_safety) / v_unit);
  v_score := round(40 * v_kept + 25 * v_showed + 20 * v_answers + 15 * v_clean);
  v_shown := v_base >= 10;

  SELECT au.email_confirmed_at IS NOT NULL INTO v_email FROM auth.users au WHERE au.id = b.user_id;
  v_phone := length(regexp_replace(coalesce(b.phone, ''), '\D', '', 'g')) >= 7;

  -- What cost points, newest first, with roughly how many.
  SELECT coalesce(jsonb_agg(i ORDER BY i->>'at' DESC), '[]'::jsonb)
    INTO v_items
    FROM (
      SELECT i FROM (
        SELECT jsonb_build_object(
                 'kind', CASE WHEN x.is_late THEN 'late_cancel' ELSE 'cancel' END,
                 'appointment_id', x.id, 'date', x.appointment_date, 'time', to_char(x.appointment_time, 'HH24:MI'),
                 'client_name', x.client_name, 'at', x.cancelled_at,
                 'points', round(40 * least(1, (CASE WHEN x.is_late THEN 8.0 ELSE 4.0 END) / v_unit), 1)) AS i
          FROM (
            SELECT a.id, a.appointment_date, a.appointment_time, a.client_name, a.cancelled_at,
                   coalesce(a.cancelled_at > ((a.appointment_date + a.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours', false) AS is_late
              FROM public.appointments a
             WHERE a.business_id = b.id AND a.was_confirmed AND a.status = 'cancelled' AND a.cancelled_by = 'business'
               AND NOT EXISTS (SELECT 1 FROM public.reliability_excuses e WHERE e.appointment_id = a.id)
               AND ((a.appointment_date > v_today - 90 AND a.appointment_date <= v_today) OR a.cancelled_at >= now() - interval '90 days')
          ) x
        UNION ALL
        SELECT jsonb_build_object(
                 'kind', CASE WHEN t.category = 'no_show' THEN 'no_show' WHEN t.category = 'safety' THEN 'safety' ELSE 'report' END,
                 'appointment_id', t.appointment_id, 'ticket_number', t.number, 'subject', t.subject,
                 'at', coalesce(t.resolved_at, t.updated_at),
                 'points', round(CASE WHEN t.category = 'no_show' THEN 25 * least(1, 10.0 / v_unit)
                                      WHEN t.category = 'safety' THEN 15 * least(1, 15.0 / v_unit)
                                      ELSE 15 * least(1, 5.0 / v_unit) END, 1))
          FROM public.support_tickets t
          LEFT JOIN public.appointments a ON a.id = t.appointment_id
         WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld'
           AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '90 days'
           AND NOT (t.category = 'no_show' AND coalesce(a.status, '') = 'cancelled' AND coalesce(a.cancelled_by, '') = 'business')
        UNION ALL
        SELECT jsonb_build_object(
                 'kind', 'late_request', 'appointment_id', a.id, 'date', a.appointment_date,
                 'time', to_char(a.appointment_time, 'HH24:MI'), 'client_name', a.client_name, 'at', a.requested_at,
                 'waited_hours', round(extract(epoch FROM coalesce(a.answered_at, CASE WHEN a.status = 'pending' THEN now() ELSE a.cancelled_at END) - a.requested_at) / 3600),
                 'points', round(20 * least(1, 2.0 / greatest(v_requests, 1)), 1))
          FROM public.appointments a
         WHERE a.business_id = b.id AND a.requested_at >= now() - interval '90 days'
           AND ((a.answered_at IS NOT NULL AND a.answered_at - a.requested_at > interval '12 hours')
                OR (a.answered_at IS NULL AND a.status = 'pending' AND now() - a.requested_at > interval '12 hours')
                OR (a.status = 'cancelled' AND a.cancelled_by = 'client' AND a.answered_at IS NULL AND a.cancelled_at - a.requested_at > interval '12 hours'))
      ) z
      ORDER BY i->>'at' DESC
      LIMIT 20
    ) q;

  RETURN jsonb_build_object(
    'score', v_score,
    'shown', v_shown,
    'bookings', v_base,
    'completed', v_completed,
    'kept_pct', CASE WHEN v_base > 0 THEN round(100.0 * (v_base - v_cancels) / v_base) END,
    'parts', jsonb_build_object(
      'kept', round(40 * v_kept, 1), 'showed', round(25 * v_showed, 1),
      'answers', round(20 * v_answers, 1), 'clean', round(15 * v_clean, 1)),
    'counts', jsonb_build_object(
      'cancels', v_cancels, 'late_cancels', v_late, 'excused', v_excused, 'no_shows', v_noshows,
      'requests', v_requests, 'late_requests', v_late_req, 'reports', v_reports, 'safety', v_safety),
    'checks', jsonb_build_object(
      'score', v_shown AND v_score >= 90,
      'completed', v_completed >= 10,
      'email', coalesce(v_email, false),
      'phone', v_phone,
      'safety', NOT v_safety180,
      'active', coalesce(b.is_active, false) AND b.suspended_at IS NULL),
    'items', v_items,
    'today', v_today
  );
END;
$$;

-- 5. Tell the owner: in the bell and by email. Never blocks the nightly run.
CREATE OR REPLACE FUNCTION public.reliability_notify(p_business uuid, p_event text, p_extra jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  r public.business_reliability;
  v_email text;
  v_on boolean;
  v_profile boolean;
  v_payload jsonb;
  v_key text;
BEGIN
  BEGIN
    SELECT * INTO b FROM public.businesses WHERE id = p_business;
    SELECT * INTO r FROM public.business_reliability WHERE business_id = p_business;
    SELECT u.email, coalesce(u.email_notifications, true), true INTO v_email, v_on, v_profile FROM public.users u WHERE u.id = b.user_id;
    v_payload := jsonb_build_object('audience', 'business', 'event', p_event, 'business_name', b.business_name, 'slug', b.slug,
                                    'score', r.score, 'kept_pct', r.kept_pct, 'parts', r.parts, 'counts', r.counts) || coalesce(p_extra, '{}'::jsonb);
    v_key := 'reliability:' || p_business || ':' || p_event || ':' || to_char(now(), 'YYYY-MM-DD');
    IF coalesce(v_profile, false) THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, payload, dedupe_key)
      VALUES (b.user_id, 'business', 'reliability', b.id, v_payload, v_key || ':inbox')
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF v_email IS NOT NULL AND v_on THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, payload, dedupe_key)
      VALUES ('reliability', b.user_id, v_email, b.id, v_payload, v_key || ':email')
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'reliability notice for % not sent: %', p_business, SQLERRM;
  END;
END;
$$;

-- 6. Store the score for one business and move the badge. Won at 90 with every check passed; a
--    warning when it slips under 90; lost after 7 days under 85, or at once for a safety report,
--    a pause, or staff removing it. p_quiet stores without telling anyone (the first run).
CREATE OR REPLACE FUNCTION public.reliability_update(p_business uuid, p_quiet boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c jsonb;
  r public.business_reliability;
  v_score integer;
  v_shown boolean;
  v_ok boolean;
  v_hard boolean;
  v_event text;
  v_tz text;
BEGIN
  c := public.reliability_compute(p_business);
  IF c IS NULL THEN
    RETURN NULL;
  END IF;
  v_score := (c->>'score')::int;
  v_shown := (c->>'shown')::boolean;
  v_ok := (SELECT bool_and(value::boolean) FROM jsonb_each_text(c->'checks'));
  v_hard := NOT (c #>> '{checks,safety}')::boolean OR NOT (c #>> '{checks,active}')::boolean;

  INSERT INTO public.business_reliability (business_id) VALUES (p_business) ON CONFLICT (business_id) DO NOTHING;
  SELECT * INTO r FROM public.business_reliability WHERE business_id = p_business FOR UPDATE;

  UPDATE public.business_reliability
     SET score = v_score, shown = v_shown, bookings = (c->>'bookings')::int, completed = (c->>'completed')::int,
         kept_pct = CASE WHEN v_shown THEN (c->>'kept_pct')::int END,
         parts = c->'parts', counts = c->'counts', computed_at = now()
   WHERE business_id = p_business;

  IF r.removed_at IS NOT NULL THEN
    UPDATE public.business_reliability SET badge = false, below_since = NULL WHERE business_id = p_business;
  ELSIF NOT r.badge THEN
    IF v_ok THEN
      UPDATE public.business_reliability SET badge = true, badge_since = now(), below_since = NULL, warned_at = NULL WHERE business_id = p_business;
      v_event := 'won';
    END IF;
  ELSE
    IF v_hard OR NOT v_shown THEN
      UPDATE public.business_reliability SET badge = false, badge_since = NULL, below_since = NULL, warned_at = NULL WHERE business_id = p_business;
      v_event := 'lost';
    ELSIF v_score < 85 THEN
      IF r.below_since IS NOT NULL AND r.below_since <= now() - interval '7 days' THEN
        UPDATE public.business_reliability SET badge = false, badge_since = NULL, below_since = NULL, warned_at = NULL WHERE business_id = p_business;
        v_event := 'lost';
      ELSE
        UPDATE public.business_reliability SET below_since = coalesce(below_since, now()), warned_at = coalesce(warned_at, now()) WHERE business_id = p_business;
        IF r.warned_at IS NULL OR r.below_since IS NULL THEN
          v_event := 'warning';
        END IF;
      END IF;
    ELSIF v_score < 90 THEN
      UPDATE public.business_reliability SET below_since = NULL, warned_at = coalesce(warned_at, now()) WHERE business_id = p_business;
      IF r.warned_at IS NULL THEN
        v_event := 'warning';
      END IF;
    ELSE
      UPDATE public.business_reliability SET below_since = NULL, warned_at = NULL WHERE business_id = p_business;
    END IF;
  END IF;

  SELECT b.timezone INTO v_tz FROM public.businesses b WHERE b.id = p_business;
  INSERT INTO public.business_reliability_weeks (business_id, week, score, badge)
  SELECT p_business, date_trunc('week', now() AT TIME ZONE v_tz)::date, CASE WHEN v_shown THEN v_score END, br.badge
    FROM public.business_reliability br WHERE br.business_id = p_business
  ON CONFLICT (business_id, week) DO UPDATE SET score = EXCLUDED.score, badge = EXCLUDED.badge;
  DELETE FROM public.business_reliability_weeks WHERE business_id = p_business AND week < current_date - 7 * 26;

  IF v_event IS NOT NULL AND NOT p_quiet THEN
    PERFORM public.reliability_notify(p_business, v_event,
      jsonb_build_object('below_since', (SELECT below_since FROM public.business_reliability WHERE business_id = p_business)));
  END IF;
  RETURN c || jsonb_build_object('event', v_event);
END;
$$;

-- Every business with bookings, every night. One that fails does not stop the rest.
CREATE OR REPLACE FUNCTION public.reliability_refresh(p_quiet boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_n integer := 0;
BEGIN
  FOR v_id IN
    SELECT b.id FROM public.businesses b
     WHERE b.is_demo IS NOT TRUE
       AND (b.is_active OR EXISTS (SELECT 1 FROM public.business_reliability r WHERE r.business_id = b.id))
  LOOP
    BEGIN
      PERFORM public.reliability_update(v_id, p_quiet);
      v_n := v_n + 1;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'reliability for % failed: %', v_id, SQLERRM;
    END;
  END LOOP;
  RETURN v_n;
END;
$$;

-- 7. For the owner in Insights: the live score, its parts and what cost points, the badge and its
--    checks, and twelve weeks of history.
CREATE OR REPLACE FUNCTION public.my_reliability(p_business uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.business_reliability;
BEGIN
  IF NOT public.is_business_owner(p_business) THEN
    RAISE EXCEPTION 'Only the owner can see this' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.business_reliability WHERE business_id = p_business;
  RETURN public.reliability_compute(p_business) || jsonb_build_object(
    'badge', coalesce(r.badge, false),
    'badge_since', r.badge_since,
    'below_since', r.below_since,
    'removed', r.removed_at IS NOT NULL,
    'removed_note', r.removed_note,
    'weeks', coalesce((
      SELECT jsonb_agg(jsonb_build_object('week', w.week, 'score', w.score, 'badge', w.badge) ORDER BY w.week)
        FROM (SELECT * FROM public.business_reliability_weeks x WHERE x.business_id = p_business ORDER BY x.week DESC LIMIT 12) w), '[]'::jsonb)
  );
END;
$$;

-- 8. What clients see: the badge and "keeps 98% of bookings", from 10 bookings. Never the score.
CREATE OR REPLACE FUNCTION public.business_trust()
RETURNS TABLE (business_id uuid, reliable boolean, kept_pct integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.business_id, r.badge, CASE WHEN r.shown THEN r.kept_pct END
    FROM public.business_reliability r
    JOIN public.businesses b ON b.id = r.business_id
   WHERE b.is_active = true AND (r.badge OR r.shown);
$$;

-- 9. Admin: every business with its score, parts and badge; the detail with what counted; remove or
--    restore the badge with a note the owner reads; excuse one cancellation.
CREATE OR REPLACE FUNCTION public.admin_reliability(p_view text DEFAULT 'all', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows jsonb;
  v_total integer;
  v_counts jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_view NOT IN ('all', 'badge', 'warned', 'removed', 'new') THEN
    RAISE EXCEPTION 'Unknown view' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
           'all', count(*),
           'badge', count(*) FILTER (WHERE r.badge),
           'warned', count(*) FILTER (WHERE r.warned_at IS NOT NULL AND r.badge),
           'removed', count(*) FILTER (WHERE r.removed_at IS NOT NULL),
           'new', count(*) FILTER (WHERE NOT r.shown))
    INTO v_counts
    FROM public.business_reliability r;

  SELECT count(*) INTO v_total
    FROM public.business_reliability r
   WHERE p_view = 'all' OR (p_view = 'badge' AND r.badge) OR (p_view = 'warned' AND r.warned_at IS NOT NULL AND r.badge)
      OR (p_view = 'removed' AND r.removed_at IS NOT NULL) OR (p_view = 'new' AND NOT r.shown);

  SELECT coalesce(jsonb_agg(x ORDER BY ord), '[]'::jsonb) INTO v_rows FROM (
    SELECT jsonb_build_object(
             'business_id', b.id, 'business_name', b.business_name, 'slug', b.slug, 'city', b.city,
             'score', r.score, 'shown', r.shown, 'bookings', r.bookings, 'completed', r.completed, 'kept_pct', r.kept_pct,
             'parts', r.parts, 'counts', r.counts, 'badge', r.badge, 'badge_since', r.badge_since,
             'below_since', r.below_since, 'warned_at', r.warned_at, 'removed_at', r.removed_at,
             'removed_note', r.removed_note, 'computed_at', r.computed_at) AS x,
           row_number() OVER (ORDER BY r.shown DESC, r.score ASC NULLS LAST, b.business_name) AS ord
      FROM public.business_reliability r
      JOIN public.businesses b ON b.id = r.business_id
     WHERE p_view = 'all' OR (p_view = 'badge' AND r.badge) OR (p_view = 'warned' AND r.warned_at IS NOT NULL AND r.badge)
        OR (p_view = 'removed' AND r.removed_at IS NOT NULL) OR (p_view = 'new' AND NOT r.shown)
     ORDER BY r.shown DESC, r.score ASC NULLS LAST, b.business_name
     LIMIT greatest(1, least(coalesce(p_limit, 50), 200)) OFFSET greatest(coalesce(p_offset, 0), 0)
  ) q;

  RETURN jsonb_build_object('total', v_total, 'counts', v_counts, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reliability_business(p_business uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.business_reliability;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.business_reliability WHERE business_id = p_business;
  RETURN public.reliability_compute(p_business) || jsonb_build_object(
    'badge', coalesce(r.badge, false), 'badge_since', r.badge_since, 'below_since', r.below_since,
    'removed_at', r.removed_at, 'removed_note', r.removed_note,
    'excused', coalesce((
      SELECT jsonb_agg(jsonb_build_object('appointment_id', e.appointment_id, 'note', e.note, 'at', e.created_at,
                                          'date', a.appointment_date, 'client_name', a.client_name) ORDER BY e.created_at DESC)
        FROM public.reliability_excuses e JOIN public.appointments a ON a.id = e.appointment_id
       WHERE e.business_id = p_business AND e.created_at >= now() - interval '180 days'), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_badge(p_business uuid, p_action text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_had boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('remove', 'restore') THEN
    RAISE EXCEPTION 'Remove or restore' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business) THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.business_reliability (business_id) VALUES (p_business) ON CONFLICT (business_id) DO NOTHING;

  IF p_action = 'remove' THEN
    IF v_note IS NULL OR length(v_note) < 10 THEN
      RAISE EXCEPTION 'Say why; the owner reads it' USING ERRCODE = '22023';
    END IF;
    SELECT badge INTO v_had FROM public.business_reliability WHERE business_id = p_business FOR UPDATE;
    UPDATE public.business_reliability
       SET badge = false, badge_since = NULL, below_since = NULL, warned_at = NULL,
           removed_at = now(), removed_note = left(v_note, 1000), removed_by = auth.uid()
     WHERE business_id = p_business;
    PERFORM public.reliability_notify(p_business, 'removed', jsonb_build_object('note', left(v_note, 1000), 'had', coalesce(v_had, false)));
  ELSE
    UPDATE public.business_reliability
       SET removed_at = NULL, removed_note = NULL, removed_by = NULL
     WHERE business_id = p_business;
    PERFORM public.reliability_update(p_business, false);
  END IF;
  RETURN public.admin_reliability_business(p_business);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_excuse_cancellation(p_appointment uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (a.status = 'cancelled' AND a.cancelled_by = 'business') THEN
    RAISE EXCEPTION 'Only a cancellation by the business can be excused' USING ERRCODE = '22023';
  END IF;
  IF v_note IS NULL OR length(v_note) < 10 THEN
    RAISE EXCEPTION 'Say why it is excused' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.reliability_excuses (appointment_id, business_id, note, admin_id)
  VALUES (a.id, a.business_id, left(v_note, 1000), auth.uid())
  ON CONFLICT (appointment_id) DO UPDATE SET note = EXCLUDED.note, admin_id = EXCLUDED.admin_id;
  PERFORM public.reliability_update(a.business_id, false);
  RETURN public.admin_reliability_business(a.business_id);
END;
$$;

-- 10. The engine ranks with the score (10%) in place of the old cancel rate, and says when a
--     business is Reliable and how many bookings it keeps. Below 10 bookings it counts as average.
CREATE OR REPLACE FUNCTION public.engine_match(
  p_market text, p_query text, p_mode text DEFAULT NULL, p_dates date[] DEFAULT NULL,
  p_window text DEFAULT 'any', p_at time without time zone DEFAULT NULL, p_people integer DEFAULT 1,
  p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL, p_zone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_now timestamp;
  v_dates date[];
  v_people integer := greatest(1, least(coalesce(p_people, 1), 50));
  v_tokens text[];
  v_from time;
  v_to time;
  v_matched integer;
  v_rows jsonb;
  v_later jsonb;
  v_pick jsonb := '[]'::jsonb;
  v_used uuid[] := '{}';
  r jsonb;
  v_first jsonb;
BEGIN
  SELECT m.timezone INTO v_tz FROM public.markets m WHERE m.code = p_market;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Pick a city' USING ERRCODE = '22023';
  END IF;
  IF p_mode IS NOT NULL AND p_mode NOT IN ('at_business', 'at_client', 'online') THEN
    RAISE EXCEPTION 'Pick where it happens' USING ERRCODE = '22023';
  END IF;
  IF p_mode = 'at_client' AND p_zone IS NULL AND p_lat IS NULL THEN
    RAISE EXCEPTION 'Tell us where you are, so we only show people who come to you' USING ERRCODE = '22023';
  END IF;

  -- A brake on repeated searches: per visitor when signed out, per person when signed in.
  IF v_uid IS NULL THEN
    IF NOT public.rate_ok(CASE WHEN public.request_origin() IS NOT NULL THEN 'engine:ip:' || public.request_origin() END, 60, 600) THEN
      RAISE EXCEPTION 'Lots of searches from here. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NOT public.rate_ok('engine:user:' || v_uid, 120, 600) THEN
    RAISE EXCEPTION 'Lots of searches. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
  END IF;

  v_now := now() AT TIME ZONE v_tz;
  v_today := v_now::date;
  SELECT coalesce(array_agg(d ORDER BY d), ARRAY[v_today])
    INTO v_dates
    FROM (SELECT DISTINCT d FROM unnest(coalesce(p_dates, ARRAY[v_today])) AS d
           WHERE d BETWEEN v_today AND v_today + 90 ORDER BY d LIMIT 3) x;
  IF cardinality(v_dates) = 0 THEN v_dates := ARRAY[v_today]; END IF;

  SELECT array_agg(DISTINCT tok) INTO v_tokens
    FROM unnest(string_to_array(public.engine_fold(p_query), ' ')) AS tok
   WHERE length(tok) >= 3
     AND tok <> ALL (ARRAY['and', 'the', 'for', 'with', 'please', 'book', 'need', 'want', 'some', 'someone', 'today', 'tomorrow',
                           'para', 'com', 'uma', 'uns', 'umas', 'por', 'favor', 'quero', 'preciso', 'marcar', 'hoje', 'amanha', 'meu', 'minha']);
  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Say what you need, like "haircut" or "nails"' USING ERRCODE = '22023';
  END IF;

  IF p_at IS NOT NULL THEN
    v_from := (p_at - interval '90 minutes')::time;
    v_to := (p_at + interval '90 minutes')::time;
    IF p_at < time '01:30' THEN v_from := time '00:00'; END IF;
    IF p_at > time '22:29' THEN v_to := time '23:59'; END IF;
  ELSE
    v_from := CASE p_window WHEN 'afternoon' THEN time '12:00' WHEN 'evening' THEN time '17:00' ELSE time '00:00' END;
    v_to := CASE p_window WHEN 'morning' THEN time '11:59' WHEN 'afternoon' THEN time '16:59' ELSE time '23:59' END;
  END IF;

  IF to_regclass('pg_temp.engine_slots') IS NULL THEN
    CREATE TEMP TABLE engine_slots (
      sid uuid, bid uuid, fit numeric, km numeric, day date, at time, in_window boolean
    ) ON COMMIT DROP;
  END IF;
  TRUNCATE pg_temp.engine_slots;

  -- Services that fit the words, the format, the place and the group.
  WITH svc AS (
    SELECT s.id AS sid, b.id AS bid, public.engine_fit(v_tokens, s.service_name, b.category) AS fit,
           CASE WHEN p_lat IS NOT NULL AND b.lat IS NOT NULL THEN public.km_between(b.lat, b.lng, p_lat, p_lng) END AS km,
           b.is_demo
      FROM public.services s
      JOIN public.businesses b ON b.id = s.business_id
     WHERE b.is_active = true AND b.market = p_market AND s.is_active = true
       AND v_people <= s.max_people
       AND (p_mode IS NULL OR p_mode = ANY (s.modes))
       AND (p_mode IS DISTINCT FROM 'at_client' OR (
             (p_zone IS NOT NULL AND p_zone = ANY (b.service_zones))
             OR (b.service_radius_km IS NOT NULL AND b.lat IS NOT NULL AND p_lat IS NOT NULL
                 AND public.km_between(b.lat, b.lng, p_lat, p_lng) <= b.service_radius_km)))
  ),
  fit AS (
    SELECT * FROM svc WHERE fit > 0 ORDER BY fit DESC, is_demo NULLS FIRST LIMIT 25
  )
  INSERT INTO pg_temp.engine_slots (sid, bid, fit, km, day, at, in_window)
  SELECT f.sid, f.bid, f.fit, f.km, d.day, sl.slot_time,
         sl.slot_time BETWEEN v_from AND v_to
    FROM fit f
   CROSS JOIN unnest(v_dates) AS d(day)
   CROSS JOIN LATERAL public.get_available_slots(f.bid, f.sid, d.day, NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END) sl;

  SELECT count(DISTINCT sid) INTO v_matched FROM pg_temp.engine_slots;

  -- One option per business: its best service and time, scored.
  WITH stats AS (
    SELECT b.id AS bid, b.business_name, b.slug, b.city, b.logo_url, b.is_demo, b.currency,
           (SELECT round(avg(rv.rating)::numeric, 1) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS rating,
           (SELECT count(*) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS reviews,
           (SELECT CASE WHEN count(*) >= 5 THEN round(100.0 * count(*) FILTER (WHERE x.visits >= 2) / count(*)) END
              FROM (SELECT count(*) AS visits FROM public.appointments a
                     WHERE a.business_id = b.id AND a.status = 'completed' AND a.client_email IS NOT NULL
                       AND a.appointment_date > v_today - 365
                     GROUP BY lower(a.client_email)) x) AS rebook_pct,
           rl.score / 100.0 AS reliability, rl.kept_pct, coalesce(rl.badge, false) AS reliable,
           (v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.business_id = b.id AND a.client_id = v_uid AND a.status = 'completed')) AS regular
      FROM public.businesses b
      LEFT JOIN public.business_reliability rl ON rl.business_id = b.id AND (rl.shown OR rl.badge)
     WHERE b.id IN (SELECT DISTINCT bid FROM pg_temp.engine_slots)
  ),
  scored AS (
    SELECT e.sid, e.bid, e.fit, e.km, e.day, e.at, st.business_name, st.slug, st.city, st.logo_url, st.is_demo, st.currency,
           st.rating, st.reviews, st.rebook_pct, st.reliability, st.kept_pct, st.reliable, st.regular, s.service_name, s.price, s.price_per, s.modes, s.duration_minutes, s.extra_person_minutes,
           0.5 * CASE WHEN p_at IS NOT NULL
                   THEN 1 - least(abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at)) / 60) / 90, 1)
                   ELSE 1 - least(greatest(extract(epoch FROM (e.day + e.at) - v_now) / 60, 0) / (72 * 60), 1) END
         + 0.2 * CASE WHEN e.km IS NOT NULL THEN 1 - least(e.km / 15, 1) ELSE 0.5 END
         + 0.1 * CASE WHEN st.reviews >= 5 THEN greatest(0, least(1, (st.rating - 3) / 2)) ELSE 0.5 END
         + 0.1 * CASE WHEN st.rebook_pct IS NOT NULL THEN least(st.rebook_pct / 100, 1) ELSE 0.5 END
         + 0.1 * coalesce(st.reliability, 0.8)
         + 0.02 * least(e.fit, 6) / 6
         + CASE WHEN st.regular THEN 0.25 ELSE 0 END
         - CASE WHEN st.is_demo THEN 1 ELSE 0 END
         + random() * 0.01 AS score
      FROM pg_temp.engine_slots e
      JOIN stats st ON st.bid = e.bid
      JOIN public.services s ON s.id = e.sid
     WHERE e.in_window
  ),
  best AS (
    SELECT DISTINCT ON (bid) * FROM scored ORDER BY bid, score DESC
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'business_id', bid, 'business_name', business_name, 'slug', slug, 'city', city, 'logo_url', logo_url,
           'service_id', sid, 'service_name', service_name, 'people', v_people,
           'price', CASE WHEN price_per = 'person' THEN price * v_people ELSE price END, 'price_per', price_per, 'currency', currency,
           'minutes', duration_minutes + (v_people - 1) * coalesce(extra_person_minutes, duration_minutes),
           'mode', coalesce(p_mode, modes[1]),
           'date', day, 'time', to_char(at, 'HH24:MI'), 'starts', (day + at),
           'km', round(km, 1), 'rating', CASE WHEN reviews > 0 THEN rating END, 'reviews', reviews,
           'rebook_pct', rebook_pct, 'kept_pct', kept_pct, 'reliable', reliable, 'regular', regular, 'score', round(score::numeric, 4)
         ) ORDER BY score DESC), '[]'::jsonb)
    INTO v_rows
    FROM best;

  -- Three options, three different reasons.
  IF jsonb_array_length(v_rows) > 0 THEN
    v_first := v_rows->0;
    v_pick := jsonb_build_array(v_first || jsonb_build_object('label', CASE WHEN (v_first->>'regular')::boolean THEN 'regular' ELSE 'best' END));
    v_used := ARRAY[(v_first->>'business_id')::uuid];

    -- Earliest, when earlier than the best match.
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'starts') < (v_first->>'starts')
     ORDER BY x->>'starts', (x->>'score')::numeric DESC LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "earliest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END IF;

    -- Closest, when distance is known; otherwise top rated (5 reviews or more).
    r := NULL;
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND x->>'km' IS NOT NULL
     ORDER BY (x->>'km')::numeric LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "closest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    ELSE
      SELECT x INTO r FROM jsonb_array_elements(v_rows) x
       WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'reviews')::int >= 5
       ORDER BY (x->>'rating')::numeric DESC, (x->>'score')::numeric DESC LIMIT 1;
      IF r IS NOT NULL THEN
        v_pick := v_pick || jsonb_build_array(r || '{"label": "top_rated"}');
        v_used := v_used || (r->>'business_id')::uuid;
      END IF;
    END IF;

    -- Fill to three by score.
    FOR r IN SELECT x FROM jsonb_array_elements(v_rows) x WHERE (x->>'business_id')::uuid <> ALL (v_used) LOOP
      EXIT WHEN jsonb_array_length(v_pick) >= 3;
      v_pick := v_pick || jsonb_build_array(r || '{"label": "another"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END LOOP;
  END IF;

  -- Nothing in the window: the nearest times outside it, from up to two businesses.
  IF jsonb_array_length(v_pick) = 0 THEN
    SELECT coalesce(jsonb_agg(o ORDER BY o->>'starts'), '[]'::jsonb) INTO v_later
      FROM (
        SELECT DISTINCT ON (e.bid) jsonb_build_object(
                 'business_id', e.bid, 'business_name', b.business_name, 'slug', b.slug, 'service_id', e.sid,
                 'service_name', s.service_name, 'people', v_people, 'mode', coalesce(p_mode, s.modes[1]),
                 'date', e.day, 'time', to_char(e.at, 'HH24:MI'), 'starts', (e.day + e.at), 'km', round(e.km, 1),
                 'price', CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END, 'currency', b.currency,
                 'label', 'later') AS o
          FROM pg_temp.engine_slots e
          JOIN public.businesses b ON b.id = e.bid
          JOIN public.services s ON s.id = e.sid
         ORDER BY e.bid,
                  CASE WHEN p_at IS NOT NULL THEN abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at))) ELSE extract(epoch FROM (e.day + e.at)) END
      ) y
     LIMIT 2;
    SELECT coalesce(jsonb_agg(z), '[]'::jsonb) INTO v_later FROM (SELECT z FROM jsonb_array_elements(v_later) z LIMIT 2) q;
  END IF;

  RETURN jsonb_build_object(
    'options', v_pick,
    'later', coalesce(v_later, '[]'::jsonb),
    'matched', v_matched,
    'words', to_jsonb(v_tokens),
    'dates', to_jsonb(v_dates),
    'timezone', v_tz
  );
END;
$$;


-- 11. The Monday statement email carries the score line.
CREATE OR REPLACE FUNCTION public.queue_weekly_statements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  v_local timestamp;
  v_from date;
  v_stmt jsonb;
  v_payload jsonb;
  v_email text;
  v_profile boolean;
  v_email_off boolean;
  v_name text;
BEGIN
  FOR b IN
    SELECT * FROM public.businesses WHERE is_active = true AND launched_at IS NOT NULL
  LOOP
    BEGIN
      v_local := now() AT TIME ZONE b.timezone;
      CONTINUE WHEN extract(isodow FROM v_local) <> 1 OR v_local::time < time '09:00';
      v_from := v_local::date - 7;

      v_stmt := public.statement_week(b.id, v_from);
      -- A week with no visits sends nothing.
      CONTINUE WHEN (v_stmt #>> '{online,count}')::int + (v_stmt #>> '{added,count}')::int = 0;

      SELECT au.email, (pu.id IS NOT NULL), coalesce(pu.email_notifications, true) = false,
             NULLIF(trim(coalesce(pu.full_name, au.raw_user_meta_data->>'full_name')), '')
        INTO v_email, v_profile, v_email_off, v_name
        FROM auth.users au
        LEFT JOIN public.users pu ON pu.id = au.id
       WHERE au.id = b.user_id;

      v_payload := v_stmt || jsonb_build_object(
        'audience', 'business',
        'business_name', b.business_name,
        'name', v_name,
        'slug', b.slug,
        'timezone', b.timezone)
        || coalesce((SELECT jsonb_build_object('reliability', jsonb_build_object('score', r.score, 'shown', r.shown, 'badge', r.badge, 'kept_pct', r.kept_pct))
                       FROM public.business_reliability r WHERE r.business_id = b.id), '{}'::jsonb);

      IF v_profile THEN
        INSERT INTO public.inbox (user_id, audience, kind, business_id, payload, dedupe_key)
        VALUES (b.user_id, 'business', 'weekly_statement', b.id, v_payload,
                'weekly_statement:business:' || b.user_id || ':' || v_from)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;

      IF v_email IS NOT NULL AND NOT coalesce(v_email_off, false) THEN
        INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, payload, dedupe_key)
        VALUES ('weekly_statement', CASE WHEN v_profile THEN b.user_id END, v_email, b.id, v_payload,
                'weekly_statement:business:email:' || b.user_id || ':' || v_from)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END;
$$;


REVOKE EXECUTE ON FUNCTION public.appointments_timing() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reliability_compute(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reliability_notify(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reliability_update(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reliability_refresh(boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_reliability(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.business_trust() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reliability(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reliability_business(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_badge(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_excuse_cancellation(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_reliability(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_trust() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reliability(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reliability_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_badge(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_excuse_cancellation(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.queue_weekly_statements() FROM PUBLIC, anon, authenticated;

-- 12. Every night at 03:33 UTC, and once now without telling anyone.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reliability-nightly';
SELECT cron.schedule('reliability-nightly', '33 3 * * *', 'SELECT public.reliability_refresh()');

SELECT public.reliability_refresh(true);

NOTIFY pgrst, 'reload schema';

COMMIT;
