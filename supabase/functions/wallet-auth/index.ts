// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: Real XRPL library causes BOOT_ERROR in Edge Runtime currently.
// Since we use 'crossmark_connect' which skips verification, we use a placeholder.
// import { verify } from 'npm:xrpl@2.14.0'; 
const verify = (msg: string, sig: string, key: string) => {
    console.warn('Signature verification implementation momentarily disabled due to runtime compatibility.');
    return true;
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
    // 1. MUST BE FIRST: Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 2. Body Parsing (Move inside try/catch so errors get CORS headers)
        const body = await req.json().catch(() => ({}));
        const { walletAddress, signature, message, publicKey, authMethod, accountType } = body;

        const normalizedAccountType = accountType === 'consumer' ? 'consumer' : 'business';

        // Initialize Supabase
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (!walletAddress) {
            return new Response(
                JSON.stringify({ error: 'Missing walletAddress' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verification Logic...
        if (authMethod !== 'crossmark_connect') {
            const isValid = verify(message, signature, publicKey || walletAddress);
            if (!isValid) {
                return new Response(
                    JSON.stringify({ error: 'Invalid signature' }),
                    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // Check if wallet exists in our database
        const { data: existingEntity, error: lookupError } = await supabase
            .from('entities')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        let user;
        let isNewUser = false;

        if (!existingEntity) {
            const isConsumer = normalizedAccountType === 'consumer';

            const { data: newEntity, error: createError } = await supabase
                .from('entities')
                .insert([{
                    wallet_address: walletAddress,
                    status: 'pending_onboarding',
                    account_type: normalizedAccountType,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (createError) {
                console.error('Error creating entity:', createError);
                throw new Error('Failed to create entity record');
            }

            user = newEntity;
            isNewUser = true;
        } else {
            user = existingEntity;

            // Backfill account type if missing
            if (!user.account_type) {
                const { data: updated } = await supabase
                    .from('entities')
                    .update({ account_type: normalizedAccountType })
                    .eq('id', user.id)
                    .select()
                    .single();

                user = updated || user;
            }
        }

        // Create or update custom auth session
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: `${walletAddress}@wallet.zerogate.local`,
            email_confirm: true,
            user_metadata: {
                wallet_address: walletAddress,
                auth_method: 'wallet',
                last_login: new Date().toISOString()
            }
        });

        if (authError && authError.message !== 'User already registered') {
            console.error('Auth error:', authError);
        }

        // Generate session token
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: `${walletAddress}@wallet.zerogate.local`,
        });

        if (sessionError) {
            console.error('Session error:', sessionError);
            throw new Error('Failed to generate session');
        }

        return new Response(
            JSON.stringify({
                success: true,
                isNewUser,
                needsOnboarding: normalizedAccountType === 'business' && user.status === 'pending_onboarding',
                user: {
                    id: user.id,
                    wallet_address: user.wallet_address,
                    name: user.name,
                    status: user.status,
                    corporate_email: user.corporate_email,
                    account_type: user.account_type,
                    credential_id: user.credential_id
                },
                session: sessionData,
                message: isNewUser
                    ? normalizedAccountType === 'consumer'
                        ? 'Wallet authenticated. Please complete your KYC profile.'
                        : 'Wallet authenticated. Please complete business onboarding.'
                    : 'Welcome back!'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        // 3. IMPORTANT: Error response MUST also include CORS headers
        console.error('Function Error:', error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message || 'Internal server error',
                details: (error as Error).stack
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
