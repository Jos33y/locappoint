-- The gold badge ("Verified"): the owner's ID checked by Stripe Identity (document and selfie, the
-- images stay with Stripe, we keep only the result), a 30 to 60 second video from the street sign
-- to inside the place (or a 10 minute video call for businesses with no place), and a person at
-- Locappoint who approves it. Lasts 12 months; a new address needs a new video; an upheld safety
-- report or a pause hides it at once; staff can remove it with a note. Independent of the blue
-- Reliable badge; no ranking boost. Videos sit in a private bucket and go once we decide.
-- Needs reliability.sql, support-desk.sql, onboarding-a.sql. Safe to run again.

BEGIN;

-- 1. Private storage for the walk-through videos: the owner uploads to their business folder,
--    staff watch, either deletes. Nobody else can read them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-videos', 'verification-videos', false, 52428800, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS verification_videos_owner_insert ON storage.objects;
CREATE POLICY verification_videos_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-videos' AND public.owns_media_path(name));

DROP POLICY IF EXISTS verification_videos_read ON storage.objects;
CREATE POLICY verification_videos_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification-videos' AND (public.owns_media_path(name) OR public.is_admin()));

DROP POLICY IF EXISTS verification_videos_delete ON storage.objects;
CREATE POLICY verification_videos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'verification-videos' AND (public.owns_media_path(name) OR public.is_admin()));

-- 2. One row per business: the ID check, the place check, our decision.
CREATE TABLE IF NOT EXISTS public.business_verifications (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'submitted', 'approved', 'rejected', 'expired')),
  identity_status text NOT NULL DEFAULT 'none' CHECK (identity_status IN ('none', 'pending', 'verified', 'failed')),
  identity_session text,
  identity_attempts integer NOT NULL DEFAULT 0,
  identity_error text,
  identity_verified_at timestamptz,
  place_kind text CHECK (place_kind IS NULL OR place_kind IN ('video', 'call')),
  video_path text,
  video_at timestamptz,
  call_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  approved_at timestamptz,
  verified_until timestamptz,
  place_address text,
  expired_reason text CHECK (expired_reason IS NULL OR expired_reason IN ('year', 'address')),
  removed_at timestamptz,
  removed_note text,
  removed_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_verifications FROM anon, authenticated;

-- 3. Does the business show gold right now. Hidden at once for a pause, a page taken down, an
--    upheld safety report in 180 days, a removal, or the year running out.
CREATE OR REPLACE FUNCTION public.verification_gold(p_business uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.business_verifications v
      JOIN public.businesses b ON b.id = v.business_id
     WHERE v.business_id = p_business
       AND v.status = 'approved' AND v.identity_status = 'verified'
       AND v.removed_at IS NULL AND v.verified_until > now()
       AND b.is_active AND b.suspended_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.support_tickets t
          WHERE t.business_id = b.id AND t.side = 'client' AND t.outcome = 'upheld' AND t.category = 'safety'
            AND coalesce(t.resolved_at, t.updated_at) >= now() - interval '180 days'))
$$;

-- 4. Tell the owner, in the bell and by email. Never blocks what called it.
CREATE OR REPLACE FUNCTION public.verification_notify(p_business uuid, p_event text, p_extra jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  v public.business_verifications;
  v_email text;
  v_on boolean;
  v_profile boolean;
  v_payload jsonb;
  v_key text;
BEGIN
  BEGIN
    SELECT * INTO b FROM public.businesses WHERE id = p_business;
    SELECT * INTO v FROM public.business_verifications WHERE business_id = p_business;
    SELECT u.email, coalesce(u.email_notifications, true), true INTO v_email, v_on, v_profile FROM public.users u WHERE u.id = b.user_id;
    v_payload := jsonb_build_object('audience', 'business', 'event', p_event, 'business_name', b.business_name, 'slug', b.slug,
                                    'verified_until', v.verified_until, 'reason', v.expired_reason) || coalesce(p_extra, '{}'::jsonb);
    v_key := 'verification:' || p_business || ':' || p_event || ':' || coalesce(p_extra->>'reason', '') || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS');
    IF coalesce(v_profile, false) THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, payload, dedupe_key)
      VALUES (b.user_id, 'business', 'verification', b.id, v_payload, v_key || ':inbox')
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
    IF v_email IS NOT NULL AND v_on THEN
      INSERT INTO public.notification_queue (kind, recipient_user, recipient_email, business_id, payload, dedupe_key)
      VALUES ('verification', b.user_id, v_email, b.id, v_payload, v_key || ':email')
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'verification notice for % not sent: %', p_business, SQLERRM;
  END;
