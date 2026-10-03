-- waitlist-relax-constraints.sql
-- Relax NOT NULL on full_name, user_type, country so the email-first
-- two-step capture flow can insert partial rows in step 1, then enrich
-- via upsert in step 2. Only email remains NOT NULL.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.
-- Reversible: see rollback block at the bottom of this file.


ALTER TABLE waitlist ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE waitlist ALTER COLUMN user_type DROP NOT NULL;
ALTER TABLE waitlist ALTER COLUMN country   DROP NOT NULL;


-- Verify result. Should show is_nullable = 'YES' for the three columns above.
-- email stays 'NO' (still required).
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'waitlist'
  AND column_name IN ('email', 'full_name', 'user_type', 'country')
ORDER BY column_name;


-- ROLLBACK (only if you want to undo):
-- ALTER TABLE waitlist ALTER COLUMN full_name SET NOT NULL;
-- ALTER TABLE waitlist ALTER COLUMN user_type SET NOT NULL;
-- ALTER TABLE waitlist ALTER COLUMN country   SET NOT NULL;
-- Note: rollback will fail if existing rows have nulls in these columns.
