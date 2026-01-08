-- ============================================================================
-- ZeroGate Complete Database Schema
-- Combines: Entities, KYB, Assets, Credentials, Payments
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: ENTITIES & WALLET AUTHENTICATION (SIWX)
-- ============================================================================

-- Entities table for wallet-based authentication
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Wallet Information
  wallet_address TEXT UNIQUE NOT NULL,
  
  -- Business Information
  company_name TEXT,
  company_uen TEXT,
  corporate_email TEXT,
  industry TEXT,
  country TEXT DEFAULT 'Singapore',
  
  -- Status Tracking
  status TEXT DEFAULT 'pending_onboarding' CHECK (status IN (
    'pending_onboarding',
    'active',
    'pending_kyb',
    'suspended',
    'revoked'
  )),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  onboarded_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_wallet ON entities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);

COMMENT ON TABLE entities IS 'Institutional entities with hybrid wallet + business profile authentication';

-- ============================================================================
-- PART 2: KYB APPLICATIONS
-- ============================================================================

-- KYB Applications table for business verification
CREATE TABLE IF NOT EXISTS kyb_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to entity
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    
    -- Business Details
    legal_entity_name TEXT NOT NULL,
    business_reg_number TEXT,
    director_wallet_address TEXT NOT NULL,
    business_type TEXT,
    incorporation_date DATE,
    registered_address TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'under_review'
    )),
    credential_status TEXT,
    
    -- Review timestamps
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    credential_claimed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyb_entity ON kyb_applications(entity_id);
CREATE INDEX IF NOT EXISTS idx_kyb_wallet ON kyb_applications(director_wallet_address);
CREATE INDEX IF NOT EXISTS idx_kyb_status ON kyb_applications(status);

-- ============================================================================
-- PART 3: ASSETS (Polymorphic Metadata + Draft & Approve)
-- ============================================================================

-- Asset Categories Enum
DO $$ BEGIN
    CREATE TYPE asset_category AS ENUM (
        'real_estate',
        'fixed_income',
        'carbon_credits',
        'commodities',
        'infrastructure',
        'art_collectibles'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Asset Status Enum
DO $$ BEGIN
    CREATE TYPE asset_status AS ENUM (
        'draft',
        'pending_review',
        'authorized',
        'minted',
        'rejected',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership & Issuer Info
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  kyb_application_id UUID REFERENCES kyb_applications(id),
  issuer_address TEXT NOT NULL,
  
  -- Basic Asset Information
  asset_name TEXT NOT NULL,
  asset_category asset_category NOT NULL,
  description TEXT,
  image_uri TEXT,
  
  -- Financial Data
  total_value DECIMAL(20, 2),
  currency TEXT DEFAULT 'USD',
  min_investment DECIMAL(20, 2),
  
  -- Polymorphic Metadata (JSON)
  asset_metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Legal Documents (IPFS links)
  legal_documents JSONB DEFAULT '[]',
  metadata_uri TEXT,
  
  -- Workflow Status
  status asset_status DEFAULT 'draft',
  
  -- Blockchain Data
  nft_token_id TEXT UNIQUE,
  nft_id TEXT, -- Legacy compatibility
  minting_tx_hash TEXT,
  
  -- Authorization & Review
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES entities(id),
  authorized_by UUID REFERENCES entities(id),
  authorized_at TIMESTAMP WITH TIME ZONE,
  authorization_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  minted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_assets_entity ON assets(entity_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(asset_category);
CREATE INDEX IF NOT EXISTS idx_assets_issuer ON assets(issuer_address);
CREATE INDEX IF NOT EXISTS idx_assets_metadata ON assets USING gin(asset_metadata);

COMMENT ON TABLE assets IS 'RWA assets with draft & approve workflow and polymorphic metadata';

-- ============================================================================
-- PART 4: ASSET HISTORY (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  
  -- Change Details
  previous_status asset_status,
  new_status asset_status NOT NULL,
  changed_by UUID REFERENCES entities(id),
  change_reason TEXT,
  
  -- Metadata Snapshot
  metadata_snapshot JSONB,
  
  -- Timestamp
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_changed_at ON asset_history(changed_at);

-- ============================================================================
-- PART 5: CREDENTIALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- References
    kyb_application_id UUID REFERENCES kyb_applications(id),
    entity_id UUID REFERENCES entities(id),
    wallet_address TEXT NOT NULL,
    
    -- Credential Details
    credential_type TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',
        'revoked',
        'expired'
    )),
    
    -- Timestamps
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_credentials_kyb ON credentials(kyb_application_id);
CREATE INDEX IF NOT EXISTS idx_credentials_entity ON credentials(entity_id);
CREATE INDEX IF NOT EXISTS idx_credentials_wallet ON credentials(wallet_address);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);

-- ============================================================================
-- PART 6: PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Transaction Details
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount NUMERIC,
    currency TEXT,
    
    -- References
    asset_id UUID REFERENCES assets(id),
    entity_id UUID REFERENCES entities(id),
    
    -- Blockchain
    tx_hash TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',
        'completed',
        'failed',
        'refunded'
    )),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_asset ON payments(asset_id);
CREATE INDEX IF NOT EXISTS idx_payments_entity ON payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_from ON payments(from_address);
CREATE INDEX IF NOT EXISTS idx_payments_to ON payments(to_address);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- PART 7: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kyb_updated_at ON kyb_applications;
CREATE TRIGGER update_kyb_updated_at
    BEFORE UPDATE ON kyb_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyb_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated access" ON kyb_applications;
DROP POLICY IF EXISTS "Allow authenticated access" ON assets;
DROP POLICY IF EXISTS "Allow authenticated access" ON payments;
DROP POLICY IF EXISTS "Allow authenticated access" ON credentials;

-- Create RLS policies
CREATE POLICY "Allow authenticated read" ON entities 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access" ON kyb_applications 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access" ON assets 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read" ON asset_history 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access" ON payments 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access" ON credentials 
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- PART 9: SAMPLE DATA (Optional - Comment out in production)
-- ============================================================================

/*
-- Sample Entity
INSERT INTO entities (wallet_address, company_name, company_uen, corporate_email, industry, status, onboarded_at)
VALUES 
  ('rN7n7otQDd6FczFgLdhmKbnKT5p6Yx9YGX', 'Acme Capital Pte Ltd', '202012345A', 'director@acmecapital.com', 'venture_capital', 'active', NOW());

-- Sample KYB Application
INSERT INTO kyb_applications (legal_entity_name, business_reg_number, director_wallet_address, business_type, status)
VALUES 
  ('Acme Capital Pte Ltd', '202012345A', 'rN7n7otQDd6FczFgLdhmKbnKT5p6Yx9YGX', 'Venture Capital', 'approved');
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify everything was created correctly:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
