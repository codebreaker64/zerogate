-- Update Asset Categories for Specific RWA Tokenization
-- Replacing generic categories with specific asset types

-- Drop the old enum and recreate with new values
ALTER TABLE assets ALTER COLUMN asset_category TYPE TEXT;
DROP TYPE IF EXISTS asset_category CASCADE;

CREATE TYPE asset_category AS ENUM (
  'real_estate',
  'fixed_income',
  'commodities',
  'luxury_assets',
  'trade_finance',
  'intangibles'
);

ALTER TABLE assets ALTER COLUMN asset_category TYPE asset_category USING asset_category::asset_category;

-- Add image_uri column if it doesn't exist (for asset images)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS image_uris JSONB DEFAULT '[]';

-- Update comments for clarity
COMMENT ON COLUMN assets.asset_category IS 'Real Estate: A specific land title, house, or commercial unit. Fixed Income: A specific corporate bond or 12-month loan. Commodities: A specific gold bar or batch of carbon credits. Luxury Assets: A specific watch, art, or rare vehicle. Trade Finance: A specific invoice or bill of lading. Intangibles: A specific patent, royalty contract, or software license.';
COMMENT ON COLUMN assets.image_uris IS 'Array of image URLs for the asset';
