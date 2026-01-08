-- RUN THIS IN SUPABASE SQL EDITOR
-- Dashboard: https://supabase.com/dashboard/project/ikytcaoopklycygrvefk/sql/new

-- Add NFT minting tracking columns to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS nft_id TEXT,
ADD COLUMN IF NOT EXISTS minting_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS minted_at TIMESTAMPTZ;

-- Add indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_assets_nft_token_id ON assets(nft_token_id);
CREATE INDEX IF NOT EXISTS idx_assets_minting_tx_hash ON assets(minting_tx_hash);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN ('nft_id', 'minting_tx_hash', 'reviewed_by', 'minted_at')
ORDER BY column_name;
