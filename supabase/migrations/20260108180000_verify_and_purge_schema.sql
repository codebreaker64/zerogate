-- ============================================================================
-- Verify & Purge Schema Updates (Strict Mode)
-- User Requirement: Data Purged from Entities, retained only in Credentials (Metadata)
-- ============================================================================

-- 1. Fix kyb_applications Foreign Key in Assets
-- Allow deleting KYB App by unlinking assets
ALTER TABLE assets
DROP CONSTRAINT IF EXISTS assets_kyb_application_id_fkey;

ALTER TABLE assets
ADD CONSTRAINT assets_kyb_application_id_fkey
FOREIGN KEY (kyb_application_id)
REFERENCES kyb_applications(id)
ON DELETE SET NULL;

-- 2. Clean up Credentials Table
-- Remove link to KYB App (since it will be deleted)
ALTER TABLE credentials DROP COLUMN IF EXISTS kyb_application_id;

-- Remove 'approved_by' if it caused FK issues (Admin vs Entity mismatch) or user request
ALTER TABLE credentials DROP COLUMN IF EXISTS approved_by;

-- Add XLS-70d Support
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS credential_metadata JSONB DEFAULT '{}';
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS credential_schema TEXT;
ALTER TABLE credentials ADD COLUMN IF NOT EXISTS issuer_did TEXT;


-- 3. Strict Purge of Entities Table
-- Remove sensitive business data columns entirely.
ALTER TABLE entities DROP COLUMN IF EXISTS company_uen;
ALTER TABLE entities DROP COLUMN IF EXISTS corporate_email;
ALTER TABLE entities DROP COLUMN IF EXISTS industry;

-- 4. Link Entity to Credential
-- Add credential_id for fast lookup
ALTER TABLE entities
ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES credentials(id);

-- ============================================================================
-- End Migration
-- ============================================================================
