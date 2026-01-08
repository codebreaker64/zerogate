// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req: Request) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Auth Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Admin Client (Service Role) - Use this for Auth Check AND DB Ops
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate User Token (Bypass Anon Key issues)
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth User Error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required', details: userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, applicationId, entityId, issuerAddress } = await req.json();

    if (!issuerAddress) {
      throw new Error('Missing issuerAddress (Admin Wallet)');
    }

    if (action === 'approve_kyb') {
      if (!applicationId || !entityId) {
        throw new Error('Missing applicationId or entityId');
      }

      // A. Fetch current data
      const { data: kybData, error: kybFetchError } = await supabaseAdmin
        .from('kyb_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (kybFetchError) throw new Error('KYB Application not found');

      // B. Issue Credential Payload
      const credentialPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", "BusinessIdentity"],
        "issuer": issuerAddress, // Use Admin Wallet Address
        "issuanceDate": new Date().toISOString(),
        "credentialSubject": {
          "id": `did:xrpl:${kybData.director_wallet_address}`,
          "legalName": kybData.legal_entity_name,
          "registrationNumber": kybData.business_reg_number,
          "incorporationCountry": kybData.registered_address
        },
        "proof": {
          "type": "Ed25519Signature2018",
          "created": new Date().toISOString(),
          "proofPurpose": "assertionMethod",
          "verificationMethod": `${issuerAddress}#key-1`,
          "jws": "mock_signature_string"
        }
      };

      // C. Insert Credential
      // Note: Not linking 'kyb_application_id' because we delete the KYB app (Purge)
      const { data: cred, error: credError } = await supabaseAdmin
        .from('credentials')
        .insert([{
          entity_id: entityId,
          wallet_address: kybData.director_wallet_address,
          credential_type: 'BusinessIdentity',
          status: 'active',
          issuer_did: issuerAddress, // Use Admin Wallet Address
        }])
        .select()
        .single();

      if (credError) {
        console.error("Credential Insert Error:", credError);
        throw new Error('Failed to issue credential (Insert): ' + credError.message);
      }

      // Update metadata separately (if column exists)
      const { error: metaError } = await supabaseAdmin
        .from('credentials')
        .update({
          credential_metadata: credentialPayload,
        })
        .eq('id', cred.id);

      if (metaError) console.warn("Metadata update warning:", metaError);

      // D. Update Entity (Status Only)
      const { error: entityError } = await supabaseAdmin
        .from('entities')
        .update({
          status: 'active',
          credential_id: cred.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId);

      if (entityError) {
        throw new Error('Failed to update entity: ' + entityError.message);
      }

      // E. DELETE KYB Application (Purge Data)
      const { error: deleteError } = await supabaseAdmin
        .from('kyb_applications')
        .delete()
        .eq('id', applicationId);

      if (deleteError) {
        console.error("Delete KYB Error:", deleteError);
        throw new Error('Failed to purge KYB application: ' + deleteError.message);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Approved, Credential Issued, and Data Purged.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'reject_kyb') {
      return new Response(
        JSON.stringify({ error: 'Reject not implemented yet' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("ADMIN ACTION ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
