import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// For development, you can use environment variables or hardcode
// In production, use .env files
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin authentication functions
 */
export async function signInAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

export async function signUpAdmin(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'admin',
                ...metadata
            }
        }
    });

    if (error) throw error;
    return data;
}

export async function signOutAdmin() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Check if current user is admin
 */
export async function isAdmin() {
    const user = await getCurrentAdmin();
    return user?.user_metadata?.role === 'admin';
}

/**
 * KYB Application functions
 */
export async function getKYBApplications() {
    const { data, error } = await supabase
        .from('kyb_applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function updateKYBApplicationStatus(id, status, metadata = {}) {
    const { data, error } = await supabase
        .from('kyb_applications')
        .update({
            status,
            updated_at: new Date().toISOString(),
            ...metadata
        })
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
}

export async function submitKYBApplication(applicationData) {
    const { data, error } = await supabase
        .from('kyb_applications')
        .insert([{
            ...applicationData,
            status: 'pending',
            created_at: new Date().toISOString()
        }])
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Asset management functions
 */
export async function getDraftAssets() {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function authorizeAsset(assetId, adminId) {
    const { data, error } = await supabase
        .from('assets')
        .update({
            status: 'authorized',
            authorized_by: adminId,
            authorized_at: new Date().toISOString()
        })
        .eq('id', assetId)
        .select();

    if (error) throw error;
    return data[0];
}

export async function createAsset(assetData) {
    const { data, error } = await supabase
        .from('assets')
        .insert([{
            ...assetData,
            status: 'draft', // Default to draft for admin review
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getMyAssets(entityId) {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Payment monitoring
 */
export async function getRecentPayments(limit = 50) {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

/**
 * Credential management
 */
export async function getIssuedCredentials() {
    const { data, error } = await supabase
        .from('credentials')
        .select(`
            *,
            entities!credentials_entity_id_fkey (
                company_name
            )
        `)
        .order('issued_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function revokeCredential(credentialId, reason) {
    const { data, error } = await supabase
        .from('credentials')
        .update({
            status: 'revoked',
            revoked_at: new Date().toISOString(),
            revocation_reason: reason
        })
        .eq('id', credentialId)
        .select();

    if (error) throw error;
    return data[0];
}

/**
 * Real-time subscriptions
 */
export function subscribeToKYBApplications(callback) {
    return supabase
        .channel('kyb_applications')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'kyb_applications'
        }, callback)
        .subscribe();
}

export function subscribeToPayments(callback) {
    return supabase
        .channel('payments')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'payments'
        }, callback)
        .subscribe();
}

/**
 * Call backend Edge Function to issue credential
 * This ensures the ISSUER_SEED stays secure on the backend
 */
export async function issueCredentialViaAPI(applicationId) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(
        `${supabaseUrl}/functions/v1/issue-credential`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ applicationId })
        }
    );

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Failed to issue credential');
    }

    return result;
}

// ---------------------------------------------------------------------------
// User (consumer) KYC
// ---------------------------------------------------------------------------

export async function getConsumerKYCApplications() {
    const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function upsertConsumerProfile(walletAddress) {
    const { data, error } = await supabase
        .from('entities')
        .upsert({
            wallet_address: walletAddress,
            account_type: 'consumer',
            status: 'active',
            kyc_status: 'not_started'
        }, { onConflict: 'wallet_address' })
        .select()
        .single();

    if (error) throw error;
    return data;
}
export async function submitConsumerKYC(formData) {
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    if (!walletAddress) {
        throw new Error('Wallet not connected');
    }

    const { data: entity, error: entityError } = await supabase
        .from('entities')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

    if (entityError) throw entityError;

    const { data: application, error: insertError } = await supabase
        .from('kyc_applications')
        .insert([{ ...formData, entity_id: entity.id, wallet_address: walletAddress, status: 'pending' }])
        .select()
        .single();

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
        .from('entities')
        .update({
            account_type: 'consumer',
            kyc_status: 'pending',
            kyc_submitted_at: new Date().toISOString()
        })
        .eq('id', entity.id);

    if (updateError) throw updateError;

    return application;
}

export async function updateConsumerKYCStatus(id, status, metadata = {}) {
    const { data, error } = await supabase
        .from('kyc_applications')
        .update({
            status,
            updated_at: new Date().toISOString(),
            ...metadata
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    if (data?.entity_id) {
        const { error: entityError } = await supabase
            .from('entities')
            .update({
                kyc_status: status
            })
            .eq('id', data.entity_id);

        if (entityError) throw entityError;
    }

    return data;
}
export async function getMyKYCApplication() {
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    if (!walletAddress) {
        return null;
    }

    const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Failed to fetch KYC application:', error);
        return null;
    }

    return data;
}