END;
$$;

-- 5. Both checks done: into our queue. Called after the ID check and after the place step.
CREATE OR REPLACE FUNCTION public.verification_ready(p_business uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.business_verifications
     SET status = 'submitted', submitted_at = now(), updated_at = now()
   WHERE business_id = p_business
     AND status IN ('none', 'rejected', 'expired')
     AND identity_status = 'verified'
     AND (video_path IS NOT NULL OR call_at IS NOT NULL);
END;
$$;

-- What the owner sees on the Verified page.
CREATE OR REPLACE FUNCTION public.verification_view(p_business uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'status', coalesce(v.status, 'none'),
    'gold', public.verification_gold(b.id),
    'identity', jsonb_build_object('status', coalesce(v.identity_status, 'none'), 'attempts', coalesce(v.identity_attempts, 0),
                                   'left', greatest(0, 3 - coalesce(v.identity_attempts, 0)), 'error', v.identity_error, 'at', v.identity_verified_at),
    'place', jsonb_build_object('kind', v.place_kind, 'video', v.video_path IS NOT NULL, 'video_at', v.video_at, 'call_at', v.call_at,
                                'has_address', length(trim(coalesce(b.address, ''))) > 0, 'address', b.address),
    'submitted_at', v.submitted_at, 'review_note', v.review_note, 'reviewed_at', v.reviewed_at,
    'approved_at', v.approved_at, 'verified_until', v.verified_until, 'expired_reason', v.expired_reason,
    'removed', v.removed_at IS NOT NULL, 'removed_note', v.removed_note,
    'paused', b.suspended_at IS NOT NULL)
    FROM public.businesses b
    LEFT JOIN public.business_verifications v ON v.business_id = b.id
   WHERE b.id = p_business
$$;

CREATE OR REPLACE FUNCTION public.my_verification(p_business uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_business_owner(p_business) THEN
    RAISE EXCEPTION 'Only the owner can see this' USING ERRCODE = '42501';
  END IF;
  RETURN public.verification_view(p_business);
END;
$$;

-- 6. The ID check, written only by the verify function (service role) from what Stripe says.
--    p_new counts an attempt; three at most, then Support.
CREATE OR REPLACE FUNCTION public.verification_identity(p_business uuid, p_session text, p_status text, p_error text DEFAULT NULL, p_new boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v public.business_verifications;
BEGIN
  IF p_status NOT IN ('pending', 'verified', 'failed') THEN
    RAISE EXCEPTION 'Unknown status' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.business_verifications (business_id) VALUES (p_business) ON CONFLICT (business_id) DO NOTHING;
  SELECT * INTO v FROM public.business_verifications WHERE business_id = p_business FOR UPDATE;
  IF v.identity_status = 'verified' AND p_status <> 'verified' THEN
    RETURN public.verification_view(p_business);
  END IF;
  IF p_new AND v.identity_attempts >= 3 THEN
    RAISE EXCEPTION 'Three tries used. Write to us in Support and we will help.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.business_verifications
     SET identity_session = coalesce(p_session, identity_session),
         identity_status = p_status,
         identity_error = CASE WHEN p_status = 'failed' THEN left(p_error, 300) END,
         identity_attempts = identity_attempts + CASE WHEN p_new THEN 1 ELSE 0 END,
         identity_verified_at = CASE WHEN p_status = 'verified' THEN coalesce(identity_verified_at, now()) END,
         updated_at = now()
   WHERE business_id = p_business;
  PERFORM public.verification_ready(p_business);
  RETURN public.verification_view(p_business);
END;
$$;

-- 7. The place step, by the owner: the uploaded video (already in their folder), or a call when the
--    business has no address. Returns the old video's path so the page can delete it.
CREATE OR REPLACE FUNCTION public.submit_verification_place(p_business uuid, p_kind text, p_path text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  b public.businesses;
  v public.business_verifications;
  v_old text;
BEGIN
  IF NOT public.is_business_owner(p_business) THEN
    RAISE EXCEPTION 'Only the owner can do this' USING ERRCODE = '42501';
  END IF;
  IF p_kind NOT IN ('video', 'call') THEN
    RAISE EXCEPTION 'A video or a call' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business;
  INSERT INTO public.business_verifications (business_id) VALUES (p_business) ON CONFLICT (business_id) DO NOTHING;
  SELECT * INTO v FROM public.business_verifications WHERE business_id = p_business FOR UPDATE;
  IF v.status = 'approved' THEN
    RAISE EXCEPTION 'You are already verified. If something changed, tell us in Support.' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'call' AND length(trim(coalesce(b.address, ''))) > 0 THEN
    RAISE EXCEPTION 'Businesses with a place send a short video' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'video' THEN
    IF p_path IS NULL OR split_part(p_path, '/', 1) <> p_business::text OR split_part(p_path, '/', 3) <> ''
       OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'verification-videos' AND o.name = p_path) THEN
      RAISE EXCEPTION 'The video did not arrive. Try the upload again.' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_old := CASE WHEN v.video_path IS DISTINCT FROM p_path THEN v.video_path END;
  UPDATE public.business_verifications
     SET place_kind = p_kind,
         video_path = CASE WHEN p_kind = 'video' THEN p_path END,
         video_at = CASE WHEN p_kind = 'video' THEN now() END,
         call_at = CASE WHEN p_kind = 'call' THEN now() END,
         status = CASE WHEN status = 'submitted' THEN 'none' ELSE status END,
         updated_at = now()
   WHERE business_id = p_business;
  PERFORM public.verification_ready(p_business);
  RETURN public.verification_view(p_business) || jsonb_build_object('delete_path', v_old);
END;
$$;

-- 8. A new address needs a new video: the badge waits until we see the new place.
CREATE OR REPLACE FUNCTION public.businesses_verification_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.address IS DISTINCT FROM OLD.address
     AND EXISTS (SELECT 1 FROM public.business_verifications v WHERE v.business_id = NEW.id AND v.status = 'approved' AND v.place_kind = 'video'
                    AND v.place_address IS DISTINCT FROM NEW.address) THEN
    UPDATE public.business_verifications
       SET status = 'expired', expired_reason = 'address', video_path = NULL, video_at = NULL, updated_at = now()
     WHERE business_id = NEW.id;
    PERFORM public.verification_notify(NEW.id, 'expired', jsonb_build_object('reason', 'address'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS businesses_verification_address ON public.businesses;
CREATE TRIGGER businesses_verification_address
  AFTER UPDATE OF address ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_verification_address();

-- 9. After a year, a new video. Every night.
CREATE OR REPLACE FUNCTION public.verification_expire()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_n integer := 0;
BEGIN
  FOR v_id IN
    UPDATE public.business_verifications
       SET status = 'expired', expired_reason = 'year', video_path = NULL, video_at = NULL, call_at = NULL, updated_at = now()
     WHERE status = 'approved' AND verified_until <= now()
    RETURNING business_id
  LOOP
    PERFORM public.verification_notify(v_id, 'expired', jsonb_build_object('reason', 'year'));
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;

-- 10. Admin: the queue, the decision, removal.
CREATE OR REPLACE FUNCTION public.admin_verifications(p_view text DEFAULT 'submitted', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows jsonb;
  v_total integer;
  v_counts jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_view NOT IN ('submitted', 'approved', 'rejected', 'expired', 'started', 'all') THEN
    RAISE EXCEPTION 'Unknown view' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
           'submitted', count(*) FILTER (WHERE v.status = 'submitted'),
           'approved', count(*) FILTER (WHERE v.status = 'approved'),
           'rejected', count(*) FILTER (WHERE v.status = 'rejected'),
           'expired', count(*) FILTER (WHERE v.status = 'expired'),
           'started', count(*) FILTER (WHERE v.status = 'none'),
           'all', count(*))
    INTO v_counts
    FROM public.business_verifications v;

  SELECT count(*) INTO v_total FROM public.business_verifications v
   WHERE p_view = 'all' OR v.status = CASE p_view WHEN 'started' THEN 'none' ELSE p_view END;

  SELECT coalesce(jsonb_agg(x ORDER BY ord), '[]'::jsonb) INTO v_rows FROM (
    SELECT public.verification_view(b.id) || jsonb_build_object(
             'business_id', b.id, 'business_name', b.business_name, 'slug', b.slug, 'city', b.city, 'phone', b.phone,
             'owner_email', (SELECT u.email FROM public.users u WHERE u.id = b.user_id),
             'video_path', v.video_path, 'reliable', coalesce(r.badge, false), 'score', CASE WHEN r.shown THEN r.score END,
             'removed_at', v.removed_at, 'updated_at', v.updated_at) AS x,
           row_number() OVER (ORDER BY v.submitted_at ASC NULLS LAST, v.updated_at DESC) AS ord
      FROM public.business_verifications v
      JOIN public.businesses b ON b.id = v.business_id
      LEFT JOIN public.business_reliability r ON r.business_id = b.id
     WHERE p_view = 'all' OR v.status = CASE p_view WHEN 'started' THEN 'none' ELSE p_view END
     ORDER BY v.submitted_at ASC NULLS LAST, v.updated_at DESC
     LIMIT greatest(1, least(coalesce(p_limit, 50), 200)) OFFSET greatest(coalesce(p_offset, 0), 0)
  ) q;

  RETURN jsonb_build_object('total', v_total, 'counts', v_counts, 'rows', v_rows);
END;
$$;

-- Approve or reject. Rejecting needs a note the owner reads. Either way the video goes: the
-- result carries its path so the admin page deletes the file.
CREATE OR REPLACE FUNCTION public.admin_review_verification(p_business uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v public.business_verifications;
  b public.businesses;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Approve or reject' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v FROM public.business_verifications WHERE business_id = p_business FOR UPDATE;
  IF NOT FOUND OR v.status <> 'submitted' THEN
    RAISE EXCEPTION 'Nothing waiting for a decision' USING ERRCODE = 'P0002';
  END IF;
  IF p_decision = 'reject' AND (v_note IS NULL OR length(v_note) < 10) THEN
    RAISE EXCEPTION 'Say what to fix; the owner reads it' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business;

  UPDATE public.business_verifications
     SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
         reviewed_at = now(), reviewed_by = auth.uid(), review_note = left(v_note, 1000),
         approved_at = CASE WHEN p_decision = 'approve' THEN now() ELSE approved_at END,
         verified_until = CASE WHEN p_decision = 'approve' THEN now() + interval '12 months' ELSE verified_until END,
         place_address = CASE WHEN p_decision = 'approve' THEN b.address ELSE place_address END,
         expired_reason = NULL,
         removed_at = NULL, removed_note = NULL, removed_by = NULL,
         video_path = NULL, video_at = CASE WHEN p_decision = 'approve' THEN video_at END,
         call_at = CASE WHEN p_decision = 'approve' THEN call_at END,
         updated_at = now()
   WHERE business_id = p_business;

  PERFORM public.verification_notify(p_business, CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
                                     jsonb_build_object('note', left(v_note, 1000)));
  RETURN public.verification_view(p_business) || jsonb_build_object('delete_path', v.video_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_gold(p_business uuid, p_action text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_note text := nullif(trim(coalesce(p_note, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('remove', 'restore') THEN
    RAISE EXCEPTION 'Remove or restore' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_verifications WHERE business_id = p_business AND status = 'approved') THEN
    RAISE EXCEPTION 'This business is not verified' USING ERRCODE = 'P0002';
  END IF;
  IF p_action = 'remove' THEN
    IF v_note IS NULL OR length(v_note) < 10 THEN
      RAISE EXCEPTION 'Say why; the owner reads it' USING ERRCODE = '22023';
    END IF;
    UPDATE public.business_verifications
       SET removed_at = now(), removed_note = left(v_note, 1000), removed_by = auth.uid(), updated_at = now()
     WHERE business_id = p_business;
    PERFORM public.verification_notify(p_business, 'removed', jsonb_build_object('note', left(v_note, 1000)));
  ELSE
    UPDATE public.business_verifications
       SET removed_at = NULL, removed_note = NULL, removed_by = NULL, updated_at = now()
     WHERE business_id = p_business;
    PERFORM public.verification_notify(p_business, 'approved', '{}'::jsonb);
  END IF;
  RETURN public.verification_view(p_business);
END;
$$;

-- 11. What clients see now carries gold too. The return type changes, so it is dropped first.
DROP FUNCTION IF EXISTS public.business_trust();
CREATE FUNCTION public.business_trust()
RETURNS TABLE (business_id uuid, reliable boolean, kept_pct integer, verified boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.id, coalesce(r.badge, false), CASE WHEN r.shown THEN r.kept_pct END, public.verification_gold(b.id)
    FROM public.businesses b
    LEFT JOIN public.business_reliability r ON r.business_id = b.id
   WHERE b.is_active = true
     AND (coalesce(r.badge, false) OR coalesce(r.shown, false)
          OR EXISTS (SELECT 1 FROM public.business_verifications v WHERE v.business_id = b.id AND v.status = 'approved'));
$$;

-- 12. The engine says when a business is Verified, next to Reliable. No ranking boost for either.
CREATE OR REPLACE FUNCTION public.engine_match(
  p_market text, p_query text, p_mode text DEFAULT NULL, p_dates date[] DEFAULT NULL,
  p_window text DEFAULT 'any', p_at time without time zone DEFAULT NULL, p_people integer DEFAULT 1,
  p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL, p_zone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_now timestamp;
  v_dates date[];
  v_people integer := greatest(1, least(coalesce(p_people, 1), 50));
  v_tokens text[];
  v_from time;
  v_to time;
  v_matched integer;
  v_rows jsonb;
  v_later jsonb;
  v_pick jsonb := '[]'::jsonb;
  v_used uuid[] := '{}';
  r jsonb;
  v_first jsonb;
BEGIN
  SELECT m.timezone INTO v_tz FROM public.markets m WHERE m.code = p_market;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Pick a city' USING ERRCODE = '22023';
  END IF;
  IF p_mode IS NOT NULL AND p_mode NOT IN ('at_business', 'at_client', 'online') THEN
    RAISE EXCEPTION 'Pick where it happens' USING ERRCODE = '22023';
  END IF;
  IF p_mode = 'at_client' AND p_zone IS NULL AND p_lat IS NULL THEN
    RAISE EXCEPTION 'Tell us where you are, so we only show people who come to you' USING ERRCODE = '22023';
  END IF;

  -- A brake on repeated searches: per visitor when signed out, per person when signed in.
  IF v_uid IS NULL THEN
    IF NOT public.rate_ok(CASE WHEN public.request_origin() IS NOT NULL THEN 'engine:ip:' || public.request_origin() END, 60, 600) THEN
      RAISE EXCEPTION 'Lots of searches from here. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NOT public.rate_ok('engine:user:' || v_uid, 120, 600) THEN
    RAISE EXCEPTION 'Lots of searches. Wait a few minutes and try again.' USING ERRCODE = 'P0001';
  END IF;

  v_now := now() AT TIME ZONE v_tz;
  v_today := v_now::date;
  SELECT coalesce(array_agg(d ORDER BY d), ARRAY[v_today])
    INTO v_dates
    FROM (SELECT DISTINCT d FROM unnest(coalesce(p_dates, ARRAY[v_today])) AS d
           WHERE d BETWEEN v_today AND v_today + 90 ORDER BY d LIMIT 3) x;
  IF cardinality(v_dates) = 0 THEN v_dates := ARRAY[v_today]; END IF;

  SELECT array_agg(DISTINCT tok) INTO v_tokens
    FROM unnest(string_to_array(public.engine_fold(p_query), ' ')) AS tok
   WHERE length(tok) >= 3
     AND tok <> ALL (ARRAY['and', 'the', 'for', 'with', 'please', 'book', 'need', 'want', 'some', 'someone', 'today', 'tomorrow',
                           'para', 'com', 'uma', 'uns', 'umas', 'por', 'favor', 'quero', 'preciso', 'marcar', 'hoje', 'amanha', 'meu', 'minha']);
  IF v_tokens IS NULL THEN
    RAISE EXCEPTION 'Say what you need, like "haircut" or "nails"' USING ERRCODE = '22023';
  END IF;

  IF p_at IS NOT NULL THEN
    v_from := (p_at - interval '90 minutes')::time;
    v_to := (p_at + interval '90 minutes')::time;
    IF p_at < time '01:30' THEN v_from := time '00:00'; END IF;
    IF p_at > time '22:29' THEN v_to := time '23:59'; END IF;
  ELSE
    v_from := CASE p_window WHEN 'afternoon' THEN time '12:00' WHEN 'evening' THEN time '17:00' ELSE time '00:00' END;
    v_to := CASE p_window WHEN 'morning' THEN time '11:59' WHEN 'afternoon' THEN time '16:59' ELSE time '23:59' END;
  END IF;

  IF to_regclass('pg_temp.engine_slots') IS NULL THEN
    CREATE TEMP TABLE engine_slots (
      sid uuid, bid uuid, fit numeric, km numeric, day date, at time, in_window boolean
    ) ON COMMIT DROP;
  END IF;
  TRUNCATE pg_temp.engine_slots;

  -- Services that fit the words, the format, the place and the group.
  WITH svc AS (
    SELECT s.id AS sid, b.id AS bid, public.engine_fit(v_tokens, s.service_name, b.category) AS fit,
           CASE WHEN p_lat IS NOT NULL AND b.lat IS NOT NULL THEN public.km_between(b.lat, b.lng, p_lat, p_lng) END AS km,
           b.is_demo
      FROM public.services s
      JOIN public.businesses b ON b.id = s.business_id
     WHERE b.is_active = true AND b.market = p_market AND s.is_active = true
       AND v_people <= s.max_people
       AND (p_mode IS NULL OR p_mode = ANY (s.modes))
       AND (p_mode IS DISTINCT FROM 'at_client' OR (
             (p_zone IS NOT NULL AND p_zone = ANY (b.service_zones))
             OR (b.service_radius_km IS NOT NULL AND b.lat IS NOT NULL AND p_lat IS NOT NULL
                 AND public.km_between(b.lat, b.lng, p_lat, p_lng) <= b.service_radius_km)))
  ),
  fit AS (
    SELECT * FROM svc WHERE fit > 0 ORDER BY fit DESC, is_demo NULLS FIRST LIMIT 25
  )
  INSERT INTO pg_temp.engine_slots (sid, bid, fit, km, day, at, in_window)
  SELECT f.sid, f.bid, f.fit, f.km, d.day, sl.slot_time,
         sl.slot_time BETWEEN v_from AND v_to
    FROM fit f
   CROSS JOIN unnest(v_dates) AS d(day)
   CROSS JOIN LATERAL public.get_available_slots(f.bid, f.sid, d.day, NULL, NULL, NULL, CASE WHEN v_people > 1 THEN v_people END) sl;

  SELECT count(DISTINCT sid) INTO v_matched FROM pg_temp.engine_slots;

  -- One option per business: its best service and time, scored.
  WITH stats AS (
    SELECT b.id AS bid, b.business_name, b.slug, b.city, b.logo_url, b.is_demo, b.currency,
           (SELECT round(avg(rv.rating)::numeric, 1) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS rating,
           (SELECT count(*) FROM public.reviews rv WHERE rv.business_id = b.id AND rv.status = 'published') AS reviews,
           (SELECT CASE WHEN count(*) >= 5 THEN round(100.0 * count(*) FILTER (WHERE x.visits >= 2) / count(*)) END
              FROM (SELECT count(*) AS visits FROM public.appointments a
                     WHERE a.business_id = b.id AND a.status = 'completed' AND a.client_email IS NOT NULL
                       AND a.appointment_date > v_today - 365
                     GROUP BY lower(a.client_email)) x) AS rebook_pct,
           rl.score / 100.0 AS reliability, rl.kept_pct, coalesce(rl.badge, false) AS reliable,
           (v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.business_id = b.id AND a.client_id = v_uid AND a.status = 'completed')) AS regular
      FROM public.businesses b
      LEFT JOIN public.business_reliability rl ON rl.business_id = b.id AND (rl.shown OR rl.badge)
     WHERE b.id IN (SELECT DISTINCT bid FROM pg_temp.engine_slots)
  ),
  scored AS (
    SELECT e.sid, e.bid, e.fit, e.km, e.day, e.at, st.business_name, st.slug, st.city, st.logo_url, st.is_demo, st.currency,
           st.rating, st.reviews, st.rebook_pct, st.reliability, st.kept_pct, st.reliable, st.regular, s.service_name, s.price, s.price_per, s.modes, s.duration_minutes, s.extra_person_minutes,
           0.5 * CASE WHEN p_at IS NOT NULL
                   THEN 1 - least(abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at)) / 60) / 90, 1)
                   ELSE 1 - least(greatest(extract(epoch FROM (e.day + e.at) - v_now) / 60, 0) / (72 * 60), 1) END
         + 0.2 * CASE WHEN e.km IS NOT NULL THEN 1 - least(e.km / 15, 1) ELSE 0.5 END
         + 0.1 * CASE WHEN st.reviews >= 5 THEN greatest(0, least(1, (st.rating - 3) / 2)) ELSE 0.5 END
         + 0.1 * CASE WHEN st.rebook_pct IS NOT NULL THEN least(st.rebook_pct / 100, 1) ELSE 0.5 END
         + 0.1 * coalesce(st.reliability, 0.8)
         + 0.02 * least(e.fit, 6) / 6
         + CASE WHEN st.regular THEN 0.25 ELSE 0 END
         - CASE WHEN st.is_demo THEN 1 ELSE 0 END
         + random() * 0.01 AS score
      FROM pg_temp.engine_slots e
      JOIN stats st ON st.bid = e.bid
      JOIN public.services s ON s.id = e.sid
     WHERE e.in_window
  ),
  best AS (
    SELECT DISTINCT ON (bid) * FROM scored ORDER BY bid, score DESC
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'business_id', bid, 'business_name', business_name, 'slug', slug, 'city', city, 'logo_url', logo_url,
           'service_id', sid, 'service_name', service_name, 'people', v_people,
           'price', CASE WHEN price_per = 'person' THEN price * v_people ELSE price END, 'price_per', price_per, 'currency', currency,
           'minutes', duration_minutes + (v_people - 1) * coalesce(extra_person_minutes, duration_minutes),
           'mode', coalesce(p_mode, modes[1]),
           'date', day, 'time', to_char(at, 'HH24:MI'), 'starts', (day + at),
           'km', round(km, 1), 'rating', CASE WHEN reviews > 0 THEN rating END, 'reviews', reviews,
           'rebook_pct', rebook_pct, 'kept_pct', kept_pct, 'reliable', reliable, 'verified', public.verification_gold(bid), 'regular', regular, 'score', round(score::numeric, 4)
         ) ORDER BY score DESC), '[]'::jsonb)
    INTO v_rows
    FROM best;

  -- Three options, three different reasons.
  IF jsonb_array_length(v_rows) > 0 THEN
    v_first := v_rows->0;
    v_pick := jsonb_build_array(v_first || jsonb_build_object('label', CASE WHEN (v_first->>'regular')::boolean THEN 'regular' ELSE 'best' END));
    v_used := ARRAY[(v_first->>'business_id')::uuid];

    -- Earliest, when earlier than the best match.
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'starts') < (v_first->>'starts')
     ORDER BY x->>'starts', (x->>'score')::numeric DESC LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "earliest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END IF;

    -- Closest, when distance is known; otherwise top rated (5 reviews or more).
    r := NULL;
    SELECT x INTO r FROM jsonb_array_elements(v_rows) x
     WHERE (x->>'business_id')::uuid <> ALL (v_used) AND x->>'km' IS NOT NULL
     ORDER BY (x->>'km')::numeric LIMIT 1;
    IF r IS NOT NULL THEN
      v_pick := v_pick || jsonb_build_array(r || '{"label": "closest"}');
      v_used := v_used || (r->>'business_id')::uuid;
    ELSE
      SELECT x INTO r FROM jsonb_array_elements(v_rows) x
       WHERE (x->>'business_id')::uuid <> ALL (v_used) AND (x->>'reviews')::int >= 5
       ORDER BY (x->>'rating')::numeric DESC, (x->>'score')::numeric DESC LIMIT 1;
      IF r IS NOT NULL THEN
        v_pick := v_pick || jsonb_build_array(r || '{"label": "top_rated"}');
        v_used := v_used || (r->>'business_id')::uuid;
      END IF;
    END IF;

    -- Fill to three by score.
    FOR r IN SELECT x FROM jsonb_array_elements(v_rows) x WHERE (x->>'business_id')::uuid <> ALL (v_used) LOOP
      EXIT WHEN jsonb_array_length(v_pick) >= 3;
      v_pick := v_pick || jsonb_build_array(r || '{"label": "another"}');
      v_used := v_used || (r->>'business_id')::uuid;
    END LOOP;
  END IF;

  -- Nothing in the window: the nearest times outside it, from up to two businesses.
  IF jsonb_array_length(v_pick) = 0 THEN
    SELECT coalesce(jsonb_agg(o ORDER BY o->>'starts'), '[]'::jsonb) INTO v_later
      FROM (
        SELECT DISTINCT ON (e.bid) jsonb_build_object(
                 'business_id', e.bid, 'business_name', b.business_name, 'slug', b.slug, 'service_id', e.sid,
                 'service_name', s.service_name, 'people', v_people, 'mode', coalesce(p_mode, s.modes[1]),
                 'date', e.day, 'time', to_char(e.at, 'HH24:MI'), 'starts', (e.day + e.at), 'km', round(e.km, 1),
                 'price', CASE WHEN s.price_per = 'person' THEN s.price * v_people ELSE s.price END, 'currency', b.currency,
                 'label', 'later') AS o
          FROM pg_temp.engine_slots e
          JOIN public.businesses b ON b.id = e.bid
          JOIN public.services s ON s.id = e.sid
         ORDER BY e.bid,
                  CASE WHEN p_at IS NOT NULL THEN abs(extract(epoch FROM (e.day + e.at) - (e.day + p_at))) ELSE extract(epoch FROM (e.day + e.at)) END
      ) y
     LIMIT 2;
    SELECT coalesce(jsonb_agg(z), '[]'::jsonb) INTO v_later FROM (SELECT z FROM jsonb_array_elements(v_later) z LIMIT 2) q;
  END IF;

  RETURN jsonb_build_object(
    'options', v_pick,
    'later', coalesce(v_later, '[]'::jsonb),
    'matched', v_matched,
    'words', to_jsonb(v_tokens),
    'dates', to_jsonb(v_dates),
    'timezone', v_tz
  );
END;
$$;


REVOKE EXECUTE ON FUNCTION public.verification_gold(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verification_notify(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verification_ready(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verification_view(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verification_identity(uuid, text, text, text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.businesses_verification_address() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verification_expire() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_verification(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_verification_place(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verifications(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_verification(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_gold(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.business_trust() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verification_identity(uuid, text, text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.verification_view(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.my_verification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_verification_place(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verifications(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_verification(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_gold(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_trust() TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.engine_match(text, text, text, date[], text, time without time zone, integer, double precision, double precision, text) TO anon, authenticated, service_role;

-- 13. Every night at 03:47 UTC, a year runs out.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'verification-nightly';
SELECT cron.schedule('verification-nightly', '47 3 * * *', 'SELECT public.verification_expire()');

NOTIFY pgrst, 'reload schema';

COMMIT;
