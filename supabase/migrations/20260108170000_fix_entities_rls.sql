-- Fix RLS policies for entities table to allow onboarding
-- Enable full access for authenticated users to update their own entity data
DROP POLICY IF EXISTS "Allow authenticated read" ON entities;
DROP POLICY IF EXISTS "Allow authenticated access" ON entities;

-- Allow SELECT, INSERT, UPDATE for authenticated users
CREATE POLICY "Allow authenticated access" ON entities
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Also verify other tables are accessible
-- (They were already set to ALL in 00_complete_schema.sql)
