-- Relax RLS to allow anon demo KYC submissions

DO $$ BEGIN
    CREATE POLICY "Anon select kyc" ON kyc_applications
        FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Anon insert kyc" ON kyc_applications
        FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Anon update kyc" ON kyc_applications
        FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
