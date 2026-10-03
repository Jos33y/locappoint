-- Admin overview: read-only views of the whole platform for Locappoint staff (users.is_admin).
-- Four functions, each refuses anyone who is not an admin. Nothing here changes data. Safe to run twice.

-- One screen: businesses, bookings, people, apps, messages and errors.
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Lisbon')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'businesses', (
      SELECT jsonb_build_object(
        'live', count(*) FILTER (WHERE b.launched_at IS NOT NULL AND b.is_active AND NOT b.is_demo),
        'setup', count(*) FILTER (WHERE b.launched_at IS NULL AND NOT b.is_demo),
        'paused', count(*) FILTER (WHERE b.launched_at IS NOT NULL AND NOT b.is_active AND NOT b.is_demo),
        'new_7d', count(*) FILTER (WHERE b.created_at > now() - interval '7 days' AND NOT b.is_demo),
        'by_city', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('city', c.city, 'count', c.n) ORDER BY c.n DESC)
            FROM (SELECT COALESCE(NULLIF(trim(x.city), ''), 'Not set') AS city, count(*) AS n
                    FROM public.businesses x WHERE NOT x.is_demo GROUP BY 1) c
        ), '[]'::jsonb)
      )
      FROM public.businesses b
    ),
    'bookings', (
      SELECT jsonb_build_object(
        'today', count(*) FILTER (WHERE a.appointment_date = v_today AND a.status IN ('pending', 'confirmed', 'completed')),
        'next_7d', count(*) FILTER (WHERE a.appointment_date > v_today AND a.appointment_date <= v_today + 7 AND a.status IN ('pending', 'confirmed')),
        'waiting', count(*) FILTER (WHERE a.status = 'pending' AND a.appointment_date >= v_today),
        'made_7d', count(*) FILTER (WHERE a.created_at > now() - interval '7 days'),
        'made_30d', count(*) FILTER (WHERE a.created_at > now() - interval '30 days'),
        'completed_30d', count(*) FILTER (WHERE a.status = 'completed' AND a.appointment_date > v_today - 30),
        'no_show_30d', count(*) FILTER (WHERE a.status = 'no_show' AND a.appointment_date > v_today - 30),
        'cancelled_30d', count(*) FILTER (WHERE a.status = 'cancelled' AND a.appointment_date > v_today - 30),
        'value_30d', COALESCE((
          SELECT jsonb_object_agg(v.currency, v.total)
            FROM (SELECT CASE WHEN bb.country = 'NG' THEN 'NGN' ELSE 'EUR' END AS currency, sum(aa.price) AS total
                    FROM public.appointments aa JOIN public.businesses bb ON bb.id = aa.business_id
                   WHERE aa.status IN ('completed', 'confirmed') AND aa.appointment_date > v_today - 30
                     AND aa.appointment_date <= v_today AND aa.price IS NOT NULL AND NOT bb.is_demo
                   GROUP BY 1) v
        ), '{}'::jsonb),
        'by_source_30d', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('source', s.source, 'count', s.n) ORDER BY s.n DESC)
            FROM (SELECT COALESCE(aa.source, 'unknown') AS source, count(*) AS n
                    FROM public.appointments aa WHERE aa.created_at > now() - interval '30 days' GROUP BY 1) s
        ), '[]'::jsonb)
      )
      FROM public.appointments a
      JOIN public.businesses b ON b.id = a.business_id
     WHERE NOT b.is_demo
    ),
    'people', (
      SELECT jsonb_build_object(
        'owners', count(*) FILTER (WHERE (u.user_type = 'business' OR EXISTS (SELECT 1 FROM public.businesses ob WHERE ob.user_id = u.id))),
        'clients', count(*) FILTER (WHERE NOT (u.user_type = 'business' OR EXISTS (SELECT 1 FROM public.businesses ob WHERE ob.user_id = u.id))),
        'new_7d', count(*) FILTER (WHERE u.created_at > now() - interval '7 days'),
        'new_30d', count(*) FILTER (WHERE u.created_at > now() - interval '30 days'),
        'deleted_30d', (SELECT count(*) FROM public.account_deletions d WHERE d.deleted_at > now() - interval '30 days')
      )
      FROM public.users u
     WHERE u.deleted_at IS NULL
    ),
    'apps', jsonb_build_object(
      'people_30d', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('platform', x.platform, 'version', x.version, 'people', x.n) ORDER BY x.n DESC)
          FROM (
            SELECT p.platform, p.version, count(DISTINCT p.user_id) AS n
              FROM (
                SELECT s.user_id,
                       CASE WHEN s.user_agent ~* 'android' THEN 'android' WHEN s.user_agent ~* 'iphone|ipad' THEN 'ios' ELSE 'other' END AS platform,
                       substring(s.user_agent FROM 'LocappointApp/([0-9A-Za-z.]+)') AS version
                  FROM auth.sessions s
                 WHERE s.user_agent LIKE '%LocappointApp/%'
                   AND COALESCE(s.updated_at, s.created_at) > now() - interval '30 days'
              ) p
             GROUP BY 1, 2
          ) x
      ), '[]'::jsonb),
      'phones_with_push', COALESCE((
        SELECT jsonb_object_agg(t.platform, t.n) FROM (SELECT platform, count(*) AS n FROM public.push_tokens GROUP BY 1) t
      ), '{}'::jsonb)
    ),
    'messages_7d', COALESCE((
      SELECT jsonb_object_agg(m.channel, m.counts)
        FROM (
          SELECT q.channel, jsonb_object_agg(q.status, q.n) AS counts
            FROM (SELECT channel, status, count(*) AS n FROM public.notification_queue
                   WHERE created_at > now() - interval '7 days' GROUP BY 1, 2) q
           GROUP BY q.channel
        ) m
    ), '{}'::jsonb),
    'errors_7d', (
      SELECT jsonb_build_object('distinct', count(*), 'times', COALESCE(sum(e.count), 0))
        FROM public.client_errors e WHERE e.last_seen_at > now() - interval '7 days'
    ),
    'waitlist', (SELECT count(*) FROM public.waitlist),
    'daily', (
      SELECT jsonb_agg(jsonb_build_object(
               'day', d::date,
               'bookings', (SELECT count(*) FROM public.appointments a JOIN public.businesses b ON b.id = a.business_id
                             WHERE NOT b.is_demo AND (a.created_at AT TIME ZONE 'Europe/Lisbon')::date = d::date),
               'signups', (SELECT count(*) FROM public.users u WHERE (u.created_at AT TIME ZONE 'Europe/Lisbon')::date = d::date)
             ) ORDER BY d)
        FROM generate_series(v_today - 29, v_today, interval '1 day') d
    )
  );
