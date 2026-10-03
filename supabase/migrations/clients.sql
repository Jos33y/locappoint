-- Clients: everyone who booked a business, built from its bookings, plus private notes the team keeps.
-- One client per phone number where there is one, else email, else account, else name.
-- The owner sees every client; staff see the clients they have served. Safe to run again.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_notes (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_key text NOT NULL CHECK (client_key ~ '^[penu]:.{1,200}$'),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  PRIMARY KEY (business_id, client_key)
);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_notes FROM anon, authenticated;


-- The same rule lives in src/services/clients.js; change both together.
CREATE OR REPLACE FUNCTION public.client_key(p_phone text, p_email text, p_client_id uuid, p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 6 THEN 'p:' || right(regexp_replace(p_phone, '\D', '', 'g'), 9)
    WHEN nullif(trim(p_email), '') IS NOT NULL THEN 'e:' || lower(trim(p_email))
    WHEN p_client_id IS NOT NULL THEN 'u:' || p_client_id::text
    ELSE 'n:' || lower(trim(coalesce(p_name, '')))
  END
$$;


-- Every booking the caller may see, with what became of it. Late cancel: the client cancelled in the last 24 hours before.
CREATE OR REPLACE FUNCTION public.client_visits(p_business_id uuid)
RETURNS TABLE (
  client_key text, id uuid, client_name text, client_phone text, client_email text,
  service_id uuid, staff_id uuid, appointment_date date, appointment_time time, price numeric,
  status text, source text, outcome text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.client_key(a.client_phone, a.client_email, a.client_id, a.client_name),
         a.id, a.client_name, a.client_phone, a.client_email, a.service_id, a.staff_id,
         a.appointment_date, a.appointment_time, a.price, a.status, a.source,
         CASE
           WHEN a.status = 'completed' THEN 'came'
           WHEN a.status = 'confirmed'
                AND a.appointment_date + a.appointment_time + coalesce(a.duration_minutes, 0) * interval '1 minute' <= now() AT TIME ZONE b.timezone THEN 'came'
           WHEN a.status = 'no_show' THEN 'no_show'
           WHEN a.status = 'cancelled' AND a.cancelled_by = 'client'
                AND a.cancelled_at >= (a.appointment_date + a.appointment_time) AT TIME ZONE b.timezone - interval '24 hours' THEN 'late_cancel'
           WHEN a.status = 'cancelled' THEN 'cancelled'
           ELSE 'upcoming'
         END,
         a.created_at
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
   WHERE a.business_id = p_business_id
     AND (public.is_business_owner(p_business_id) OR a.staff_id = public.my_member_id(p_business_id))
$$;


-- The Clients list: one row per client with the figures that decide who to call.
CREATE OR REPLACE FUNCTION public.business_clients(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date;
BEGIN
  IF NOT public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Only the team can see clients' USING ERRCODE = '42501';
  END IF;
  SELECT (now() AT TIME ZONE b.timezone)::date INTO v_today FROM public.businesses b WHERE b.id = p_business_id;

  RETURN coalesce((
    WITH v AS (SELECT * FROM public.client_visits(p_business_id) WHERE client_key <> 'n:'),
    latest AS (
      SELECT DISTINCT ON (client_key) client_key, client_name, service_id, staff_id
        FROM v ORDER BY client_key, appointment_date DESC, appointment_time DESC
    ),
    agg AS (
      SELECT v.client_key,
             (array_agg(v.client_phone ORDER BY v.appointment_date DESC) FILTER (WHERE nullif(v.client_phone, '') IS NOT NULL))[1] AS phone,
             (array_agg(v.client_email ORDER BY v.appointment_date DESC) FILTER (WHERE nullif(v.client_email, '') IS NOT NULL))[1] AS email,
             count(*) FILTER (WHERE outcome = 'came') AS visits,
             count(*) FILTER (WHERE outcome = 'no_show') AS no_shows,
             count(*) FILTER (WHERE outcome = 'late_cancel') AS late_cancels,
             coalesce(sum(price) FILTER (WHERE outcome = 'came'), 0) AS spent,
             min(appointment_date) FILTER (WHERE outcome = 'came') AS first_visit,
             max(appointment_date) FILTER (WHERE outcome = 'came') AS last_visit,
             min(appointment_date + appointment_time) FILTER (WHERE outcome = 'upcoming' AND status IN ('pending', 'confirmed')) AS next_at,
             max(appointment_date) AS last_seen,
             (array_agg(outcome ORDER BY appointment_date DESC, appointment_time DESC)
               FILTER (WHERE outcome IN ('came', 'no_show', 'late_cancel')))[1:12] AS recent
        FROM v GROUP BY v.client_key
    )
    SELECT jsonb_agg(jsonb_build_object(
             'key', a.client_key,
             'name', coalesce(nullif(trim(l.client_name), ''), 'Client'),
             'phone', a.phone,
             'email', a.email,
             'visits', a.visits,
             'no_shows', a.no_shows,
             'late_cancels', a.late_cancels,
             'reliability', CASE WHEN a.visits + a.no_shows + a.late_cancels >= 2
                                 THEN round(100.0 * a.visits / (a.visits + a.no_shows + a.late_cancels)) END,
             'spent', a.spent,
             'first_visit', a.first_visit,
             'last_visit', a.last_visit,
             'next_at', a.next_at,
             'gap_days', g.gap,
             'due_on', CASE WHEN g.gap IS NOT NULL AND a.next_at IS NULL THEN a.last_visit + g.gap END,
             'recent', coalesce(to_jsonb(a.recent), '[]'::jsonb),
             'service_id', l.service_id,
             'staff_id', l.staff_id,
             'has_note', EXISTS (SELECT 1 FROM public.client_notes n WHERE n.business_id = p_business_id AND n.client_key = a.client_key))
           ORDER BY coalesce(a.next_at::date, a.last_seen) DESC, l.client_name)
      FROM agg a
      JOIN latest l ON l.client_key = a.client_key
      CROSS JOIN LATERAL (
        SELECT CASE WHEN a.visits >= 2 AND a.last_visit > a.first_visit
                    THEN greatest(7, round((a.last_visit - a.first_visit)::numeric / (a.visits - 1))::int) END AS gap
      ) g
  ), '[]'::jsonb);
END;
$$;


-- One client: their bookings, newest first, and the note.
CREATE OR REPLACE FUNCTION public.client_history(p_business_id uuid, p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Only the team can see clients' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'note', (SELECT jsonb_build_object('body', n.body, 'updated_at', n.updated_at)
               FROM public.client_notes n WHERE n.business_id = p_business_id AND n.client_key = p_key),
    'visits', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', v.id, 'date', v.appointment_date, 'time', to_char(v.appointment_time, 'HH24:MI'),
               'service', s.service_name, 'staff', m.display_name, 'price', v.price,
               'status', v.status, 'outcome', v.outcome, 'source', v.source)
             ORDER BY v.appointment_date DESC, v.appointment_time DESC)
        FROM (SELECT * FROM public.client_visits(p_business_id) WHERE client_key = p_key
               ORDER BY appointment_date DESC, appointment_time DESC LIMIT 50) v
        LEFT JOIN public.services s ON s.id = v.service_id
        LEFT JOIN public.business_members m ON m.id = v.staff_id), '[]'::jsonb)
  );
END;
$$;


-- Anyone on the team can keep a note; an empty note removes it.
CREATE OR REPLACE FUNCTION public.save_client_note(p_business_id uuid, p_key text, p_body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Only the team can keep client notes' USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(coalesce(p_body, '')), '') IS NULL THEN
    DELETE FROM public.client_notes WHERE business_id = p_business_id AND client_key = p_key;
    RETURN;
  END IF;
  IF char_length(trim(p_body)) > 2000 THEN
    RAISE EXCEPTION 'Keep the note under 2000 characters' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.client_notes (business_id, client_key, body, updated_by)
  VALUES (p_business_id, p_key, trim(p_body), auth.uid())
  ON CONFLICT (business_id, client_key) DO UPDATE
    SET body = excluded.body, updated_at = now(), updated_by = excluded.updated_by;
END;
$$;


REVOKE EXECUTE ON FUNCTION public.client_key(text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_key(text, text, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.client_visits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.business_clients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_clients(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.client_history(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_history(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.save_client_note(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_client_note(uuid, text, text) TO authenticated;

COMMIT;
