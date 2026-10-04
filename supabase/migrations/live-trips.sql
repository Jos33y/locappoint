-- Live trips for visits at the client's place. Staff tap "On my way"; the client sees minutes, never a
-- position: "About 15 min", then 10, then 3, then "Arrived". Tracking starts only on that tap and
-- ends on "Arrived" (or "Stop", or 90 minutes at most). No position is ever stored: the trip function
-- turns the phone's spot into minutes with Google and keeps only the expected arrival time.
-- Written only through the trip function (service role); read through trip_by_link and my_trips.
-- Needs maps-radius.sql. Safe to run again.

BEGIN;

-- 1. One trip per visit. Started again after a mistaken stop, never after arriving.
CREATE TABLE IF NOT EXISTS public.visit_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.business_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'on_way' CHECK (status IN ('on_way', 'arrived', 'stopped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  eta_at timestamptz NOT NULL,
  eta_source text NOT NULL DEFAULT 'route' CHECK (eta_source IN ('route', 'guess')),
  eta_checked_at timestamptz NOT NULL DEFAULT now(),
  steps jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS visit_trips_live ON public.visit_trips (started_at) WHERE status = 'on_way';

ALTER TABLE public.visit_trips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visit_trips FROM anon, authenticated;

-- 2. What anyone is shown: status, minutes, the time it should arrive, how late against the booking,
-- and when each step happened. Never a position.
CREATE OR REPLACE FUNCTION public.trip_view(t public.visit_trips)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'status', t.status,
    'started_at', t.started_at,
    'ended_at', t.ended_at,
    'eta_at', t.eta_at,
    'eta_time', to_char(t.eta_at AT TIME ZONE b.timezone, 'HH24:MI'),
    'minutes', CASE WHEN t.status = 'on_way' THEN greatest(1, ceil(extract(epoch FROM t.eta_at - now()) / 60))::integer END,
    'late_minutes', CASE WHEN t.status = 'on_way'
      THEN greatest(0, ceil(extract(epoch FROM t.eta_at - ((a.appointment_date + a.appointment_time) AT TIME ZONE b.timezone)) / 60))::integer END,
    'guess', t.eta_source = 'guess',
    'steps', t.steps,
    'by', m.display_name
  )
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.business_members m ON m.id = t.member_id
   WHERE a.id = t.appointment_id;
$$;

REVOKE EXECUTE ON FUNCTION public.trip_view(public.visit_trips) FROM PUBLIC, anon, authenticated;

-- 3. Telling the client. On the way: email, bell and push. 10 and 3 minutes, and arrived: push only.
-- Wrapped so a notification problem never stops a trip.
CREATE OR REPLACE FUNCTION public.trip_notice(p_trip uuid, p_step text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.visit_trips;
  a public.appointments;
  v_tz text;
  v_by text;
  v_kind text := CASE p_step WHEN 'on_way' THEN 'trip_on_way' WHEN 'arrived' THEN 'trip_arrived' ELSE 'trip_close' END;
  v_key text;
  v_payload jsonb;
  v_user boolean;
BEGIN
  BEGIN
    SELECT * INTO t FROM public.visit_trips WHERE id = p_trip;
    SELECT * INTO a FROM public.appointments WHERE id = t.appointment_id;
    IF a.id IS NULL THEN RETURN; END IF;
    SELECT b.timezone INTO v_tz FROM public.businesses b WHERE b.id = a.business_id;
    SELECT m.display_name INTO v_by FROM public.business_members m WHERE m.id = t.member_id;
    v_key := t.id || ':' || p_step || ':' || floor(extract(epoch FROM t.started_at))::bigint;
    v_payload := public.booking_notice_payload(a) || jsonb_build_object(
      'audience', 'client',
      'step', p_step,
      'minutes', greatest(1, ceil(extract(epoch FROM t.eta_at - now()) / 60))::integer,
      'eta', to_char(t.eta_at AT TIME ZONE coalesce(v_tz, 'Europe/Lisbon'), 'HH24:MI'),
      'by', v_by
    );
    v_user := a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id);

    IF p_step = 'on_way' THEN
      IF v_user THEN
        INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
        VALUES (a.client_id, 'client', v_kind, a.business_id, a.id, v_payload, 'trip:client:' || v_key)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
      IF a.client_email IS NOT NULL AND (a.client_id IS NOT NULL OR a.source = 'web') THEN
        INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
        VALUES (v_kind, CASE WHEN v_user THEN a.client_id END, a.client_email, a.business_id, a.id, v_payload, 'trip:email:' || v_key)
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
    END IF;

    IF v_user
       AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id AND u.push_enabled)
       AND EXISTS (SELECT 1 FROM public.push_tokens p WHERE p.user_id = a.client_id) THEN
      INSERT INTO public.notification_queue (kind, channel, recipient_user, business_id, appointment_id, payload, dedupe_key)
      VALUES (v_kind, 'push', a.client_id, a.business_id, a.id, v_payload, 'trip:push:' || v_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'trip notice % for % not sent: %', p_step, p_trip, SQLERRM;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trip_notice(uuid, text) FROM PUBLIC, anon, authenticated;

-- 4. The 10 and 3 minute steps, from the expected arrival. Passing both at once sends only the 3.
CREATE OR REPLACE FUNCTION public.trip_steps(p_trip uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.visit_trips;
  v_left numeric;
BEGIN
  SELECT * INTO t FROM public.visit_trips WHERE id = p_trip FOR UPDATE;
  IF NOT FOUND OR t.status <> 'on_way' THEN RETURN; END IF;
  v_left := extract(epoch FROM t.eta_at - now()) / 60;
  IF v_left <= 3 AND NOT t.steps ? '3' THEN
    UPDATE public.visit_trips
       SET steps = steps || jsonb_build_object('3', now()) || CASE WHEN steps ? '10' THEN '{}'::jsonb ELSE jsonb_build_object('10', now()) END
     WHERE id = t.id;
    PERFORM public.trip_notice(t.id, '3');
  ELSIF v_left <= 10 AND NOT t.steps ? '10' THEN
    UPDATE public.visit_trips SET steps = steps || jsonb_build_object('10', now()) WHERE id = t.id;
    PERFORM public.trip_notice(t.id, '10');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trip_steps(uuid) FROM PUBLIC, anon, authenticated;

-- 5. On my way. Only for a confirmed visit at the client's place, around its day.
CREATE OR REPLACE FUNCTION public.trip_start(p_appointment uuid, p_member uuid, p_seconds integer, p_source text DEFAULT 'route')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
  v_tz text;
  v_local timestamp;
  v_eta timestamptz := now() + make_interval(secs => least(greatest(coalesce(p_seconds, 0), 60), 14400));
  v_left numeric;
  v_steps jsonb := jsonb_build_object('on_way', now());
  t public.visit_trips;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE id = p_appointment FOR UPDATE;
  IF NOT FOUND OR a.mode <> 'at_client' THEN
    RAISE EXCEPTION 'This visit is not at the client''s place' USING ERRCODE = '22023';
  END IF;
  IF a.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Confirm the booking first' USING ERRCODE = '22023';
  END IF;
  SELECT b.timezone INTO v_tz FROM public.businesses b WHERE b.id = a.business_id;
  v_local := now() AT TIME ZONE coalesce(v_tz, 'Europe/Lisbon');
  IF a.appointment_date + a.appointment_time NOT BETWEEN v_local - interval '3 hours' AND v_local + interval '6 hours' THEN
    RAISE EXCEPTION 'You can say you are on your way from six hours before the visit' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.visit_trips x WHERE x.appointment_id = a.id AND x.status = 'arrived') THEN
    RAISE EXCEPTION 'You already arrived for this visit' USING ERRCODE = '22023';
  END IF;

  v_left := extract(epoch FROM v_eta - now()) / 60;
  IF v_left <= 10 THEN v_steps := v_steps || jsonb_build_object('10', now()); END IF;
  IF v_left <= 3 THEN v_steps := v_steps || jsonb_build_object('3', now()); END IF;

  INSERT INTO public.visit_trips AS x (appointment_id, business_id, member_id, status, started_at, ended_at, eta_at, eta_source, eta_checked_at, steps)
  VALUES (a.id, a.business_id, p_member, 'on_way', now(), NULL, v_eta, CASE WHEN p_source = 'guess' THEN 'guess' ELSE 'route' END, now(), v_steps)
  ON CONFLICT (appointment_id) DO UPDATE
    SET member_id = EXCLUDED.member_id, status = 'on_way', started_at = now(), ended_at = NULL,
        eta_at = EXCLUDED.eta_at, eta_source = EXCLUDED.eta_source, eta_checked_at = now(), steps = EXCLUDED.steps
  RETURNING * INTO t;

  PERFORM public.trip_notice(t.id, 'on_way');
  RETURN public.trip_view(t);
END;
$$;

-- 6. A new estimate while on the way (null: no new estimate, just the steps).
CREATE OR REPLACE FUNCTION public.trip_eta(p_appointment uuid, p_seconds integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.visit_trips;
BEGIN
  SELECT * INTO t FROM public.visit_trips WHERE appointment_id = p_appointment;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF t.status = 'on_way' AND p_seconds IS NOT NULL THEN
    UPDATE public.visit_trips
       SET eta_at = now() + make_interval(secs => least(greatest(p_seconds, 30), 14400)), eta_source = 'route', eta_checked_at = now()
     WHERE id = t.id;
  END IF;
  PERFORM public.trip_steps(t.id);
  SELECT * INTO t FROM public.visit_trips WHERE id = t.id;
  RETURN public.trip_view(t);
END;
$$;

-- 7. Arrived: the trip ends and the client is told. Stop: the trip ends quietly (started by mistake).
CREATE OR REPLACE FUNCTION public.trip_end(p_appointment uuid, p_arrived boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  t public.visit_trips;
BEGIN
  UPDATE public.visit_trips
     SET status = CASE WHEN p_arrived THEN 'arrived' ELSE 'stopped' END,
         ended_at = now(),
         steps = CASE WHEN p_arrived THEN steps || jsonb_build_object('arrived', now()) ELSE steps END
   WHERE appointment_id = p_appointment AND status = 'on_way'
  RETURNING * INTO t;
  IF NOT FOUND THEN
    SELECT * INTO t FROM public.visit_trips WHERE appointment_id = p_appointment;
    RETURN CASE WHEN t.id IS NULL THEN NULL ELSE public.trip_view(t) END;
  END IF;
  IF p_arrived THEN PERFORM public.trip_notice(t.id, 'arrived'); END IF;
  RETURN public.trip_view(t);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trip_start(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trip_eta(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trip_end(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trip_start(uuid, uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.trip_eta(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.trip_end(uuid, boolean) TO service_role;

-- 8. Every minute: the 10 and 3 minute steps arrive even when the staff phone is locked, and a trip
-- that was never ended stops after 90 minutes, or once the visit is no longer confirmed.
CREATE OR REPLACE FUNCTION public.trips_tick()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT t.id, t.started_at, a.status AS visit
      FROM public.visit_trips t JOIN public.appointments a ON a.id = t.appointment_id
     WHERE t.status = 'on_way'
  LOOP
    IF r.started_at < now() - interval '90 minutes' OR r.visit <> 'confirmed' THEN
      UPDATE public.visit_trips SET status = 'stopped', ended_at = now() WHERE id = r.id;
    ELSE
      PERFORM public.trip_steps(r.id);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trips_tick() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'trips-every-minute';
SELECT cron.schedule('trips-every-minute', '* * * * *', $job$SELECT public.trips_tick() WHERE EXISTS (SELECT 1 FROM public.visit_trips WHERE status = 'on_way');$job$);

-- 9. Reading a trip: the client through the manage link, or signed in (client or the business).
-- A stopped trip, or one from more than 12 hours ago, shows as no trip.
CREATE OR REPLACE FUNCTION public.trip_by_link(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.trip_view(t)
    FROM public.booking_links l
    JOIN public.visit_trips t ON t.appointment_id = l.appointment_id
   WHERE l.token = p_token AND length(p_token) >= 32
     AND t.status <> 'stopped' AND t.started_at > now() - interval '12 hours';
$$;

CREATE OR REPLACE FUNCTION public.my_trips(p_ids uuid[])
RETURNS TABLE (appointment_id uuid, trip jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.appointment_id, public.trip_view(t)
    FROM public.visit_trips t
    JOIN public.appointments a ON a.id = t.appointment_id
   WHERE t.appointment_id = ANY (coalesce(p_ids, '{}'))
     AND cardinality(p_ids) <= 50
     AND auth.uid() IS NOT NULL
     AND (a.client_id = auth.uid() OR public.is_business_member(a.business_id))
     AND t.status <> 'stopped' AND t.started_at > now() - interval '12 hours';
$$;

REVOKE EXECUTE ON FUNCTION public.trip_by_link(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_trips(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trip_by_link(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_trips(uuid[]) TO authenticated;

COMMIT;
