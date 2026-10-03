-- Weekly statement: last Monday to Sunday in the business's own time. Visits booked on Locappoint, what
-- the fee would have been, and what is owed: nothing during the beta. Walk-ins never carry a fee.
-- Monday from 09:00 business time it lands in the owner's bell and, unless email is off, their inbox.
-- Safe to run again.

BEGIN;

-- The business fee from the pricing model, before VAT. Portugal only until other currencies are priced.
CREATE OR REPLACE FUNCTION public.statement_fee(p_price numeric, p_country text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_country IS DISTINCT FROM 'PT' THEN NULL
    WHEN coalesce(p_price, 0) <= 0 THEN 0
    ELSE round(p_price * 0.029 + 0.20, 2)
  END;
$$;

-- One week from its Monday. A visit is completed, or confirmed and already over.
CREATE OR REPLACE FUNCTION public.statement_week(p_business_id uuid, p_from date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH b AS (
    SELECT id, country, timezone FROM public.businesses WHERE id = p_business_id
  ),
  visits AS (
    SELECT a.source, a.price
      FROM public.appointments a
      JOIN b ON b.id = a.business_id
     WHERE a.appointment_date BETWEEN p_from AND p_from + 6
       AND (a.status = 'completed'
            OR (a.status = 'confirmed'
                AND a.appointment_date + a.appointment_time + make_interval(mins => a.duration_minutes) <= now() AT TIME ZONE b.timezone))
  )
  SELECT jsonb_build_object(
    'from', p_from,
    'to', p_from + 6,
    'country', (SELECT country FROM b),
    'online', jsonb_build_object(
      'count', count(*) FILTER (WHERE v.source = 'web'),
      'value', coalesce(sum(v.price) FILTER (WHERE v.source = 'web'), 0)),
    'added', jsonb_build_object(
      'count', count(*) FILTER (WHERE v.source = 'manual'),
      'value', coalesce(sum(v.price) FILTER (WHERE v.source = 'manual'), 0)),
    'fee', CASE WHEN (SELECT country FROM b) = 'PT'
                THEN coalesce(sum(public.statement_fee(v.price, 'PT')) FILTER (WHERE v.source = 'web'), 0) END,
    'due', 0,
    'beta', true
  )
  FROM visits v;
$$;

-- For the owner in Insights. 1 is last week, 2 the week before, back to a year.
CREATE OR REPLACE FUNCTION public.week_statement(p_business_id uuid, p_weeks_back integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_back integer := greatest(1, least(coalesce(p_weeks_back, 1), 52));
  v_tz text;
  v_since date;
  v_from date;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can see statements' USING ERRCODE = '42501';
  END IF;

  SELECT b.timezone, (coalesce(b.launched_at, b.created_at) AT TIME ZONE b.timezone)::date
    INTO v_tz, v_since
    FROM public.businesses b WHERE b.id = p_business_id;

  v_from := date_trunc('week', now() AT TIME ZONE v_tz)::date - 7 * v_back;

  RETURN public.statement_week(p_business_id, v_from) || jsonb_build_object(
    'weeks_back', v_back,
    'older', v_back < 52 AND v_from > v_since
  );
END;
$$;

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
        'timezone', b.timezone);

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

REVOKE EXECUTE ON FUNCTION public.statement_fee(numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.statement_week(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_weekly_statements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.week_statement(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.week_statement(uuid, integer) TO authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'weekly-statements';
SELECT cron.schedule('weekly-statements', '9 * * * *', 'SELECT public.queue_weekly_statements()');

COMMIT;
