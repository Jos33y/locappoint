-- 1. Audit. Must return zero rows before step 2.
SELECT user_id, count(*) AS businesses
FROM public.businesses
GROUP BY user_id
HAVING count(*) > 1;

-- 2. One business per account for the beta.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_one_per_owner ON public.businesses (user_id);

-- 3. Verify. Shows the index; the insert must fail with "duplicate key value violates unique constraint businesses_one_per_owner".
SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'businesses_one_per_owner';

BEGIN;
INSERT INTO public.businesses (user_id, business_name, slug, category, city, phone)
SELECT user_id, 'dup test', 'dup-test-business', 'salon', 'Lisbon', '000000' FROM public.businesses LIMIT 1;
ROLLBACK;
