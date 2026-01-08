// @ts-nocheck - This is a Deno Edge Function with Deno-specific types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Asset Authorization Workflow Edge Function
 * 
 * Handles the Draft & Approve workflow for RWA assets:
 * - Companies submit assets for review (draft → pending_review)
 * - Admins authorize or reject (pending_review → authorized/rejected)
 * - Companies can mint authorized assets (authorized → minted)
 */
serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Verify authentication
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

        const { action, assetId, authorizationNotes, rejectionReason } = await req.json();

        // Get the asset
        const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select('*, entities!inner(wallet_address, company_name)')
            .eq('id', assetId)
            .single();

        if (assetError || !asset) {
            return new Response(
                JSON.stringify({ error: 'Asset not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let newStatus;
        let updateData = {};

        switch (action) {
            case 'submit_for_review':
                // Company submits draft for admin review
                if (asset.status !== 'draft') {
                    return new Response(
                        JSON.stringify({ error: 'Only draft assets can be submitted for review' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
                newStatus = 'pending_review';
                updateData = {
                    status: newStatus,
                    submitted_at: new Date().toISOString()
                };
                break;

            case 'authorize':
                // Admin authorizes asset for minting
                if (asset.status !== 'pending_review') {
                    return new Response(
                        JSON.stringify({ error: 'Only pending assets can be authorized' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                // Verify user is admin
                if (user.user_metadata?.role !== 'admin') {
                    return new Response(
                        JSON.stringify({ error: 'Only admins can authorize assets' }),
                        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                newStatus = 'authorized';
                updateData = {
                    status: newStatus,
                    reviewed_by: user.id,
                    authorized_at: new Date().toISOString(),
                    authorization_notes: authorizationNotes || ''
                };
                break;

            case 'reject':
                // Admin rejects asset
                if (asset.status !== 'pending_review') {
                    return new Response(
                        JSON.stringify({ error: 'Only pending assets can be rejected' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                // Verify user is admin
                if (user.user_metadata?.role !== 'admin') {
                    return new Response(
                        JSON.stringify({ error: 'Only admins can reject assets' }),
                        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                newStatus = 'rejected';
                updateData = {
                    status: newStatus,
                    reviewed_by: user.id,
                    rejection_reason: rejectionReason || 'No reason provided'
                };
                break;

            default:
                return new Response(
                    JSON.stringify({ error: 'Invalid action' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
        }

        // Update asset status
        const { data: updatedAsset, error: updateError } = await supabase
            .from('assets')
            .update(updateData)
            .eq('id', assetId)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return new Response(
                JSON.stringify({ error: 'Failed to update asset' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Record in audit trail
        await supabase
            .from('asset_history')
            .insert({
                asset_id: assetId,
                previous_status: asset.status,
                new_status: newStatus,
                changed_by: user.id,
                change_reason: authorizationNotes || rejectionReason || `Action: ${action}`,
                metadata_snapshot: asset.asset_metadata
            });

        // TODO: Send notification email to company
        // if (action === 'authorize' || action === 'reject') {
        //     await sendEmail({
        //         to: asset.entities.corporate_email,
        //         subject: `Asset ${action === 'authorize' ? 'Authorized' : 'Rejected'}: ${asset.asset_name}`,
        //         body: ...
        //     });
        // }

        return new Response(
            JSON.stringify({
                success: true,
                asset: updatedAsset,
                message: `Asset ${action === 'authorize' ? 'authorized' : action === 'reject' ? 'rejected' : 'submitted'} successfully`
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        console.error('Error in asset-workflow function:', error);
        return new Response(
            JSON.stringify({
                error: (error as Error).message || 'Internal server error',
                details: (error as Error).stack
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
