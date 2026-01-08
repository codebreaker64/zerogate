// @ts-nocheck - This is a Deno Edge Function with Deno-specific types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client, Wallet } from 'https://esm.sh/xrpl@2.9.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Initialize Supabase client with service role key
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Verify admin authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid authentication token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if user is admin
        if (user.user_metadata?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { applicationId } = await req.json();

        if (!applicationId) {
            return new Response(
                JSON.stringify({ error: 'Missing applicationId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get application from database
        const { data: application, error: dbError } = await supabase
            .from('kyb_applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (dbError || !application) {
            return new Response(
                JSON.stringify({ error: 'Application not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get issuer seed from environment (NEVER hardcode!)
        const issuerSeed = Deno.env.get('ISSUER_SEED');
        if (!issuerSeed) {
            console.error('ISSUER_SEED not configured');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Connect to XRPL
        const xrplClient = new Client('wss://s.altnet.rippletest.net:51233');
        await xrplClient.connect();

        try {
            // Create wallet from seed
            const issuerWallet = Wallet.fromSeed(issuerSeed);
            console.log('Issuing credential from:', issuerWallet.address);
            console.log('Issuing credential to:', application.director_wallet_address);

            // Create credential transaction (Payment with Memo)
            const credentialTx = {
                TransactionType: 'Payment',
                Account: issuerWallet.address,
                Destination: application.director_wallet_address,
                Amount: '1', // 1 drop
                Memos: [
                    {
                        Memo: {
                            MemoType: Buffer.from('CredentialType').toString('hex'),
                            MemoData: Buffer.from('CorporateAccreditedInvestor').toString('hex'),
                            MemoFormat: Buffer.from('text/plain').toString('hex')
                        }
                    }
                ]
            };

            // Prepare and sign transaction
            const prepared = await xrplClient.autofill(credentialTx);
            const signed = issuerWallet.sign(prepared);

            // Submit and wait for validation
            const result = await xrplClient.submitAndWait(signed.tx_blob);

            // Check if transaction was successful
            if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
                throw new Error(`Transaction failed: ${result.result.meta.TransactionResult}`);
            }

            const txHash = result.result.hash;
            console.log('Credential issued successfully:', txHash);

            // Update application in database
            const { error: updateError } = await supabase
                .from('kyb_applications')
                .update({
                    status: 'approved',
                    credential_status: 'pending_claim',
                    approved_at: new Date().toISOString(),
                    approved_by: user.id,
                    credential_hash: txHash
                })
                .eq('id', applicationId);

            if (updateError) {
                console.error('Failed to update application:', updateError);
                // Continue anyway - credential was issued
            }

            // Create credential record
            const { error: credentialError } = await supabase
                .from('credentials')
                .insert({
                    kyb_application_id: applicationId,
                    wallet_address: application.director_wallet_address,
                    credential_type: 'CorporateAccreditedInvestor',
                    status: 'pending_claim',
                    issued_at: new Date().toISOString(),
                    tx_hash: txHash
                });

            if (credentialError) {
                console.error('Failed to create credential record:', credentialError);
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    hash: txHash,
                    application: {
                        id: application.id,
                        legal_entity_name: application.legal_entity_name,
                        status: 'approved'
                    }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

        } finally {
            await xrplClient.disconnect();
        }

    } catch (error: unknown) {
        console.error('Error in issue-credential function:', error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message || 'Internal server error',
                details: (error as Error).stack
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
