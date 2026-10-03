-- Team: the owner adds the people who take bookings, picks what each one does and when they work,
-- and can give any of them their own login through a link. Staff see their own day; the owner sees everyone.
-- Every change to members goes through these functions; the table is read-only to the app. Safe to run again.

BEGIN;

ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS invite_token text;
ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS invite_created_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS business_members_invite_token ON public.business_members (invite_token) WHERE invite_token IS NOT NULL;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.business_members FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.staff_services FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, SELECT ON public.business_members FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, SELECT ON public.staff_services FROM anon;

-- A member's own hours may only point at a member of the same business.
CREATE OR REPLACE FUNCTION public.availability_staff_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.business_members m WHERE m.id = NEW.staff_id AND m.business_id = NEW.business_id AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'That person is not on this team' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS availability_staff_guard ON public.availability;
CREATE TRIGGER availability_staff_guard
  BEFORE INSERT OR UPDATE OF staff_id, business_id ON public.availability
  FOR EACH ROW EXECUTE FUNCTION public.availability_staff_guard();


-- The owner's view of the team, in one call.
CREATE OR REPLACE FUNCTION public.team_members(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can manage the team' USING ERRCODE = '42501';
  END IF;
  SELECT (now() AT TIME ZONE b.timezone)::date INTO v_today FROM public.businesses b WHERE b.id = p_business_id;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
             'id', m.id,
             'display_name', m.display_name,
             'role', m.role,
             'is_bookable', m.is_bookable,
             'sort_order', m.sort_order,
             'login_email', u.email,
             'invite_token', CASE WHEN m.user_id IS NULL THEN m.invite_token END,
             'services', coalesce((SELECT jsonb_agg(ss.service_id) FROM public.staff_services ss WHERE ss.member_id = m.id), '[]'::jsonb),
             'upcoming', (SELECT count(*) FROM public.appointments a
                           WHERE a.staff_id = m.id AND a.status IN ('pending', 'confirmed') AND a.appointment_date >= v_today),
             'served_30', (SELECT count(*) FROM public.appointments a
                            WHERE a.staff_id = m.id AND a.status IN ('confirmed', 'completed')
                              AND a.appointment_date BETWEEN v_today - 30 AND v_today))
           ORDER BY m.role = 'owner' DESC, m.sort_order, m.created_at)
      FROM public.business_members m
      LEFT JOIN public.users u ON u.id = m.user_id
     WHERE m.business_id = p_business_id AND m.status = 'active'
  ), '[]'::jsonb);
END;
$$;


