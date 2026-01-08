-- SIWX Authentication Schema
-- This creates the entities table for hybrid wallet + business profile authentication

-- Create entities table
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

-- Create index for fast wallet address lookups
CREATE INDEX IF NOT EXISTS idx_entities_wallet ON entities(wallet_address);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE entities IS 'Institutional entities with hybrid wallet + business profile authentication';
COMMENT ON COLUMN entities.wallet_address IS 'XRPL wallet address used for SIWX authentication';
COMMENT ON COLUMN entities.company_uen IS 'Singapore Unique Entity Number';
COMMENT ON COLUMN entities.corporate_email IS 'Corporate email for compliance notifications';
COMMENT ON COLUMN entities.status IS 'Entity verification status';

-- Sample data for testing (optional)
-- INSERT INTO entities (wallet_address, company_name, company_uen, corporate_email, industry, status, onboarded_at)
-- VALUES 
--   ('rN7n7otQDd6FczFgLdhmKbnKT5p6Yx9YGX', 'Acme Capital Pte Ltd', '202012345A', 'director@acmecapital.com', 'venture_capital', 'active', NOW()),
--   ('rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY', 'Beta Ventures', '202098765B', 'admin@betaventures.sg', 'private_equity', 'active', NOW());
