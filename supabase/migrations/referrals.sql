-- Referrals: each business has an invite link. Points when an invited business joins,
-- then at its 1st, 10th, 25th, 50th and 100th real booking. Nothing else earns points.
-- A real booking is one a client made online that actually happened: not manual, cancelled or a no-show.
-- Points have no set value yet; the app says so. Safe to run again.

BEGIN;

CREATE TABLE IF NOT EXISTS public.referral_codes (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9]{8}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_id)
);

CREATE TABLE IF NOT EXISTS public.referral_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  milestone text NOT NULL CHECK (milestone IN ('joined', 'bookings_1', 'bookings_10', 'bookings_25', 'bookings_50', 'bookings_100')),
  points integer NOT NULL CHECK (points > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, milestone)
);

CREATE INDEX IF NOT EXISTS referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referral_points_business ON public.referral_points (business_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_points ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_codes, public.referrals, public.referral_points FROM anon, authenticated;


-- The ladder in one place, so the app and the awards never disagree.
CREATE OR REPLACE FUNCTION public.referral_ladder()
RETURNS TABLE (milestone text, bookings integer, points integer, label text)
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  VALUES
    ('joined', 0, 10, 'Joins Locappoint'),
    ('bookings_1', 1, 20, 'First booking'),
    ('bookings_10', 10, 30, '10 bookings'),
    ('bookings_25', 25, 50, '25 bookings'),
    ('bookings_50', 50, 75, '50 bookings'),
    ('bookings_100', 100, 100, '100 bookings');
$$;


CREATE OR REPLACE FUNCTION public.real_booking_count(p_business_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::int
    FROM public.appointments a
    JOIN public.businesses b ON b.id = a.business_id
   WHERE a.business_id = p_business_id
     AND a.source = 'web'
     AND (a.status = 'completed'
          OR (a.status = 'confirmed'
              AND a.appointment_date + a.appointment_time + a.duration_minutes * interval '1 minute' <= now() AT TIME ZONE b.timezone));
$$;


CREATE OR REPLACE FUNCTION public.award_referral(p_referral_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.referrals;
  v_count integer;
  v_name text;
  v_owner uuid;
  step record;
BEGIN
  SELECT * INTO r FROM public.referrals WHERE id = p_referral_id;
  IF r.id IS NULL THEN
    RETURN;
  END IF;
  v_count := public.real_booking_count(r.referred_id);
  SELECT b.business_name INTO v_name FROM public.businesses b WHERE b.id = r.referred_id;
  SELECT b.user_id INTO v_owner FROM public.businesses b WHERE b.id = r.referrer_id;

  FOR step IN SELECT * FROM public.referral_ladder() l WHERE l.bookings <= v_count LOOP
    INSERT INTO public.referral_points (referral_id, business_id, milestone, points)
    VALUES (r.id, r.referrer_id, step.milestone, step.points)
    ON CONFLICT (referral_id, milestone) DO NOTHING;
    IF FOUND AND v_owner IS NOT NULL AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_owner) THEN
      INSERT INTO public.inbox (user_id, audience, kind, business_id, payload, dedupe_key)
      VALUES (v_owner, 'business', 'referral_points', r.referrer_id,
              jsonb_build_object('business_name', v_name, 'milestone', step.milestone, 'label', step.label, 'points', step.points),
              'referral_points:' || r.id || ':' || step.milestone)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_all_referrals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT r.id FROM public.referrals r
     WHERE (SELECT count(*) FROM public.referral_points p WHERE p.referral_id = r.id) < 6
  LOOP
    BEGIN
      PERFORM public.award_referral(v_id);
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END;
$$;


-- The owner's invite page: their link code, points, and everyone they invited with progress.
CREATE OR REPLACE FUNCTION public.my_referrals(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can invite businesses' USING ERRCODE = '42501';
  END IF;
  SELECT c.code INTO v_code FROM public.referral_codes c WHERE c.business_id = p_business_id;
  WHILE v_code IS NULL LOOP
    BEGIN
      INSERT INTO public.referral_codes (business_id, code)
      VALUES (p_business_id, substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
      RETURNING code INTO v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT c.code INTO v_code FROM public.referral_codes c WHERE c.business_id = p_business_id;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'code', v_code,
    'points', coalesce((SELECT sum(p.points) FROM public.referral_points p WHERE p.business_id = p_business_id), 0),
    'ladder', (SELECT jsonb_agg(jsonb_build_object('milestone', l.milestone, 'bookings', l.bookings, 'points', l.points, 'label', l.label) ORDER BY l.bookings)
                 FROM public.referral_ladder() l),
    'invited', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'business_name', b.business_name,
               'city', b.city,
               'joined_at', r.created_at,
               'live', b.is_active,
               'bookings', public.real_booking_count(b.id),
               'points', (SELECT coalesce(sum(p.points), 0) FROM public.referral_points p WHERE p.referral_id = r.id),
               'reached', (SELECT coalesce(jsonb_agg(p.milestone), '[]'::jsonb) FROM public.referral_points p WHERE p.referral_id = r.id))
             ORDER BY r.created_at DESC)
        FROM public.referrals r JOIN public.businesses b ON b.id = r.referred_id
       WHERE r.referrer_id = p_business_id), '[]'::jsonb)
  );
END;
$$;


-- Called by a new business right after it is created, with the code from the invite link it arrived through.
-- Only a business created in the last 14 days, by someone other than the inviter, and only once.
CREATE OR REPLACE FUNCTION public.claim_referral(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mine public.businesses;
  v_referrer uuid;
  v_referrer_owner uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO v_mine FROM public.businesses b WHERE b.user_id = v_uid ORDER BY b.created_at DESC LIMIT 1;
  IF v_mine.id IS NULL OR v_mine.created_at < now() - interval '14 days' THEN
    RETURN false;
  END IF;
  SELECT c.business_id, b.user_id INTO v_referrer, v_referrer_owner
    FROM public.referral_codes c JOIN public.businesses b ON b.id = c.business_id
   WHERE c.code = lower(trim(coalesce(p_code, '')));
  IF v_referrer IS NULL OR v_referrer = v_mine.id OR v_referrer_owner = v_uid THEN
    RETURN false;
  END IF;
  INSERT INTO public.referrals (referrer_id, referred_id) VALUES (v_referrer, v_mine.id)
  ON CONFLICT (referred_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RETURN false;
  END IF;
  PERFORM public.award_referral(v_id);
  RETURN true;
END;
$$;


REVOKE EXECUTE ON FUNCTION public.referral_ladder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.referral_ladder() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.real_booking_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_referral(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_all_referrals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_referrals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referrals(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'referral-points';
SELECT cron.schedule('referral-points', '7 * * * *', 'SELECT public.award_all_referrals()');

COMMIT;
