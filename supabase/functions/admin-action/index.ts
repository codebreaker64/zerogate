// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as xrpl from 'https://esm.sh/xrpl@2.14.0?bundle';

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

    // Parse ALL possible request fields at once (body can only be read once)
    const body = await req.json();
    const {
      action,
      applicationId,
      entityId,
      issuerAddress,
      assetId,      // For approve_asset / reject_asset
      reason,       // For reject_asset
      credentialId, // For revoke_credential
      targetWalletAddress // For revoke_credential
    } = body;

    // issuerAddress only required for KYB approval
    if (action === 'approve_kyb' && !issuerAddress) {
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

      // F. Update Users Table (Sync Credential ID for Marketplace verification)
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          credential_id: cred.id,
          role: 'business' // Reinforce role
        })
        .eq('wallet_address', kybData.director_wallet_address);

      if (userUpdateError) {
        console.warn('Failed to update users table with credential:', userUpdateError);
        // Non-critical, but good for logging
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
    } else if (action === 'approve_kyc') {
      const { applicationId, walletAddress } = body; // walletAddress from app
      if (!applicationId || !walletAddress) {
        throw new Error('Missing applicationId or walletAddress');
      }

      // A. Fetch KYC Data
      const { data: kycData, error: kycFetchError } = await supabaseAdmin
        .from('kyc_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (kycFetchError) throw new Error('KYC Application not found');

      // B. Ensure Auth User Exists (Create if not)
      let userId = null;
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find(u =>
        u.email === walletAddress || u.user_metadata?.wallet_address === walletAddress
      );

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user (Passwordless/Wallet style - using email as wallet address for uniqueness placeholder)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: `${walletAddress}@zerogate.place`, // Dummy email
          email_confirm: true,
          user_metadata: { wallet_address: walletAddress, role: 'consumer' }
        });
        if (createError) throw new Error('Failed to create auth user: ' + createError.message);
        userId = newUser.user.id;
      }

      // C. Ensure Entity Exists (Upsert)
      // Note: Using 'name' instead of 'company_name'
      const { data: entity, error: entityError } = await supabaseAdmin
        .from('entities')
        .upsert({
          wallet_address: walletAddress,
          name: kycData.full_name,
          account_type: 'consumer',
          status: 'active',
          updated_at: new Date().toISOString()
        }, { onConflict: 'wallet_address' })
        .select()
        .single();

      if (entityError) throw new Error('Failed to create/update entity: ' + entityError.message);

      // D. Issue Credential
      // Use Admin Wallet as Issuer (passed in body or env?)
      const finalIssuer = issuerAddress || Deno.env.get('ADMIN_WALLET_ADDRESS');
      // If issuerAddress is not passed, this might fail if env is missing. 
      // But for now assume issuerAddress is passed from frontend.

      const credentialPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", "PersonalIdentity"],
        "issuer": finalIssuer,
        "issuanceDate": new Date().toISOString(),
        "credentialSubject": {
          "id": `did:xrpl:${walletAddress}`,
          "name": kycData.full_name,
          "nationality": kycData.country,
          "birthDate": kycData.date_of_birth
        }
      };

      const { data: cred, error: credError } = await supabaseAdmin
        .from('credentials')
        .insert([{
          entity_id: entity.id,
          wallet_address: walletAddress,
          credential_type: 'PersonalIdentity',
          status: 'active',
          issuer_did: finalIssuer,
          credential_metadata: credentialPayload
        }])
        .select()
        .single();

      if (credError) throw new Error('Failed to issue credential: ' + credError.message);

      // E. Link Credential to Entity & User
      await supabaseAdmin.from('entities').update({ credential_id: cred.id }).eq('id', entity.id);

      // Update Users table if exists
      // Check if 'users' table exists and has row?
      // Assuming 'users' is a public profile table triggered from auth?
      await supabaseAdmin.from('users').upsert({
        id: userId,
        wallet_address: walletAddress,
        role: 'consumer',
        credential_id: cred.id
      }, { onConflict: 'wallet_address' });


      // F. PURGE KYC Data
      const { error: purgeError } = await supabaseAdmin
        .from('kyc_applications')
        .delete()
        .eq('id', applicationId);

      if (purgeError) throw new Error('Failed to purge KYC data: ' + purgeError.message);

      return new Response(
        JSON.stringify({ success: true, message: 'KYC Approved, User Onboarded, Data Purged.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'revoke_credential') {
      // credentialId, entityId, targetWalletAddress already parsed from body

      if (!credentialId || !entityId) {
        throw new Error('Missing credentialId or entityId');
      }

      console.log(`Revoking credential ${credentialId} for entity ${entityId}`);

      // 1. Delete Auth User FIRST (by email = wallet address)
      if (targetWalletAddress) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (!listError && users) {
          const targetUser = users.find(u =>
            u.email === targetWalletAddress || // Email is wallet address in SIWX
            u.user_metadata?.wallet_address === targetWalletAddress
          );

          if (targetUser) {
            console.log(`Deleting Auth User: ${targetUser.id}`);
            const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
            if (deleteUserError) {
              console.error('Failed to delete auth user:', deleteUserError);
              throw new Error('Failed to delete auth user: ' + deleteUserError.message);
            }
          } else {
            console.warn("Auth user not found for wallet:", targetWalletAddress);
          }
        }
      }

      // 2. Null credential_id from entities table
      const { error: entityUpdateError } = await supabaseAdmin
        .from('entities')
        .update({ credential_id: null })
        .eq('id', entityId);

      if (entityUpdateError) {
        console.error('Failed to clear credential from entity:', entityUpdateError);
        throw new Error('Failed to update entity: ' + entityUpdateError.message);
      }

      // 3. Null entity_id from credentials table
      const { error: credUpdateError } = await supabaseAdmin
        .from('credentials')
        .update({ entity_id: null })
        .eq('id', credentialId);

      if (credUpdateError) {
        console.error('Failed to clear entity from credential:', credUpdateError);
        throw new Error('Failed to update credential: ' + credUpdateError.message);
      }

      // 4. Delete Credential
      const { error: credError } = await supabaseAdmin
        .from('credentials')
        .delete()
        .eq('id', credentialId);

      if (credError) {
        console.error("Delete Credential Error:", credError);
        throw new Error('Failed to delete credential: ' + credError.message);
      }

      // 5. Delete Entity
      const { error: entityError } = await supabaseAdmin
        .from('entities')
        .delete()
        .eq('id', entityId);

      if (entityError) {
        console.error("Delete Entity Error:", entityError);
        throw new Error('Failed to delete entity: ' + entityError.message);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Credential revoked and entity purged.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'approve_asset') {
      // assetId already parsed from body
      if (!assetId) throw new Error('Missing assetId');

      console.log(`Approving and minting asset ${assetId}`);

      // 1. Fetch asset details for NFT metadata
      const { data: asset, error: fetchError } = await supabaseAdmin
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single();

      if (fetchError || !asset) {
        throw new Error('Asset not found: ' + (fetchError?.message || 'Unknown error'));
      }

      // 2. Mint NFT on XRPL
      const ISSUER_SEED = Deno.env.get('XRPL_ISSUER_SEED');
      if (!ISSUER_SEED) throw new Error('XRPL_ISSUER_SEED not configured');

      const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
      await client.connect();

      const issuerWallet = xrpl.Wallet.fromSeed(ISSUER_SEED);
      console.log('Issuer wallet address:', issuerWallet.address);

      // Create NFT metadata URI
      const nftMetadata = JSON.stringify({
        name: asset.asset_name,
        description: asset.description,
        category: asset.asset_category,
        value: asset.total_value,
        currency: asset.currency || 'RLUSD',
        jurisdiction: asset.asset_jurisdiction,
        spv: asset.issuing_spv,
        images: asset.image_uris || []
      });

      // Convert metadata to hex for URI (Deno compatible)
      const encoder = new TextEncoder();
      const data = encoder.encode(nftMetadata);
      const uriHex = Array.from(data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

      // Mint NFT
      const mintTx = {
        TransactionType: 'NFTokenMint',
        Account: issuerWallet.address,
        URI: uriHex,
        Flags: 8,
        TransferFee: 0,
        NFTokenTaxon: 0
      };

      const prepared = await client.autofill(mintTx);
      const signed = issuerWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      console.log('NFT Mint Result:', result);

      if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
        await client.disconnect();
        throw new Error('NFT minting failed: ' + result.result.meta.TransactionResult);
      }

      // Extract NFT Token ID
      const nftTokenID = result.result.meta.nftoken_id ||
        result.result.meta.AffectedNodes?.find(
          (n: any) => n.CreatedNode?.NewFields?.NFTokens
        )?.CreatedNode?.NewFields?.NFTokens?.[0]?.NFToken?.NFTokenID;

      if (!nftTokenID) {
        await client.disconnect();
        throw new Error('Failed to extract NFT Token ID from transaction');
      }

      await client.disconnect();

      console.log('Minted NFT Token ID:', nftTokenID);
      console.log('Transaction Hash:', result.result.hash);

      // 3. Update asset with NFT details
      const { error } = await supabaseAdmin
        .from('assets')
        .update({
          status: 'authorized',
          nft_token_id: nftTokenID,
          nft_id: nftTokenID,
          minting_tx_hash: result.result.hash,
          reviewed_by: user.id,
          minted_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Asset Authorized and NFT Minted',
          nft_token_id: nftTokenID,
          tx_hash: result.result.hash
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reject_asset') {
      // assetId, reason already parsed from body
      if (!assetId || !reason) throw new Error('Missing assetId or rejection reason');

      const { error } = await supabaseAdmin
        .from('assets')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', assetId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Asset Rejected' }),
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
