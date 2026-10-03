BEGIN;

-- Owners who choose "Something else" describe their business in their own words.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS category_detail text;

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_category_detail_length;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_category_detail_length
    CHECK (category_detail IS NULL OR char_length(btrim(category_detail)) BETWEEN 1 AND 60);

NOTIFY pgrst, 'reload schema';

COMMIT;