END;
$$;


-- Every business with how far it has come.
CREATE OR REPLACE FUNCTION public.admin_businesses()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Lisbon')::date;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'created_at') DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', b.id,
          'name', b.business_name,
          'slug', b.slug,
          'category', b.category,
          'category_detail', b.category_detail,
          'city', b.city,
          'country', b.country,
          'is_active', b.is_active,
          'is_demo', b.is_demo,
          'created_at', b.created_at,
          'launched_at', b.launched_at,
          'owner_name', u.full_name,
          'owner_email', u.email,
          'owner_phone', COALESCE(b.whatsapp, b.phone, u.phone),
          'has_logo', b.logo_url IS NOT NULL,
          'has_description', length(COALESCE(b.description, '')) > 0,
          'services', (SELECT count(*) FROM public.services s WHERE s.business_id = b.id AND s.is_active),
          'has_hours', EXISTS (SELECT 1 FROM public.availability h WHERE h.business_id = b.id AND h.is_active),
          'team', (SELECT count(*) FROM public.business_members m WHERE m.business_id = b.id AND m.status = 'active'),
          'bookings', (SELECT count(*) FROM public.appointments a WHERE a.business_id = b.id),
          'bookings_30d', (SELECT count(*) FROM public.appointments a WHERE a.business_id = b.id AND a.created_at > now() - interval '30 days'),
          'upcoming', (SELECT count(*) FROM public.appointments a WHERE a.business_id = b.id AND a.status IN ('pending', 'confirmed') AND a.appointment_date >= v_today),
          'last_booking_at', (SELECT max(a.created_at) FROM public.appointments a WHERE a.business_id = b.id),
          'rating', (SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.business_id = b.id AND r.status = 'published'),
          'reviews', (SELECT count(*) FROM public.reviews r WHERE r.business_id = b.id AND r.status = 'published'),
          'owner_last_seen', (SELECT au.last_sign_in_at FROM auth.users au WHERE au.id = b.user_id)
        ) AS row
          FROM public.businesses b
          LEFT JOIN public.users u ON u.id = b.user_id
      ) x
  ), '[]'::jsonb);
END;
$$;


