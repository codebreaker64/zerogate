-- Add rejection_reason to assets table for Audit Review Trail
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
