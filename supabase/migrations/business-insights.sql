-- Insights for a business owner, in one call: money, bookings, the booking funnel from the
-- page counts, where visitors come from, busiest times, top services and clients.
-- "Last N days" ends today in the business's own time zone and is compared with the N days before.
-- Safe to run again.

BEGIN;

-- The numbers for one stretch of days.
CREATE OR REPLACE FUNCTION public.insights_period(p_business_id uuid, p_from date, p_to date, p_now timestamp, p_tz text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH appts AS (
    SELECT a.*,
           a.appointment_date + a.appointment_time AS starts,
           coalesce(a.client_id::text, lower(nullif(trim(a.client_email), '')),
                    nullif(regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g'), ''),
                    lower(trim(a.client_name))) AS who
      FROM public.appointments a
     WHERE a.business_id = p_business_id
       AND a.appointment_date BETWEEN p_from AND p_to
  ),
  kept AS (
    SELECT * FROM appts WHERE status NOT IN ('cancelled')
  ),
  earned AS (
    SELECT * FROM kept WHERE status = 'completed' OR (status = 'confirmed' AND starts <= p_now)
  ),
  firsts AS (
    SELECT coalesce(a.client_id::text, lower(nullif(trim(a.client_email), '')),
                    nullif(regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g'), ''),
                    lower(trim(a.client_name))) AS who,
           min(a.appointment_date) AS first_day
      FROM public.appointments a
     WHERE a.business_id = p_business_id AND a.status <> 'cancelled'
     GROUP BY 1
  ),
  stats AS (
    SELECT event, sum(count)::int AS n
      FROM public.page_stats
     WHERE business_id = p_business_id AND day BETWEEN p_from AND p_to
     GROUP BY event
  )
  SELECT jsonb_build_object(
    'earned', coalesce((SELECT sum(price) FROM earned), 0),
    'earned_count', (SELECT count(*) FROM earned),
    'bookings', (SELECT count(*) FROM kept),
    'no_shows', (SELECT count(*) FROM kept WHERE status = 'no_show'),
    'no_show_value', coalesce((SELECT sum(price) FROM kept WHERE status = 'no_show'), 0),
    'cancelled_by_client', (SELECT count(*) FROM appts WHERE status = 'cancelled' AND cancelled_by = 'client'),
    'cancelled_by_business', (SELECT count(*) FROM appts WHERE status = 'cancelled' AND coalesce(cancelled_by, 'business') = 'business'),
    'clients', (SELECT count(DISTINCT who) FROM kept),
    'new_clients', (SELECT count(DISTINCT k.who) FROM kept k JOIN firsts f ON f.who = k.who WHERE f.first_day >= p_from),
    'views', coalesce((SELECT n FROM stats WHERE event = 'view'), 0),
    'starts', coalesce((SELECT n FROM stats WHERE event = 'start'), 0),
    'times', coalesce((SELECT n FROM stats WHERE event = 'time'), 0),
    'booked_online', (SELECT count(*) FROM public.appointments a
                       WHERE a.business_id = p_business_id AND a.source = 'web'
                         AND (a.created_at AT TIME ZONE p_tz)::date BETWEEN p_from AND p_to),
    -- For the funnel: only the days the page was being counted, so bookings never outnumber visits by accident.
    'booked_counted', (SELECT count(*) FROM public.appointments a
                        WHERE a.business_id = p_business_id AND a.source = 'web'
                          AND (a.created_at AT TIME ZONE p_tz)::date BETWEEN
                              greatest(p_from, (SELECT min(day) FROM public.page_stats WHERE business_id = p_business_id)) AND p_to)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.insights_period(uuid, date, date, timestamp, text) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.business_insights(p_business_id uuid, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_days integer := greatest(1, least(coalesce(p_days, 7), 366));
  v_tz text;
  v_country text;
  v_now timestamp;
  v_today date;
  v_from date;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can see insights' USING ERRCODE = '42501';
  END IF;

  SELECT b.timezone, b.country INTO v_tz, v_country FROM public.businesses b WHERE b.id = p_business_id;
  v_now := now() AT TIME ZONE v_tz;
  v_today := v_now::date;
  v_from := v_today - (v_days - 1);

  RETURN jsonb_build_object(
    'days', v_days,
    'from', v_from,
    'today', v_today,
    'country', v_country,
    'counting_since', (SELECT min(day) FROM public.page_stats WHERE business_id = p_business_id),
    'current', public.insights_period(p_business_id, v_from, v_today, v_now, v_tz),
    'previous', public.insights_period(p_business_id, v_from - v_days, v_from - 1, v_now, v_tz),

    'ahead', (
      SELECT jsonb_build_object('count', count(*), 'value', coalesce(sum(a.price), 0))
        FROM public.appointments a
       WHERE a.business_id = p_business_id
         AND a.status IN ('pending', 'confirmed')
         AND a.appointment_date + a.appointment_time > v_now
         AND a.appointment_date <= v_today + v_days
    ),

    'daily', (
      SELECT jsonb_agg(jsonb_build_object('day', d.day, 'earned', coalesce(e.earned, 0), 'bookings', coalesce(e.bookings, 0)) ORDER BY d.day)
        FROM generate_series(v_from, v_today, interval '1 day') AS d(day)
        LEFT JOIN (
          SELECT a.appointment_date AS day,
                 sum(a.price) FILTER (WHERE a.status = 'completed' OR (a.status = 'confirmed' AND a.appointment_date + a.appointment_time <= v_now)) AS earned,
                 count(*) AS bookings
            FROM public.appointments a
           WHERE a.business_id = p_business_id AND a.status <> 'cancelled'
             AND a.appointment_date BETWEEN v_from AND v_today
           GROUP BY a.appointment_date
        ) e ON e.day = d.day::date
    ),

    'sources', coalesce((
      SELECT jsonb_agg(jsonb_build_object('source', s.source, 'views', s.n) ORDER BY s.n DESC, s.source)
        FROM (SELECT source, sum(count)::int AS n FROM public.page_stats
               WHERE business_id = p_business_id AND event = 'view' AND day BETWEEN v_from AND v_today
               GROUP BY source) s
    ), '[]'::jsonb),

    'mobile_views', coalesce((
      SELECT sum(count)::int FROM public.page_stats
       WHERE business_id = p_business_id AND event = 'view' AND device = 'mobile' AND day BETWEEN v_from AND v_today
    ), 0),

    'hours', (
      SELECT jsonb_build_object('open', coalesce(extract(hour FROM min(h.start_time))::int, 9),
                                'close', coalesce(ceil(extract(epoch FROM max(h.end_time)) / 3600)::int, 19))
        FROM public.availability h
       WHERE h.business_id = p_business_id AND h.is_active = true
    ),

    'busiest', coalesce((
      SELECT jsonb_agg(jsonb_build_object('dow', x.dow, 'hour', x.hour, 'bookings', x.n))
        FROM (SELECT extract(isodow FROM a.appointment_date)::int AS dow, extract(hour FROM a.appointment_time)::int AS hour, count(*)::int AS n
                FROM public.appointments a
               WHERE a.business_id = p_business_id AND a.status <> 'cancelled'
                 AND a.appointment_date BETWEEN v_from AND v_today + v_days
               GROUP BY 1, 2) x
    ), '[]'::jsonb),

    'services', coalesce((
      SELECT jsonb_agg(jsonb_build_object('name', x.name, 'bookings', x.n, 'value', x.value) ORDER BY x.n DESC, x.value DESC, x.name)
        FROM (SELECT coalesce(s.service_name, 'Removed service') AS name, count(*)::int AS n, coalesce(sum(a.price), 0) AS value
                FROM public.appointments a
                LEFT JOIN public.services s ON s.id = a.service_id
               WHERE a.business_id = p_business_id AND a.status <> 'cancelled'
                 AND a.appointment_date BETWEEN v_from AND v_today
               GROUP BY 1) x
    ), '[]'::jsonb),

    'lead_hours', (
      SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ((a.appointment_date + a.appointment_time) AT TIME ZONE v_tz) - a.created_at) / 3600)::numeric, 1)
        FROM public.appointments a
       WHERE a.business_id = p_business_id AND a.source = 'web' AND a.status <> 'cancelled'
         AND (a.created_at AT TIME ZONE v_tz)::date BETWEEN v_from AND v_today
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.business_insights(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_insights(uuid, integer) TO authenticated;

COMMIT;
