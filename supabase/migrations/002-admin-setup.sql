-- 002-admin-setup.sql
-- Adds admin capability to users + RLS policies allowing admins
-- to read and delete waitlist + partnership_requests entries.
--
-- Run in Supabase: SQL Editor -> New query -> paste this file -> Run.
-- Then run the two UPDATE statements at the bottom AFTER you and
-- Vincent have both signed up via /auth (the UUIDs need to exist).


-- 1. Add is_admin flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;


-- 2. Enable RLS on both tables (idempotent)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_requests ENABLE ROW LEVEL SECURITY;


-- 3. Drop existing admin policies if re-running (safe)
DROP POLICY IF EXISTS "Admins can read all waitlist"         ON waitlist;
DROP POLICY IF EXISTS "Admins can delete waitlist"           ON waitlist;
DROP POLICY IF EXISTS "Admins can read all partnerships"     ON partnership_requests;
DROP POLICY IF EXISTS "Admins can delete partnerships"       ON partnership_requests;


-- 4. Admin can read all waitlist entries
CREATE POLICY "Admins can read all waitlist" ON waitlist
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );


-- 5. Admin can delete waitlist entries
CREATE POLICY "Admins can delete waitlist" ON waitlist
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );


-- 6. Admin can read all partnership requests
CREATE POLICY "Admins can read all partnerships" ON partnership_requests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );


-- 7. Admin can delete partnership requests
CREATE POLICY "Admins can delete partnerships" ON partnership_requests
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );


-- 8. Verify policies are in place. Should return 4 rows.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('waitlist', 'partnership_requests')
  AND policyname LIKE '%admin%' OR policyname LIKE '%Admin%'
ORDER BY tablename, cmd;



-- =====================================================================
-- AFTER YOU AND VINCENT BOTH SIGN UP VIA /auth, RUN THESE SEPARATELY:
-- =====================================================================
--
-- Replace the email addresses with the actual ones you signed up with.
--
--   UPDATE users SET is_admin = true WHERE email = 'joseey@thebrickstudios.com';
--   UPDATE users SET is_admin = true WHERE email = 'vincent@flowlexx.com';
--
-- Verify it took:
--
--   SELECT id, email, is_admin FROM users WHERE is_admin = true;
--
-- Both rows should appear with is_admin = true.
-- =====================================================================
