BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'An account owns more than one business. Resolve that before running this file.';
  END IF;
END $$;

-- batch3-accounts.sql created this index, but it is missing on production.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_one_per_owner ON public.businesses (user_id);


-- launched_at empty means the business is still in setup; is_active stays the pause switch.

-- Backfill only when the column is new, so a second run cannot launch a business still in setup.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'launched_at') THEN
    ALTER TABLE public.businesses ADD COLUMN launched_at timestamptz;
    UPDATE public.businesses SET launched_at = COALESCE(created_at, now());
  END IF;
END $$;
ALTER TABLE public.businesses ALTER COLUMN is_active SET DEFAULT false;


-- Starts in the order the public page shows today (cheapest first). Same run-once guard.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'sort_order') THEN
    ALTER TABLE public.services ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
    UPDATE public.services s
       SET sort_order = r.n
      FROM (SELECT id, (row_number() OVER (PARTITION BY business_id ORDER BY price, service_name) - 1)::int AS n
              FROM public.services) r
     WHERE r.id = s.id;
  END IF;
END $$;


-- Businesses in setup are hidden by RLS, so the web-address check needs to see past it.
-- Reserved words stay in businesses_slug_rules and reservedSlugs.js.

CREATE OR REPLACE FUNCTION public.slug_status(p_slug text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_slug IS NULL OR length(p_slug) NOT BETWEEN 3 AND 60 OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN 'invalid'
    WHEN EXISTS (SELECT 1 FROM public.businesses b WHERE b.slug = p_slug AND b.user_id IS DISTINCT FROM auth.uid()) THEN 'taken'
    ELSE 'available'
  END
$$;


-- Logo and cover photos: public to read, written only by the business owner into {business_id}/.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('business-media', 'business-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = EXCLUDED.public,
       file_size_limit = EXCLUDED.file_size_limit,
       allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.owns_media_path(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND split_part(p_name, '/', 3) = ''
    THEN public.is_business_owner(split_part(p_name, '/', 1)::uuid)
    ELSE false
  END
$$;

DROP POLICY IF EXISTS business_media_owner_read ON storage.objects;
CREATE POLICY business_media_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'business-media' AND public.owns_media_path(name));

DROP POLICY IF EXISTS business_media_owner_insert ON storage.objects;
CREATE POLICY business_media_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-media' AND public.owns_media_path(name));

DROP POLICY IF EXISTS business_media_owner_update ON storage.objects;
CREATE POLICY business_media_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-media' AND public.owns_media_path(name))
  WITH CHECK (bucket_id = 'business-media' AND public.owns_media_path(name));

DROP POLICY IF EXISTS business_media_owner_delete ON storage.objects;
CREATE POLICY business_media_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-media' AND public.owns_media_path(name));


REVOKE EXECUTE ON FUNCTION public.slug_status(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_media_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.slug_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_media_path(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
