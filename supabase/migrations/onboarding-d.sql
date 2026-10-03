BEGIN;

-- Where a business is: ISO country code, plus an optional neighbourhood for discovery.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'PT';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS neighbourhood text;

UPDATE public.businesses SET country = 'NG' WHERE timezone = 'Africa/Lagos' AND country = 'PT';

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_country_code;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_country_code CHECK (country ~ '^[A-Z]{2}$');

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_neighbourhood_length;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_neighbourhood_length
    CHECK (neighbourhood IS NULL OR char_length(btrim(neighbourhood)) BETWEEN 1 AND 60);

NOTIFY pgrst, 'reload schema';

COMMIT;
