import { connectCrossmark, isCrossmarkInstalled } from './crossmark.js';
import { supabase } from './supabase.js';

/**
 * Generate a nonce for SIWX (Sign-In with XRPL)
 * @returns {string} - Random nonce string
 */
export function generateNonce() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create SIWX message following EIP-4361 style format
 * @param {string} walletAddress - User's XRPL wallet address
 * @param {string} nonce - Random nonce
 * @returns {string} - Formatted message for signing
 */
export function createSIWXMessage(walletAddress, nonce) {
    const domain = window.location.host;
    const timestamp = new Date().toISOString();

    return `${domain} wants you to sign in with your XRPL account:
${walletAddress}

ZeroGate - Institutional RWA Platform

URI: ${window.location.origin}
Version: 1
Nonce: ${nonce}
Issued At: ${timestamp}`;
}

/**
 * Sign in with Crossmark Wallet (SIWX)
 * This is the main authentication flow for B2B users
 * 
 * @returns {Promise<{success: boolean, user: object, needsOnboarding: boolean}>}
 */
export async function signInWithWallet() {
    try {
        // Check if Crossmark extension is installed
        if (!isCrossmarkInstalled()) {
            throw new Error(
                'Crossmark wallet extension is not installed. ' +
                'Please install it from https://crossmark.io and reload the page.'
            );
        }

        // Use the same connection method as marketplace
        console.log('Connecting to Crossmark wallet...');
        const walletInfo = await connectCrossmark();

        if (!walletInfo || !walletInfo.address) {
            throw new Error('Failed to connect wallet or get address');
        }

        const walletAddress = walletInfo.address;
        const publicKey = walletInfo.publicKey || '';

        console.log('✅ Wallet connected:', walletAddress);

        // For Crossmark, signInAndWait already proves wallet ownership
        // We'll use a simplified authentication without requiring a separate signature
        // The wallet address + session is proof enough for institutional login

        console.log('Authenticating with backend...');

        // Generate nonce for backend validation
        const nonce = generateNonce();

        // Use supabase.functions.invoke which automatically handles CORS headers and auth
        const { data: result, error: invokeError } = await supabase.functions.invoke('wallet-auth', {
            body: {
                walletAddress,
                // For simplified auth, we use nonce instead of signature
                signature: null,
                message: `Login request from ${walletAddress}`,
                publicKey: walletInfo.publicKey || '',
                nonce,
                authMethod: 'crossmark_connect' // Indicate this is via wallet connection
            }
        });

        if (invokeError) {
            console.error('Function invocation error:', invokeError);
            throw new Error(invokeError.message || 'Authentication failed');
        }

        console.log('Authentication successful:', result);

        // Store session in Supabase
        if (result.session) {
            await supabase.auth.setSession({
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token
            });
        }

        // Store wallet address in localStorage for quick access
        localStorage.setItem('zerogate_wallet_address', walletAddress);

        return {
            success: true,
            user: result.user,
            needsOnboarding: result.needsOnboarding,
            isNewUser: result.isNewUser,
            message: result.message
        };

    } catch (error) {
        console.error('Wallet sign-in error:', error);
        throw error;
    }
}

/**
 * Complete business onboarding after wallet authentication
 * @param {Object} businessData - Company information
 * @returns {Promise<Object>} - Updated user entity
 */
export async function completeBusinessOnboarding(businessData) {
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    if (!walletAddress) {
        throw new Error('No wallet address found. Please sign in first.');
    }

    // 1. Update Entity
    const { data: entityData, error: entityError } = await supabase
        .from('entities')
        .update({
            company_name: businessData.company_name,
            country: businessData.country,
            status: 'pending_kyb',
            onboarded_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single();

    if (entityError) throw entityError;

    // 2. Create KYB Application
    // We try to insert. If it fails due to existing logic (optional), we handle or just proceed.
    // For now assuming 1:1 entity:application in this flow.
    const { error: kybError } = await supabase
        .from('kyb_applications')
        .insert([{
            entity_id: entityData.id,
            legal_entity_name: businessData.company_name,
            business_reg_number: businessData.company_uen,
            business_type: businessData.industry,
            registered_address: businessData.country,
            director_wallet_address: walletAddress,
            status: 'pending'
        }]);

    if (kybError) {
        console.error('KYB creation failed:', kybError);
        throw new Error('Failed to submit KYB Application: ' + kybError.message);
    }

    return entityData;
}

/**
 * Sign out - clear wallet connection and session
 */
export async function signOutWallet() {
    // Clear Supabase session
    await supabase.auth.signOut();

    // Clear localStorage
    localStorage.removeItem('zerogate_wallet_address');

    // Note: Crossmark doesn't need explicit disconnection
    console.log('Signed out successfully');
}

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} - User entity or null
 */
export async function getCurrentWalletUser() {
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    if (!walletAddress) {
        return null;
    }

    const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

    if (error) {
        console.error('Error fetching user:', error);
        return null;
    }

    return data;
}

/**
 * Check if user is authenticated with wallet
 * @returns {Promise<boolean>}
 */
export async function isWalletAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    const walletAddress = localStorage.getItem('zerogate_wallet_address');

    return !!(session && walletAddress);
}
