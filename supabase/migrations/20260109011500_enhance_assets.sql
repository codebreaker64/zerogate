-- Enhancements for Institutional Asset Metadata
-- Supports SPV, Jurisdiction, Tokenomics, and Legal Docs

-- 1. Schema Updates
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS issuing_spv TEXT,
ADD COLUMN IF NOT EXISTS asset_jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS total_supply NUMERIC,
ADD COLUMN IF NOT EXISTS ticker_symbol TEXT,
ADD COLUMN IF NOT EXISTS valuation_date DATE,
ADD COLUMN IF NOT EXISTS appraiser_name TEXT;

COMMENT ON COLUMN assets.issuing_spv IS 'Legal Wrapper / SPV Name owning the asset';
COMMENT ON COLUMN assets.asset_metadata IS 'Polymorphic metadata (Type-specific fields like GLA, Yield, Maturity)';

-- 2. Storage Setup (for Legal Documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-docs', 'asset-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading of documents (e.g. for audits)
DROP POLICY IF EXISTS "Public Read Documents" ON storage.objects;
CREATE POLICY "Public Read Documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'asset-docs' );

-- Policies for authenticated upload (Admins)
DROP POLICY IF EXISTS "Authenticated Upload Documents" ON storage.objects;
CREATE POLICY "Authenticated Upload Documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'asset-docs' AND auth.role() = 'authenticated' );
