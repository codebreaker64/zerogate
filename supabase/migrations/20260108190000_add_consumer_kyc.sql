-- Add consumer account type, KYC status, and consumer KYC applications

-- Entities extensions
ALTER TABLE entities
    ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'business' CHECK (account_type IN ('business', 'consumer')),
    ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'under_review', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES credentials(id);

CREATE INDEX IF NOT EXISTS idx_entities_account_type ON entities(account_type);
CREATE INDEX IF NOT EXISTS idx_entities_kyc_status ON entities(kyc_status);

-- Consumer KYC applications
CREATE TABLE IF NOT EXISTS kyc_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    country TEXT,
    id_type TEXT,
    id_number TEXT,
    document_url TEXT,
    selfie_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    reviewer_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_entity ON kyc_applications(entity_id);
CREATE INDEX IF NOT EXISTS idx_kyc_wallet ON kyc_applications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_applications(status);

-- Updated timestamp trigger for consumer KYC applications
DROP TRIGGER IF EXISTS update_kyc_app_updated_at ON kyc_applications;
CREATE TRIGGER update_kyc_app_updated_at
    BEFORE UPDATE ON kyc_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE kyc_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated access" ON kyc_applications;
CREATE POLICY "Allow authenticated access" ON kyc_applications
    FOR ALL USING (auth.role() = 'authenticated');
