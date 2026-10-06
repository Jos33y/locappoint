-- Support, second pass: each ticket in a list carries its last message, so the inbox reads like
-- one. Needs support-desk.sql. Safe to run again.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.support_messages') IS NULL THEN
    RAISE EXCEPTION 'Run support-desk.sql first';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.support_card(t public.support_tickets)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', t.id,
    'number', t.number,
    'subject', t.subject,
    'category', t.category,
    'status', t.status,
    'side', t.side,
    'created_at', t.created_at,
    'last_message_at', t.last_message_at,
    'unread', t.last_from = 'admin' AND t.last_message_at > coalesce(t.user_seen_at, '-infinity'::timestamptz),
    'from_us', t.parent_id IS NOT NULL,
    'preview', (SELECT jsonb_build_object('from', CASE m.role WHEN 'admin' THEN 'support' ELSE 'you' END, 'body', left(regexp_replace(m.body, '\s+', ' ', 'g'), 140))
                  FROM public.support_messages m
                 WHERE m.ticket_id = t.id AND m.role IN ('user', 'admin')
                 ORDER BY m.created_at DESC, m.id DESC LIMIT 1),
    'booking', CASE WHEN a.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', a.id,
      'business_name', b.business_name,
      'service_name', s.service_name,
      'client_name', CASE WHEN t.side = 'business' THEN a.client_name END,
      'date', a.appointment_date,
      'time', to_char(a.appointment_time, 'HH24:MI'),
      'status', a.status) END
  )
    FROM (SELECT 1) one
    LEFT JOIN public.appointments a ON a.id = t.appointment_id
    LEFT JOIN public.businesses b ON b.id = a.business_id
    LEFT JOIN public.services s ON s.id = a.service_id;
$$;


REVOKE EXECUTE ON FUNCTION public.support_card(public.support_tickets) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
