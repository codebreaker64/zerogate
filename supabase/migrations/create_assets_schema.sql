-- RWA Asset Issuance Schema
-- Implements "Draft & Approve" workflow for managed asset tokenization

-- Asset Categories Enum
CREATE TYPE asset_category AS ENUM (
  'real_estate',
  'fixed_income',
  'carbon_credits',
  'commodities',
  'infrastructure',
  'art_collectibles'
);

-- Asset Status Enum (Draft & Approve Workflow)
CREATE TYPE asset_status AS ENUM (
  'draft',           -- Company is still editing
  'pending_review',  -- Submitted for admin approval
  'authorized',      -- Admin approved, ready to mint
  'minted',          -- Token minted on XRPL
  'rejected',        -- Admin rejected the submission
  'suspended'        -- Post-mint suspension
);

-- Main Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership & Issuer Info
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
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
  -- Stores asset-specific fields based on category
  asset_metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Legal Documents (IPFS links)
  legal_documents JSONB DEFAULT '[]',
  metadata_uri TEXT, -- Full IPFS metadata link
  
  -- Workflow Status
  status asset_status DEFAULT 'draft',
  
  -- Blockchain Data
  nft_token_id TEXT UNIQUE,
  minting_tx_hash TEXT,
  
  -- Authorization & Review
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES entities(id),
  authorized_at TIMESTAMP WITH TIME ZONE,
  authorization_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  minted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_assets_entity ON assets(entity_id);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(asset_category);
CREATE INDEX idx_assets_issuer ON assets(issuer_address);
CREATE INDEX idx_assets_metadata ON assets USING gin(asset_metadata);

-- Updated timestamp trigger
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table comments
COMMENT ON TABLE assets IS 'RWA assets with draft & approve workflow for managed issuance';
COMMENT ON COLUMN assets.asset_metadata IS 'Polymorphic JSON metadata specific to asset category';
COMMENT ON COLUMN assets.legal_documents IS 'Array of legal document objects with IPFS URIs';
COMMENT ON COLUMN assets.status IS 'Workflow status from draft to minted';

-- Asset Metadata Schema Templates
-- These define the required/optional fields for each asset category

-- Real Estate Metadata Template
COMMENT ON COLUMN assets.asset_metadata IS '
Real Estate Example:
{
  "property_address": "123 Marina Bay, Singapore",
  "gross_leasable_area": 50000,
  "occupancy_rate": 95.5,
  "valuation_date": "2026-01-01",
  "property_type": "Commercial Office",
  "year_built": 2020,
  "rental_yield": 4.2
}

Fixed Income Example:
{
  "maturity_date": "2030-12-31",
  "coupon_rate": 5.5,
  "payment_frequency": "Semi-Annual",
  "face_value": 1000000,
  "credit_rating": "AA",
  "bond_type": "Corporate Bond"
}

Carbon Credits Example:
{
  "project_type": "Reforestation",
  "vintage_year": 2025,
  "registry_id": "VCS-1234",
  "registry": "Verra",
  "total_credits": 10000,
  "verification_standard": "VCS"
}
';

-- Asset History Table (Audit Trail)
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

CREATE INDEX idx_asset_history_asset ON asset_history(asset_id);
CREATE INDEX idx_asset_history_changed_at ON asset_history(changed_at);

COMMENT ON TABLE asset_history IS 'Audit trail of all asset status changes and modifications';

-- Sample Data (Optional - for testing)
/*
INSERT INTO assets (
  entity_id, 
  issuer_address, 
  asset_name, 
  asset_category,
  description,
  total_value,
  asset_metadata,
  legal_documents,
  status
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000', -- Replace with actual entity_id
  'rN7n7otQDd6FczFgLdhmKbnKT5p6Yx9YGX',
  'Marina Bay Office Tower',
  'real_estate',
  'Prime commercial office space in Singapore CBD',
  50000000.00,
  '{
    "property_address": "1 Marina Boulevard, Singapore 018989",
    "gross_leasable_area": 50000,
    "occupancy_rate": 95.5,
    "valuation_date": "2026-01-01",
    "property_type": "Commercial Office",
    "year_built": 2020,
    "rental_yield": 4.2
  }'::jsonb,
  '[{
    "name": "Title Deed",
    "uri": "ipfs://QmExample123",
    "hash": "sha256_checksum_here",
    "type": "legal_deed"
  }]'::jsonb,
  'draft'
);
*/
