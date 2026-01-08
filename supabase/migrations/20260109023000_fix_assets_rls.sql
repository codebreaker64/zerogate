-- Enable RLS to ensure predictable behavior
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to clean up potential conflicts (best effort)
DROP POLICY IF EXISTS "Public Read Authorized Assets" ON assets;
DROP POLICY IF EXISTS "Authenticated Read All Assets" ON assets;
DROP POLICY IF EXISTS "Authenticated Insert Assets" ON assets;
DROP POLICY IF EXISTS "Authenticated Update Assets" ON assets;

-- 1. Allow everyone (public/anon) to see Authorized assets (Marketplace)
CREATE POLICY "Public Read Authorized Assets"
ON assets FOR SELECT
USING (status = 'authorized');

-- 2. Allow Authenticated Users (Admins & Businesses) to see ALL assets (Review Desk, Dashboard)
CREATE POLICY "Authenticated Read All Assets"
ON assets FOR SELECT
TO authenticated
USING (true);

-- 3. Allow Authenticated to Insert (Business submitting draft)
CREATE POLICY "Authenticated Insert Assets"
ON assets FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Allow Authenticated to Update (Admin approving, Business editing draft)
CREATE POLICY "Authenticated Update Assets"
ON assets FOR UPDATE
TO authenticated
USING (true);
