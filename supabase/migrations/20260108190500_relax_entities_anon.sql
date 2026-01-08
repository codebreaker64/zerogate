-- Relax RLS to permit anon upsert during wallet onboarding (client-side anon key)

-- Entities: allow anon select/insert/update
DO $$ BEGIN
    CREATE POLICY "Anon select entities" ON entities
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Anon insert entities" ON entities
        FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Anon update entities" ON entities
        FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- KYB applications: allow anon insert/select (demo onboarding)
DO $$ BEGIN
    CREATE POLICY "Anon select kyb" ON kyb_applications
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Anon insert kyb" ON kyb_applications
        FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
