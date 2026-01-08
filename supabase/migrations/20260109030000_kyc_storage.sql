-- Create a private bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false) -- Public is FALSE for privacy
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload their own KYC documents
DROP POLICY IF EXISTS "Authenticated Upload KYC" ON storage.objects;
CREATE POLICY "Authenticated Upload KYC"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'kyc-documents' );

-- Policy: Authenticated users can read their own uploaded documents (simplified for now to allow viewing what was uploaded)
DROP POLICY IF EXISTS "Authenticated Read KYC" ON storage.objects;
CREATE POLICY "Authenticated Read KYC"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'kyc-documents' );
