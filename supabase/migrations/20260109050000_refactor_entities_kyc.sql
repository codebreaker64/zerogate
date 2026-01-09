-- Rename company_name to name
ALTER TABLE public.entities RENAME COLUMN company_name TO name;

-- Drop kyc_status and kyc_submitted_at
ALTER TABLE public.entities DROP COLUMN IF EXISTS kyc_status;
ALTER TABLE public.entities DROP COLUMN IF EXISTS kyc_submitted_at;

-- Update status constraint to include pending_kyc
ALTER TABLE public.entities DROP CONSTRAINT IF EXISTS entities_status_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_status_check CHECK (
  status = ANY (ARRAY[
    'pending_onboarding'::text,
    'active'::text,
    'pending_kyb'::text,
    'pending_kyc'::text,
    'suspended'::text,
    'revoked'::text
  ])
);
