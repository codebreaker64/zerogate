import { getClient } from './xrpl.js';
import { signAndSubmitWithCrossmark } from './crossmark.js';

/**
 * Mint a unique NFT representing an RWA asset
 * @param {Object} issuerWallet - The issuer's wallet (or wallet object for Crossmark)
 * @param {string} destinationAddress - The address to receive the NFT
 * @param {Object} metadata - NFT metadata
 * @param {boolean} useCrossmark - Whether to use Crossmark for signing
 * @returns {Promise<{nftId: string, hash: string}>}
 */
export async function mintRWANFT(issuerWallet, destinationAddress, metadata = {}, useCrossmark = false) {
    const client = await getClient();
    try {
        // Create NFToken metadata URI (in production, this would point to IPFS or similar)
        const metadataJSON = JSON.stringify({
            name: metadata.name || 'Luxury Apartment Share',
            description: metadata.description || 'Tokenized share of premium real estate',
            image: metadata.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
            properties: {
                assetType: metadata.assetType || 'Real Estate',
                tokenId: metadata.tokenId || `#${Date.now()}`,
                shares: metadata.shares || 1,
                ...metadata.properties
            }
        });

        // Convert metadata to hex for URI
        const metadataHex = Buffer.from(metadataJSON, 'utf-8').toString('hex').toUpperCase();
        const uri = metadataHex.substring(0, 512); // Max 256 bytes = 512 hex chars

        const mintTx = {
            TransactionType: 'NFTokenMint',
            Account: useCrossmark ? issuerWallet.address : issuerWallet.address,
            NFTokenTaxon: 0, // Taxon for categorization
            Flags: 8, // tfTransferable flag
            TransferFee: 0, // No transfer fee for now
            URI: uri
        };

        let result;
        if (useCrossmark) {
            // Use Crossmark to sign and submit
            const prepared = await client.autofill(mintTx);
            result = await signAndSubmitWithCrossmark(prepared);
        } else {
            // Use testnet wallet
            const prepared = await client.autofill(mintTx);
            const signed = issuerWallet.sign(prepared);
            const submitResult = await client.submitAndWait(signed.tx_blob);
            result = submitResult.result;
        }

        // Extract NFTokenID from metadata
        let nftId = null;
        if (result.meta && result.meta.nftoken_id) {
            nftId = result.meta.nftoken_id;
        } else if (result.meta && result.meta.AffectedNodes) {
            // Search through affected nodes for the minted NFT
            for (const node of result.meta.AffectedNodes) {
                if (node.CreatedNode && node.CreatedNode.LedgerEntryType === 'NFTokenPage') {
                    const nftokens = node.CreatedNode.NewFields?.NFTokens;
                    if (nftokens && nftokens.length > 0) {
                        nftId = nftokens[0].NFToken.NFTokenID;
                        break;
                    }
                }
                if (node.ModifiedNode && node.ModifiedNode.LedgerEntryType === 'NFTokenPage') {
                    const nftokens = node.ModifiedNode.NewFields?.NFTokens || node.ModifiedNode.FinalFields?.NFTokens;
                    if (nftokens && nftokens.length > 0) {
                        nftId = nftokens[nftokens.length - 1].NFToken.NFTokenID;
                        break;
                    }
                }
            }
        }

        if (result.meta?.TransactionResult === 'tesSUCCESS' || result.result?.meta?.TransactionResult === 'tesSUCCESS') {
            // For demo, create NFT sell offer to send to user
            if (nftId && destinationAddress !== issuerWallet.address) {
                await createNFTSellOffer(issuerWallet, nftId, destinationAddress, useCrossmark);
            }

            return {
                nftId: nftId || 'NFT_MINTED',
                hash: result.hash || result.result?.hash,
                metadata: JSON.parse(metadataJSON)
            };
        } else {
            throw new Error(`NFT minting failed: ${result.meta?.TransactionResult || 'Unknown error'}`);
        }
    } finally {
        client.disconnect();
    }
}

/**
 * Create an NFT sell offer for 0 XRP to transfer ownership
 * @param {Object} wallet - Owner's wallet
 * @param {string} nftId - NFT Token ID
 * @param {string} destination - Destination address
 * @param {boolean} useCrossmark - Whether to use Crossmark
 */
async function createNFTSellOffer(wallet, nftId, destination, useCrossmark = false) {
    const client = await getClient();
    try {
        const sellOfferTx = {
            TransactionType: 'NFTokenCreateOffer',
            Account: wallet.address,
            NFTokenID: nftId,
            Amount: '0', // Free transfer
            Destination: destination,
            Flags: 1 // tfSellNFToken
        };

        if (useCrossmark) {
            const prepared = await client.autofill(sellOfferTx);
            await signAndSubmitWithCrossmark(prepared);
        } else {
            const prepared = await client.autofill(sellOfferTx);
            const signed = wallet.sign(prepared);
            await client.submitAndWait(signed.tx_blob);
        }
    } finally {
        client.disconnect();
    }
}

/**
 * Get NFTs owned by an address
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} Array of NFTs
 */
export async function getNFTs(address) {
    const client = await getClient();
    try {
        const response = await client.request({
            command: 'account_nfts',
            account: address,
            ledger_index: 'validated'
        });

        return response.result.account_nfts || [];
    } catch (error) {
        console.error('Error fetching NFTs:', error);
        return [];
    } finally {
        client.disconnect();
    }
}
