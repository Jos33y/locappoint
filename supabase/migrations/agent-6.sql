-- The WhatsApp agent, round 6: booking news sent to a client by the notifier (paid, confirmed, declined,
-- moved, cancelled by the business) is added to their conversation with the agent, so the agent never
-- contradicts it. Only while the conversation is open (written to in the last 24 hours); the last 16
-- turns are kept, as before. Safe to run again.

BEGIN;

CREATE OR REPLACE FUNCTION public.wa_thread_note(p_phone text, p_text text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.wa_threads t
     SET history = (SELECT coalesce(jsonb_agg(y.x ORDER BY y.i), '[]'::jsonb) FROM (
                      SELECT h.x, h.i FROM jsonb_array_elements(coalesce(t.history, '[]'::jsonb)
                               || jsonb_build_array(jsonb_build_object('role', 'assistant', 'text', '[Locappoint] Sent to them: ' || left(coalesce(p_text, ''), 1000))))
                             WITH ORDINALITY AS h(x, i)
                       ORDER BY h.i DESC LIMIT 16) y)
   WHERE t.phone = p_phone AND t.updated_at > now() - interval '24 hours' AND length(coalesce(p_text, '')) > 0
$$;
REVOKE EXECUTE ON FUNCTION public.wa_thread_note(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_thread_note(text, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
