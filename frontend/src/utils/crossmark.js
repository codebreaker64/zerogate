/**
 * Crossmark Wallet Integration
 * Using official @crossmarkio/sdk package
 * Docs: https://docs.crossmark.io/
 */

import crossmarkSdk from '@crossmarkio/sdk';

// Export the SDK instance for use in other modules
export const sdk = crossmarkSdk;

/**
 * Check if Crossmark extension is installed
 * The SDK handles this check internally
 */
export function isCrossmarkInstalled() {
    // The SDK will handle the check when we try to connect
    return typeof window !== 'undefined';
}

/**
 * Connect to Crossmark wallet and get the user's address
 * Uses the official SDK's signInAndWait method
 * @returns {Promise<{address: string, publicKey: string}>}
 */
export async function connectCrossmark() {
    try {
        console.log('Connecting to Crossmark using official SDK...');

        // Use the official SDK method
        const { response } = await sdk.methods.signInAndWait();

        console.log('Crossmark SDK response:', response);

        if (!response || !response.data || !response.data.address) {
            throw new Error('Failed to get address from Crossmark');
        }

        const { address, publicKey } = response.data;

        console.log('Successfully connected to Crossmark:', address);

        return {
            address,
            publicKey: publicKey || '',
            type: 'crossmark'
        };
    } catch (error) {
        console.error('Crossmark connection error:', error);

        // Check for common errors
        if (error.message?.includes('User rejected')) {
            throw new Error('Connection rejected. Please approve the connection request in Crossmark.');
        }

        if (error.message?.includes('not found') || error.message?.includes('not installed')) {
            throw new Error('Crossmark extension not found. Please install it from https://crossmark.io');
        }

        throw new Error(`Failed to connect to Crossmark: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Sign and submit a transaction using Crossmark
 * Uses the official SDK's signAndSubmitAndWait method
 * @param {Object} transaction - The prepared transaction object
 * @returns {Promise<{hash: string, result: Object}>}
 */
export async function signAndSubmitWithCrossmark(transaction) {
    try {
        console.log('Signing and submitting transaction with Crossmark SDK:', transaction);

        const { response } = await sdk.methods.signAndSubmitAndWait(transaction);

        console.log('Transaction response:', response);

        if (!response || !response.data) {
            throw new Error('Transaction signing failed');
        }

        // The SDK returns the transaction result in response.data.resp
        const txResult = response.data.resp;

        return {
            hash: txResult?.hash || txResult?.result?.hash,
            meta: txResult?.meta || txResult?.result?.meta,
            ...txResult
        };
    } catch (error) {
        console.error('Crossmark signing error:', error);

        if (error.message?.includes('rejected')) {
            throw new Error('Transaction rejected by user');
        }

        throw error;
    }
}

// Default export for backward compatibility
export default sdk;
