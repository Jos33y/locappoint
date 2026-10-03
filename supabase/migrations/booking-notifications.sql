-- Booking notifications: every booking change becomes an in-app item and an email.
-- In-app items live in public.inbox (read by the bell). Emails go through public.notification_queue
-- and the "notify" Edge Function, same as the welcome emails.
-- Needs notification-queue.sql first. Safe to run again: it replaces what it created.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.notification_queue') IS NULL THEN
    RAISE EXCEPTION 'Run notification-queue.sql first';
  END IF;
END;
$$;


-- The inbox. One row per person per event. People read their own rows and nothing else.

CREATE TABLE IF NOT EXISTS public.inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('client', 'business')),
  kind text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbox_user_feed ON public.inbox (user_id, audience, created_at DESC);
CREATE INDEX IF NOT EXISTS inbox_user_unread ON public.inbox (user_id, audience) WHERE read_at IS NULL;

ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inbox FROM anon, authenticated;
GRANT SELECT ON public.inbox TO authenticated;

DROP POLICY IF EXISTS inbox_read_own ON public.inbox;
CREATE POLICY inbox_read_own ON public.inbox
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Live unread count. Realtime only sends a person the rows the policy above lets them read.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inbox') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox;
  END IF;
END;
$$;


-- Marks items read. No ids means everything for that side of the app.

