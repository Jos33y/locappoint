-- Account deletion from inside the apps and the website, as Apple and Google require. Safe to run twice.
--
-- What goes: the sign-in, the profile, notifications, and a business the person owns with everything in it
-- (services, hours, bookings, reviews). Bookings someone made as a client stay with the business that took them,
-- without the link to the account, because they are the business's records.
-- An owner with bookings still to come must cancel or move them first, so no client is left with a silent no-show.

-- One counted row per deleted account, nothing personal.
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  had_business boolean NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.account_deletion_check()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'businesses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', b.id,
        'name', b.business_name,
        'upcoming', (
          SELECT count(*) FROM public.appointments a
           WHERE a.business_id = b.id
             AND a.status IN ('pending', 'confirmed')
             AND a.appointment_date >= (now() AT TIME ZONE b.timezone)::date
        )
      ) ORDER BY b.business_name)
        FROM public.businesses b
       WHERE b.user_id = v_uid
    ), '[]'::jsonb),
    'client_upcoming', (
      SELECT count(*) FROM public.appointments a
        JOIN public.businesses b ON b.id = a.business_id
       WHERE a.client_id = v_uid
         AND a.status IN ('pending', 'confirmed')
         AND a.appointment_date >= (now() AT TIME ZONE b.timezone)::date
    ),
    'staff_of', COALESCE((
      SELECT jsonb_agg(b.business_name ORDER BY b.business_name)
        FROM public.business_members m
        JOIN public.businesses b ON b.id = m.business_id
       WHERE m.user_id = v_uid AND b.user_id <> v_uid
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_account(p_confirm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_blocked record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
  END IF;
  IF upper(trim(COALESCE(p_confirm, ''))) <> 'DELETE' THEN
    RAISE EXCEPTION 'Type DELETE to confirm' USING ERRCODE = '22023';
  END IF;

  SELECT b.business_name, count(a.id) AS upcoming INTO v_blocked
    FROM public.businesses b
    JOIN public.appointments a ON a.business_id = b.id
   WHERE b.user_id = v_uid
     AND a.status IN ('pending', 'confirmed')
     AND a.appointment_date >= (now() AT TIME ZONE b.timezone)::date
   GROUP BY b.business_name
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION '% still has % upcoming %. Cancel or move them first, so your clients are told.',
      v_blocked.business_name, v_blocked.upcoming, CASE WHEN v_blocked.upcoming = 1 THEN 'booking' ELSE 'bookings' END
      USING ERRCODE = 'P0001';
  END IF;

  -- One counted line, nothing personal, so deletions show in the numbers.
  INSERT INTO public.account_deletions (had_business) VALUES (EXISTS (SELECT 1 FROM public.businesses WHERE user_id = v_uid));

  -- Detaching client bookings is a system write, not a client edit; the booking guard lets it through.
  PERFORM set_config('locappoint.trusted_write', 'on', true);
  -- The sign-in row carries everything else with it (profile, businesses and their data, inbox).
  DELETE FROM auth.users WHERE id = v_uid;
  PERFORM set_config('locappoint.trusted_write', 'off', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.account_deletion_check() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_my_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text) TO authenticated;