-- Bookings across all businesses, newest first, searchable by client, email or business.
CREATE OR REPLACE FUNCTION public.admin_bookings(p_search text DEFAULT NULL, p_status text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_q text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_limit integer := greatest(1, least(COALESCE(p_limit, 50), 200));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH matched AS (
      SELECT a.*, b.business_name, b.slug, b.country, b.is_demo, s.service_name
        FROM public.appointments a
        JOIN public.businesses b ON b.id = a.business_id
        LEFT JOIN public.services s ON s.id = a.service_id
       WHERE (p_status IS NULL OR p_status = '' OR a.status = p_status)
         AND (v_q IS NULL
              OR a.client_name ILIKE '%' || v_q || '%'
              OR a.client_email ILIKE '%' || v_q || '%'
              OR b.business_name ILIKE '%' || v_q || '%')
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM matched),
      'rows', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', m.id,
                 'business', m.business_name,
                 'slug', m.slug,
                 'is_demo', m.is_demo,
                 'service', m.service_name,
                 'client_name', m.client_name,
                 'client_email', m.client_email,
                 'has_account', m.client_id IS NOT NULL,
                 'date', m.appointment_date,
                 'time', to_char(m.appointment_time, 'HH24:MI'),
                 'status', m.status,
                 'source', m.source,
                 'price', m.price,
                 'currency', CASE WHEN m.country = 'NG' THEN 'NGN' ELSE 'EUR' END,
                 'cancelled_by', m.cancelled_by,
                 'created_at', m.created_at
               ) ORDER BY m.created_at DESC)
          FROM (SELECT * FROM matched ORDER BY created_at DESC LIMIT v_limit OFFSET greatest(COALESCE(p_offset, 0), 0)) m
      ), '[]'::jsonb)
    )
  );
END;
$$;


-- Owners and clients: when they joined, how they sign in, and whether they use the phone app.
CREATE OR REPLACE FUNCTION public.admin_people(p_search text DEFAULT NULL, p_type text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_q text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_limit integer := greatest(1, least(COALESCE(p_limit, 50), 200));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  RETURN (
    WITH matched AS (
      SELECT u.*
        FROM public.users u
       WHERE u.deleted_at IS NULL
         AND (p_type IS NULL OR p_type = ''
              OR (p_type = 'business' AND (u.user_type = 'business' OR EXISTS (SELECT 1 FROM public.businesses ob WHERE ob.user_id = u.id)))
              OR (p_type = 'client' AND NOT (u.user_type = 'business' OR EXISTS (SELECT 1 FROM public.businesses ob WHERE ob.user_id = u.id))))
         AND (v_q IS NULL OR u.full_name ILIKE '%' || v_q || '%' OR u.email ILIKE '%' || v_q || '%')
    )
    SELECT jsonb_build_object(
      'total', (SELECT count(*) FROM matched),
      'rows', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                 'id', m.id,
                 'name', m.full_name,
                 'email', m.email,
                 -- Owning a business makes someone an owner, whatever they picked at sign-up.
                 'type', CASE WHEN m.user_type = 'business' OR EXISTS (SELECT 1 FROM public.businesses ob WHERE ob.user_id = m.id) THEN 'business' ELSE 'client' END,
                 'is_admin', m.is_admin,
                 'joined_at', m.created_at,
                 'last_sign_in_at', au.last_sign_in_at,
                 'providers', COALESCE(au.raw_app_meta_data->'providers', '[]'::jsonb),
                 'business', (SELECT b.business_name FROM public.businesses b WHERE b.user_id = m.id ORDER BY b.created_at LIMIT 1),
                 'bookings', (SELECT count(*) FROM public.appointments a WHERE a.client_id = m.id),
                 'app', (
                   SELECT jsonb_build_object(
                            'platform', CASE WHEN s.user_agent ~* 'android' THEN 'android' WHEN s.user_agent ~* 'iphone|ipad' THEN 'ios' ELSE 'other' END,
                            'version', substring(s.user_agent FROM 'LocappointApp/([0-9A-Za-z.]+)'),
                            'seen_at', COALESCE(s.updated_at, s.created_at))
                     FROM auth.sessions s
                    WHERE s.user_id = m.id AND s.user_agent LIKE '%LocappointApp/%'
                    ORDER BY COALESCE(s.updated_at, s.created_at) DESC
                    LIMIT 1),
                 'push_phones', (SELECT count(*) FROM public.push_tokens t WHERE t.user_id = m.id)
               ) ORDER BY m.created_at DESC)
          FROM (SELECT * FROM matched ORDER BY created_at DESC LIMIT v_limit OFFSET greatest(COALESCE(p_offset, 0), 0)) m
          LEFT JOIN auth.users au ON au.id = m.id
      ), '[]'::jsonb)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_businesses() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_bookings(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_people(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_businesses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bookings(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_people(text, text, integer, integer) TO authenticated;