CREATE OR REPLACE FUNCTION public.mark_inbox_read(p_audience text, p_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH done AS (
    UPDATE public.inbox i
       SET read_at = now()
     WHERE i.user_id = auth.uid()
       AND i.audience = p_audience
       AND i.read_at IS NULL
       AND (p_ids IS NULL OR i.id = ANY (p_ids))
    RETURNING 1
  )
  SELECT count(*)::integer FROM done;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_inbox_read(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_inbox_read(text, uuid[]) TO authenticated;


-- Everything an email or an in-app item needs to describe one booking, as it is now.

CREATE OR REPLACE FUNCTION public.booking_notice_payload(a public.appointments)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'business_name', b.business_name,
    'slug', b.slug,
    'address', b.address,
    'city', b.city,
    'country', b.country,
    'timezone', b.timezone,
    'business_phone', b.phone,
    'business_whatsapp', b.whatsapp,
    'auto_confirm', b.auto_confirm,
    'cancel_cutoff_minutes', b.cancel_cutoff_minutes,
    'service_name', s.service_name,
    'staff_name', m.display_name,
    'date', a.appointment_date,
    'time', to_char(a.appointment_time, 'HH24:MI'),
    'duration_minutes', a.duration_minutes,
    'price', a.price,
    'status', a.status,
    'client_name', a.client_name,
    'client_phone', a.client_phone,
    'notes', a.notes,
    'cancelled_by', a.cancelled_by,
    'moved_from', to_char(a.rescheduled_from, 'YYYY-MM-DD"T"HH24:MI')
  )
    FROM public.businesses b
    LEFT JOIN public.services s ON s.id = a.service_id
    LEFT JOIN public.business_members m ON m.id = a.staff_id
   WHERE b.id = a.business_id;
$$;

REVOKE EXECUTE ON FUNCTION public.booking_notice_payload(public.appointments) FROM PUBLIC, anon, authenticated;


-- Sends one event to one side: an in-app item for every person on that side with an account,
-- and an email to each address. The business side is the owner plus the team member booked.

CREATE OR REPLACE FUNCTION public.send_booking_notice(a public.appointments, p_audience text, p_kind text, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload jsonb := public.booking_notice_payload(a);
  r record;
BEGIN
  IF p_audience = 'client' THEN
    IF a.client_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (a.client_id, 'client', p_kind, a.business_id, a.id, v_payload, p_kind || ':client:' || a.client_id || ':' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF a.client_email IS NOT NULL AND (a.client_id IS NOT NULL OR a.source = 'web') THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        p_kind,
        CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN a.client_id END,
        a.client_email, a.business_id, a.id,
        v_payload || jsonb_build_object('audience', 'client'),
        p_kind || ':client:email:' || lower(a.client_email) || ':' || p_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    RETURN;
  END IF;

  FOR r IN
    SELECT DISTINCT ON (x.user_id) x.user_id, au.email, (pu.id IS NOT NULL) AS has_profile
      FROM (
        SELECT b.user_id FROM public.businesses b WHERE b.id = a.business_id
        UNION ALL
        SELECT m.user_id FROM public.business_members m
         WHERE m.id = a.staff_id AND m.status = 'active' AND m.user_id IS NOT NULL
      ) x
      LEFT JOIN auth.users au ON au.id = x.user_id
      LEFT JOIN public.users pu ON pu.id = x.user_id
     WHERE x.user_id IS NOT NULL
  LOOP
    IF r.has_profile THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, appointment_id, payload, dedupe_key)
      VALUES (r.user_id, 'business', p_kind, a.business_id, a.id, v_payload, p_kind || ':business:' || r.user_id || ':' || p_key)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF r.email IS NOT NULL THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
      VALUES (
        p_kind,
        CASE WHEN r.has_profile THEN r.user_id END,
        r.email, a.business_id, a.id,
        v_payload || jsonb_build_object('audience', 'business'),
        p_kind || ':business:email:' || r.user_id || ':' || p_key
      )
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_booking_notice(public.appointments, text, text, text) FROM PUBLIC, anon, authenticated;


-- Decides what each booking change means and who hears about it.
-- Nobody is told about their own action. Wrapped so a notification problem can never stop a booking.
--
--   new booking, confirmed           client: booking_confirmed      business: booking_new
--   new booking, waiting              client: booking_requested      business: booking_request
--   business confirms                 client: booking_confirmed
--   business declines (was waiting)   client: booking_declined
--   business cancels (was confirmed)  client: booking_cancelled
--   client cancels                    business: booking_cancelled
--   business moves it                 client: booking_moved
--   client moves it                   business: booking_moved (or booking_request when it now waits)
--   the day before                    client: booking_reminder (from the scheduled job below)

CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_by_client boolean;
  v_key text;
BEGIN
  BEGIN
    v_by_client := auth.uid() IS NOT NULL
               AND auth.uid() = NEW.client_id
               AND NOT public.is_business_member(NEW.business_id);

    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('pending', 'confirmed') THEN
        RETURN NULL;
      END IF;
      v_key := NEW.id::text;
      IF NEW.status = 'confirmed' THEN
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
        IF v_by_client OR NEW.source = 'web' THEN
          PERFORM public.send_booking_notice(NEW, 'business', 'booking_new', v_key);
        END IF;
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_requested', v_key);
        PERFORM public.send_booking_notice(NEW, 'business', 'booking_request', v_key);
      END IF;
      RETURN NULL;
    END IF;

    -- Moved. Covers a move that also sends the booking back to waiting.
    IF NEW.rescheduled_at IS NOT NULL AND NEW.rescheduled_at IS DISTINCT FROM OLD.rescheduled_at
       AND NEW.status IN ('pending', 'confirmed') THEN
      v_key := NEW.id || ':' || extract(epoch FROM NEW.rescheduled_at)::bigint;
      IF v_by_client THEN
        PERFORM public.send_booking_notice(NEW, 'business',
          CASE WHEN NEW.status = 'pending' THEN 'booking_request' ELSE 'booking_moved' END, 'moved:' || v_key);
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client', 'booking_moved', v_key);
      END IF;
      RETURN NULL;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NULL;
    END IF;

    v_key := NEW.id || ':' || extract(epoch FROM coalesce(NEW.rescheduled_at, NEW.created_at))::bigint;

    IF NEW.status = 'confirmed' AND OLD.status = 'pending' AND NOT v_by_client THEN
      PERFORM public.send_booking_notice(NEW, 'client', 'booking_confirmed', v_key);
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
      IF NEW.cancelled_by = 'client' THEN
        PERFORM public.send_booking_notice(NEW, 'business', 'booking_cancelled', v_key);
      ELSE
        PERFORM public.send_booking_notice(NEW, 'client',
          CASE WHEN OLD.status = 'pending' THEN 'booking_declined' ELSE 'booking_cancelled' END, v_key);
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_booking_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_booking_change ON public.appointments;
CREATE TRIGGER notify_booking_change
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();


-- The day-before reminder. Only for confirmed bookings made or moved at least a day ahead,
-- and never later than two hours before, so a late run does not remind someone on their way.
-- A moved booking gets a fresh reminder for its new time.

DROP FUNCTION IF EXISTS public.queue_booking_reminders();

CREATE FUNCTION public.queue_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.appointments;
BEGIN
  FOR a IN
    SELECT ap.*
      FROM public.appointments ap
      JOIN public.businesses b ON b.id = ap.business_id
     WHERE ap.status = 'confirmed'
       AND ap.appointment_date BETWEEN current_date - 1 AND current_date + 2
       AND ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours' <= now()
       AND ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '2 hours' > now()
       AND coalesce(ap.rescheduled_at, ap.created_at)
           <= ((ap.appointment_date + ap.appointment_time) AT TIME ZONE b.timezone) - interval '24 hours'
  LOOP
    BEGIN
      PERFORM public.send_booking_notice(a, 'client', 'booking_reminder',
        a.id || ':' || to_char(a.appointment_date + a.appointment_time, 'YYYYMMDDHH24MI'));
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.queue_booking_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'booking-reminders';
SELECT cron.schedule('booking-reminders', '*/15 * * * *', 'SELECT public.queue_booking_reminders()');

COMMIT;