CREATE OR REPLACE FUNCTION public.add_team_member(p_business_id uuid, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_business_owner(p_business_id) THEN
    RAISE EXCEPTION 'Only the owner can manage the team' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Give them a name, up to 80 characters' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.business_members m WHERE m.business_id = p_business_id AND m.status = 'active') >= 25 THEN
    RAISE EXCEPTION 'A team can have up to 25 people' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.business_members (business_id, role, display_name, status, is_bookable, sort_order)
  VALUES (p_business_id, 'staff', trim(p_name), 'active', true,
          coalesce((SELECT max(m.sort_order) + 1 FROM public.business_members m WHERE m.business_id = p_business_id), 1))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


-- Name and whether clients can book them. Someone must always take bookings.
CREATE OR REPLACE FUNCTION public.update_team_member(p_member_id uuid, p_name text, p_bookable boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
BEGIN
  SELECT * INTO m FROM public.business_members WHERE id = p_member_id AND status = 'active';
  IF m.id IS NULL OR NOT public.is_business_owner(m.business_id) THEN
    RAISE EXCEPTION 'Only the owner can manage the team' USING ERRCODE = '42501';
  END IF;
  IF length(trim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Give them a name, up to 80 characters' USING ERRCODE = 'P0001';
  END IF;
  IF NOT p_bookable AND NOT EXISTS (
    SELECT 1 FROM public.business_members o
     WHERE o.business_id = m.business_id AND o.status = 'active' AND o.is_bookable AND o.id <> m.id
  ) THEN
    RAISE EXCEPTION 'Someone has to take bookings. Turn it on for another person first.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.business_members SET display_name = trim(p_name), is_bookable = p_bookable WHERE id = m.id;
END;
$$;


-- What they do. An empty list means every service, including ones added later.
CREATE OR REPLACE FUNCTION public.set_member_services(p_member_id uuid, p_service_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
BEGIN
  SELECT * INTO m FROM public.business_members WHERE id = p_member_id AND status = 'active';
  IF m.id IS NULL OR NOT public.is_business_owner(m.business_id) THEN
    RAISE EXCEPTION 'Only the owner can manage the team' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.staff_services WHERE member_id = m.id;
  INSERT INTO public.staff_services (member_id, service_id)
  SELECT m.id, s.id FROM public.services s
   WHERE s.business_id = m.business_id AND s.id = ANY (coalesce(p_service_ids, '{}'));
END;
$$;


-- A link that lets this person sign in to their own calendar. The owner sends it however they like.
CREATE OR REPLACE FUNCTION public.member_invite_link(p_member_id uuid, p_renew boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
  v_token text;
BEGIN
  SELECT * INTO m FROM public.business_members WHERE id = p_member_id AND status = 'active';
  IF m.id IS NULL OR NOT public.is_business_owner(m.business_id) THEN
    RAISE EXCEPTION 'Only the owner can manage the team' USING ERRCODE = '42501';
  END IF;
  IF m.role = 'owner' OR m.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'They already sign in with their own account' USING ERRCODE = 'P0001';
  END IF;
  IF m.invite_token IS NOT NULL AND NOT p_renew AND m.invite_created_at > now() - interval '14 days' THEN
    RETURN m.invite_token;
  END IF;
  v_token := replace(gen_random_uuid()::text, '-', '') || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  UPDATE public.business_members SET invite_token = v_token, invite_created_at = now() WHERE id = m.id;
  RETURN v_token;
END;
$$;


-- What the invite page shows before anyone signs in. Nothing about the team beyond the invited name.
CREATE OR REPLACE FUNCTION public.team_invite_info(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
           'display_name', m.display_name,
           'business_name', b.business_name,
           'city', b.city,
           'logo_url', b.logo_url,
           'owner_name', (SELECT o.display_name FROM public.business_members o WHERE o.business_id = b.id AND o.role = 'owner' AND o.status = 'active' LIMIT 1))
    FROM public.business_members m
    JOIN public.businesses b ON b.id = m.business_id
   WHERE m.invite_token = p_token
     AND length(coalesce(p_token, '')) = 40
     AND m.status = 'active' AND m.user_id IS NULL
     AND m.invite_created_at > now() - interval '14 days'
$$;


-- The invited person, signed in, joins. One business per account, as everywhere else in the app.
CREATE OR REPLACE FUNCTION public.accept_team_invite(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  m public.business_members;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in first' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO m FROM public.business_members
   WHERE invite_token = p_token AND length(coalesce(p_token, '')) = 40
     AND status = 'active' AND user_id IS NULL AND invite_created_at > now() - interval '14 days'
   FOR UPDATE;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'This link has expired or was already used. Ask for a new one.' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = v_uid) THEN
    RAISE EXCEPTION 'This account runs its own business. Sign in with another account to join a team.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_members o WHERE o.user_id = v_uid AND o.status = 'active') THEN
    RAISE EXCEPTION 'This account is already on a team. Sign in with another account.' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.business_members SET user_id = v_uid, invite_token = NULL, invite_created_at = NULL WHERE id = m.id;
  RETURN m.business_id;
END;
$$;


-- Take them off the team. Their bookings ahead must move to someone else first; past visits keep their name.
CREATE OR REPLACE FUNCTION public.remove_team_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  m public.business_members;
  v_ahead integer;
BEGIN
  SELECT * INTO m FROM public.business_members WHERE id = p_member_id AND status = 'active';
  IF m.id IS NULL OR NOT public.is_business_owner(m.business_id) THEN
    RAISE EXCEPTION 'Only the owner can manage the team' USING ERRCODE = '42501';
  END IF;
  IF m.role = 'owner' THEN
    RAISE EXCEPTION 'The owner stays on the team' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_ahead FROM public.appointments a JOIN public.businesses b ON b.id = a.business_id
   WHERE a.staff_id = m.id AND a.status IN ('pending', 'confirmed')
     AND a.appointment_date >= (now() AT TIME ZONE b.timezone)::date;
  IF v_ahead > 0 THEN
    RAISE EXCEPTION '% has % booking% ahead. Move % to someone else first.',
      m.display_name, v_ahead, CASE WHEN v_ahead = 1 THEN '' ELSE 's' END, CASE WHEN v_ahead = 1 THEN 'it' ELSE 'them' END
      USING ERRCODE = 'P0001';
  END IF;
  IF m.is_bookable AND NOT EXISTS (
    SELECT 1 FROM public.business_members o WHERE o.business_id = m.business_id AND o.status = 'active' AND o.is_bookable AND o.id <> m.id
  ) THEN
    RAISE EXCEPTION 'Someone has to take bookings. Turn it on for another person first.' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.availability WHERE staff_id = m.id;
  DELETE FROM public.staff_services WHERE member_id = m.id;
  UPDATE public.business_members
     SET status = 'removed', is_bookable = false, invite_token = NULL, invite_created_at = NULL
   WHERE id = m.id;
END;
$$;


REVOKE EXECUTE ON FUNCTION public.availability_staff_guard() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.team_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_members(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.add_team_member(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_team_member(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_team_member(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_team_member(uuid, text, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_member_services(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_services(uuid, uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.member_invite_link(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_invite_link(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.team_invite_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_invite_info(text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_team_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_team_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid) TO authenticated;

COMMIT;
