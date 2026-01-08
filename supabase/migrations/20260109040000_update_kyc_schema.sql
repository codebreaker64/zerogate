-- Align KYC Applications schema with Assets schema
-- document_url -> documents (JSONB array, like assets.legal_documents)
-- selfie_url -> selfie_uri (TEXT, like assets.image_uri)

DO $$ 
BEGIN
    -- Update document_url to documents (JSONB)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_applications' AND column_name = 'document_url') THEN
        ALTER TABLE kyc_applications DROP COLUMN document_url;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_applications' AND column_name = 'documents') THEN
        ALTER TABLE kyc_applications ADD COLUMN documents JSONB DEFAULT '[]';
        COMMENT ON COLUMN kyc_applications.documents IS 'Array of document objects with URI and metadata, matching assets.legal_documents';
    END IF;

    -- Update selfie_url to selfie_uri (TEXT) for consistency with assets.image_uri
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_applications' AND column_name = 'selfie_url') THEN
        ALTER TABLE kyc_applications RENAME COLUMN selfie_url TO selfie_uri;
    END IF;
END $$;
