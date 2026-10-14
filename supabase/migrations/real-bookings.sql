-- Launch fix 1.9: a booking the client made counts the same on every channel (web, WhatsApp, and later
-- Google and AI assistants). Owner-added bookings (manual, assistant) never count as real and never carry
-- the fee. One helper holds the rule; the live functions are patched in place, each old rule checked first.
-- The page funnel (insights_period: booked_online, booked_counted) stays web only on purpose.
-- Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_client_booking(p_source text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_source IS NOT NULL AND p_source NOT IN ('manual', 'assistant');
$$;

REVOKE EXECUTE ON FUNCTION public.is_client_booking(text) FROM PUBLIC, anon, authenticated;

DO $patch$
DECLARE
  p record;
  def text;
  found integer;
BEGIN
  FOR p IN
    SELECT * FROM (VALUES
      (1, 'public.real_booking_count(uuid)', 'AND a.source = ''web''', 'AND public.is_client_booking(a.source)', 1),
      (2, 'public.statement_week(uuid, date)', 'v.source IN (''web'', ''whatsapp'')', 'public.is_client_booking(v.source)', 3),
      (3, 'public.statement_week(uuid, date)', 'v.source = ''manual''', 'NOT public.is_client_booking(v.source)', 2),
      (4, 'public.business_insights(uuid, integer)', 'a.source = ''web'' AND a.status <> ''cancelled''', 'public.is_client_booking(a.source) AND a.status <> ''cancelled''', 1),
      (5, 'public.queue_visit_followups()', '(ap.source = ''web'' AND ap.client_email IS NOT NULL)', '(public.is_client_booking(ap.source) AND ap.client_email IS NOT NULL)', 1)
    ) AS t(n, fn, old_rule, new_rule, times)
    ORDER BY n
  LOOP
    def := pg_get_functiondef(p.fn::regprocedure);
    found := (length(def) - length(replace(def, p.old_rule, ''))) / length(p.old_rule);
    IF found = 0 AND position(p.new_rule IN def) > 0 THEN
      CONTINUE;
    END IF;
    IF found <> p.times THEN
      RAISE EXCEPTION 'real-bookings: % does not read as expected (% of % found); nothing changed', p.fn, found, p.times;
    END IF;
    EXECUTE replace(def, p.old_rule, p.new_rule);
  END LOOP;
END
$patch$;

COMMIT;
