-- The WhatsApp agent, round 4.
-- 1. Bookings made on WhatsApp are treated like bookings made on the website: with an email they get
--    the emails too (confirmation with the calendar invite, changes, reminders, receipts, on my way),
--    and they count as online bookings in the owner's Monday statement. Until now all of these looked
--    only at 'web'. The four live functions are patched in place, each condition checked first.
-- 2. wa_set_email: a client adds or corrects the email on a booking they made on WhatsApp, and the
--    booking as it stands is emailed to them once.
-- 3. wa_free_days gives the first and last free start of each day with examples between.
-- Safe to run again.

BEGIN;

DO $patch$
DECLARE
  p record;
  def text;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      ('public.send_booking_notice(public.appointments, text, text, text)', '(a.client_id IS NOT NULL OR a.source = ''web'')', '(a.client_id IS NOT NULL OR a.source IN (''web'', ''whatsapp''))', 1),
      ('public.issue_receipt(uuid, text, uuid)', '(a.client_id IS NOT NULL OR a.source = ''web'')', '(a.client_id IS NOT NULL OR a.source IN (''web'', ''whatsapp''))', 1),
      ('public.trip_notice(uuid, text)', '(a.client_id IS NOT NULL OR a.source = ''web'')', '(a.client_id IS NOT NULL OR a.source IN (''web'', ''whatsapp''))', 1),
      ('public.statement_week(uuid, date)', 'v.source = ''web''', 'v.source IN (''web'', ''whatsapp'')', 3)
    ) AS t(fn, old_rule, new_rule, times)
  LOOP
    def := pg_get_functiondef(p.fn::regprocedure);
    IF position(p.new_rule IN def) > 0 THEN
      CONTINUE;
    END IF;
    IF (length(def) - length(replace(def, p.old_rule, ''))) / length(p.old_rule) <> p.times THEN
      RAISE EXCEPTION 'agent-4: % does not read as expected; nothing changed', p.fn;
    END IF;
    EXECUTE replace(def, p.old_rule, p.new_rule);
  END LOOP;
END
$patch$;

CREATE OR REPLACE FUNCTION public.wa_set_email(p_phone text, p_appointment uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  a public.appointments;
  v_kind text;
  v_payload jsonb;
BEGIN
  IF NOT public.wa_mine(p_phone, p_appointment) THEN
    RAISE EXCEPTION 'That booking was not made from this WhatsApp' USING ERRCODE = '42501';
  END IF;
  IF length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'That email does not look right. Could you type it again?' USING ERRCODE = '22023';
  END IF;

  UPDATE public.appointments x
     SET client_email = v_email
    FROM public.businesses b
   WHERE x.id = p_appointment AND b.id = x.business_id
     AND x.status IN ('pending', 'confirmed')
     AND x.appointment_date + x.appointment_time > now() AT TIME ZONE b.timezone
  RETURNING x.* INTO a;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'That booking is over or cancelled' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.wa_threads SET client_email = v_email WHERE phone = p_phone;

  -- The booking as it stands, by email, once per address. Only the email: WhatsApp already has it.
  IF a.payment_status NOT IN ('awaiting', 'failed') THEN
    v_kind := CASE WHEN a.status = 'confirmed' THEN 'booking_confirmed' ELSE 'booking_requested' END;
    v_payload := public.booking_notice_payload(a);
    IF jsonb_array_length(coalesce(a.addons, '[]')) > 0 THEN
      v_payload := v_payload || jsonb_build_object(
        'service_name', concat_ws(' + ', v_payload->>'service_name', (SELECT string_agg(x->>'name', ' + ') FROM jsonb_array_elements(a.addons) x)));
    END IF;
    INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, appointment_id, payload, dedupe_key)
    VALUES (
      v_kind,
      CASE WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.client_id) THEN a.client_id END,
      v_email, a.business_id, a.id,
      v_payload || jsonb_build_object('audience', 'client'),
      v_kind || ':client:email:' || v_email || ':' || a.id || ':added'
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN public.wa_client_view(a.id) || jsonb_build_object('email', v_email);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.wa_set_email(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_set_email(text, uuid, text) TO service_role;

-- 3. "When are you free?" answers with the first and last free start of each day, how many there are,
--    and up to 8 examples spread across the day, so the agent never reads a pattern into a sample.
CREATE OR REPLACE FUNCTION public.wa_free_days(p_business uuid, p_service uuid, p_from date DEFAULT NULL, p_people integer DEFAULT 1)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('date', y.d) || y.t ORDER BY y.d), '[]'::jsonb) FROM (
    SELECT x.d, x.t FROM (
      SELECT g.d::date AS d,
             (SELECT jsonb_build_object('first', min(z.v), 'last', max(z.v), 'count', count(*),
                                        'examples', jsonb_agg(z.v ORDER BY z.v) FILTER (WHERE (z.n - 1) % ceil(z.c / 8.0)::int = 0))
                FROM (
                SELECT u.v, row_number() OVER (ORDER BY u.v) AS n, count(*) OVER () AS c FROM (
                  SELECT DISTINCT to_char(s.slot_time, 'HH24:MI') AS v
                    FROM public.get_available_slots(p_business, p_service, g.d::date, NULL, NULL, NULL, greatest(coalesce(p_people, 1), 1)) s) u) z) AS t
        FROM public.businesses b
        CROSS JOIN LATERAL generate_series(
               greatest(coalesce(p_from, (now() AT TIME ZONE b.timezone)::date), (now() AT TIME ZONE b.timezone)::date)::timestamp,
               (now() AT TIME ZONE b.timezone)::date + 20, interval '1 day') AS g(d)
       WHERE b.id = p_business AND b.is_active AND b.suspended_at IS NULL
         AND EXISTS (SELECT 1 FROM public.services s2 WHERE s2.id = p_service AND s2.business_id = b.id AND s2.is_active)) x
     WHERE (x.t->>'count')::int > 0
     ORDER BY x.d
     LIMIT 5) y
$$;
REVOKE EXECUTE ON FUNCTION public.wa_free_days(uuid, uuid, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_free_days(uuid, uuid, date, integer) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
