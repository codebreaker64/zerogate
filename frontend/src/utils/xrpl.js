import { Client, Wallet } from 'xrpl';

const TESTNET_URL = 'wss://s.altnet.rippletest.net:51233';

export async function getClient() {
    const client = new Client(TESTNET_URL);
    await client.connect();
    return client;
}

/**
 * Checks if a wallet has the required credential (simulated via Memo).
 * @param {string} userAddress 
 * @param {string} issuerAddress 
 * @returns {Promise<boolean>}
 */
export async function checkCredential(userAddress, issuerAddress) {
    if (!userAddress || !issuerAddress) return false;

    const client = await getClient();
    try {
        // Look for transactions from Issuer to User
        const response = await client.request({
            command: 'account_tx',
            account: userAddress,
            ledger_index_min: -1,
            ledger_index_max: -1,
            forward: false, // Newest first
            limit: 20
        });

        const transactions = response.result.transactions;
        console.log(`Checking credentials for ${userAddress} from ${issuerAddress}`);
        console.log(`Found ${transactions.length} transactions`);

        const hasCredential = transactions.some(tx => {
            // Access the transaction data from tx_json field (XRPL API response structure)
            const t = tx.tx_json;

            // Guard clause: Skip if transaction is malformed or undefined
            if (!t) {
                console.log('Skipping: Transaction object is undefined');
                return false;
            }

            console.log('Inspecting TX:', tx.hash, t.TransactionType, t.Account, '→', t.Destination);

            if (t.TransactionType !== 'Payment') return false;
            // Note: Use simple equality. 
            if (t.Account !== issuerAddress) {
                console.log(`Skipping: Sender ${t.Account} !== Issuer ${issuerAddress}`);
                return false;
            }
            if (t.Destination !== userAddress) {
                console.log(`Skipping: Dest ${t.Destination} !== User ${userAddress}`);
                return false;
            }

            if (!t.Memos) {
                console.log('Skipping: No Memos');
                return false;
            }

            return t.Memos.some(m => {
                try {
                    const typeHex = m.Memo.MemoType;
                    const type = Buffer.from(typeHex, 'hex').toString();
                    console.log(`MemoType: ${typeHex} -> ${type}`);
                    return type === 'CredentialType';
                } catch (e) {
                    console.error('Error parsing memo:', e);
                    return false;
                }
            });
        });

        return hasCredential;
    } catch (e) {
        console.error("Error checking credential:", e);
        return false;
    } finally {
        client.disconnect();
    }
}

/**
 * Helper to fund a wallet (for testing/demo purposes in browser)
 * Persists wallet in localStorage for demo consistency
 * Uses address prefix (first 5 chars) in storage key to support multiple wallets
 * WARNING: This is slow and uses the faucet.
 */
export async function fundWallet() {
    const client = await getClient();
    try {
        // Check if we have a stored default wallet
        const storedWallet = localStorage.getItem('zerogate_testnet_wallet');
        if (storedWallet) {
            const walletData = JSON.parse(storedWallet);
            const wallet = Wallet.fromSeed(walletData.seed);
            console.log('Retrieved existing testnet wallet:', wallet.address);
            return wallet;
        }

        // Create new wallet and fund it
        const { wallet } = await client.fundWallet();

        // Get first 5 characters for storage key
        const addressPrefix = wallet.address.substring(0, 5);

        // Store wallet with address prefix in key
        const storageKey = `zerogate_wallet_${addressPrefix}`;
        localStorage.setItem(storageKey, JSON.stringify({
            address: wallet.address,
            seed: wallet.seed,
            createdAt: new Date().toISOString()
        }));

        // Also store as default wallet
        localStorage.setItem('zerogate_testnet_wallet', JSON.stringify({
            address: wallet.address,
            seed: wallet.seed
        }));

        console.log(`Created and stored new testnet wallet: ${wallet.address} (key: ${storageKey})`);
        return wallet;
    } finally {
        client.disconnect();
    }
}

/**
 * Issues a credential (simulated via Memo) from issuer to user.
 * @param {Object} issuerWallet - The issuer's wallet object
 * @param {string} userAddress - The user's address
 * @returns {Promise<string>} - The transaction hash
 */
export async function issueCredential(issuerWallet, userAddress) {
    const client = await getClient();
    try {
        const credentialTx = {
            TransactionType: "Payment",
            Account: issuerWallet.address,
            Destination: userAddress,
            Amount: "1", // Drop
            Memos: [
                {
                    Memo: {
                        MemoType: Buffer.from("CredentialType").toString('hex'),
                        MemoData: Buffer.from("AccreditedInvestor").toString('hex'),
                        MemoFormat: Buffer.from("text/plain").toString('hex')
                    }
                }
            ]
        };

        const prepared = await client.autofill(credentialTx);
        const signed = issuerWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            return result.result.hash;
        } else {
            throw new Error(`Transaction failed: ${result.result.meta.TransactionResult}`);
        }
    } finally {
        client.disconnect();
    }
}

/**
 * Convert currency code to XRPL-compliant format
 * Currency codes must be either 3 ASCII characters or 40 hex characters (20 bytes)
 * @param {string} code - The currency code (e.g., 'MPToken')
 * @returns {string} - XRPL-compliant currency code
 */
function convertCurrencyCodeToHex(code) {
    // If it's already 3 characters, return as-is
    if (code.length === 3) {
        return code;
    }

    // If it's already 40 hex characters, return as-is
    if (code.length === 40 && /^[0-9A-F]+$/i.test(code)) {
        return code;
    }

    // Convert to hex and pad to 40 characters (20 bytes)
    const hex = Buffer.from(code, 'utf-8').toString('hex').toUpperCase();
    // Pad with zeros to make it 40 characters
    return hex.padEnd(40, '0');
}

/**
 * Setup trustline for MPT
 * @param {Object} wallet - User's wallet object (for testnet) or null (for Crossmark)
 * @param {string} issuerAddress - The MPT issuer's address
 * @param {string} currencyCode - The currency code (e.g., 'MPT')
 * @param {string} limit - Trust limit (default "1000000")
 * @param {boolean} useCrossmark - Whether to use Crossmark for signing
 * @returns {Promise<string>} - Transaction hash
 */
export async function setupTrustline(wallet, issuerAddress, currencyCode = 'MPT', limit = '1000000', useCrossmark = false) {
    const client = await getClient();
    try {
        // Convert currency code to XRPL-compliant format
        const xrplCurrency = convertCurrencyCodeToHex(currencyCode);

        const trustSetTx = {
            TransactionType: 'TrustSet',
            Account: wallet.address, // wallet.address works for both Crossmark and testnet
            LimitAmount: {
                currency: xrplCurrency,
                issuer: issuerAddress,
                value: limit
            }
        };

        if (useCrossmark) {
            // Use Crossmark to sign and submit
            const { signAndSubmitWithCrossmark } = await import('./crossmark.js');
            const prepared = await client.autofill(trustSetTx);
            const result = await signAndSubmitWithCrossmark(prepared);

            if (result.meta?.TransactionResult === 'tesSUCCESS') {
                return result.hash;
            } else {
                throw new Error(`Trustline setup failed: ${result.meta?.TransactionResult}`);
            }
        } else {
            // Use testnet wallet
            const prepared = await client.autofill(trustSetTx);
            const signed = wallet.sign(prepared);
            const result = await client.submitAndWait(signed.tx_blob);

            if (result.result.meta.TransactionResult === 'tesSUCCESS') {
                return result.result.hash;
            } else {
                throw new Error(`Trustline setup failed: ${result.result.meta.TransactionResult}`);
            }
        }
    } finally {
        client.disconnect();
    }
}

/**
 * Configure an account to be a token issuer
 * Sets the DefaultRipple flag which is required to issue tokens
 * @param {Object} issuerWallet - The issuer's wallet
 * @returns {Promise<string>} - Transaction hash
 */
export async function configureIssuerAccount(issuerWallet) {
    const client = await getClient();
    try {
        const accountSetTx = {
            TransactionType: 'AccountSet',
            Account: issuerWallet.address,
            SetFlag: 8 // asfDefaultRipple flag
        };

        const prepared = await client.autofill(accountSetTx);
        const signed = issuerWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            return result.result.hash;
        } else {
            throw new Error(`Account configuration failed: ${result.result.meta.TransactionResult}`);
        }
    } finally {
        client.disconnect();
    }
}

/**
 * Mint MPT to user (called by issuer)
 * @param {Object} issuerWallet - The issuer's wallet
 * @param {string} userAddress - User's address
 * @param {string} amount - Amount of MPT to mint
 * @param {string} currencyCode - Currency code (default 'MPT')
 * @returns {Promise<{hash: string, amount: string}>}
 */
export async function mintMPToken(issuerWallet, userAddress, amount, currencyCode = 'MPT') {
    const client = await getClient();
    try {
        // Convert currency code to XRPL-compliant format
        const xrplCurrency = convertCurrencyCodeToHex(currencyCode);

        const paymentTx = {
            TransactionType: 'Payment',
            Account: issuerWallet.address,
            Destination: userAddress,
            Amount: {
                currency: xrplCurrency,
                value: amount,
                issuer: issuerWallet.address
            },
            Memos: [
                {
                    Memo: {
                        MemoType: Buffer.from('RWA_TOKEN_MINT').toString('hex'),
                        MemoData: Buffer.from(`Minted ${amount} ${currencyCode}`).toString('hex'),
                        MemoFormat: Buffer.from('text/plain').toString('hex')
                    }
                }
            ]
        };

        const prepared = await client.autofill(paymentTx);
        const signed = issuerWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            return {
                hash: result.result.hash,
                amount: amount,
                currency: currencyCode
            };
        } else {
            throw new Error(`Token minting failed: ${result.result.meta.TransactionResult}`);
        }
    } finally {
        client.disconnect();
    }
}

/**
 * Check if user has a trustline set up for MPT
 * @param {string} userAddress - User's address
 * @param {string} issuerAddress - Issuer's address
 * @param {string} currencyCode - Currency code
 * @returns {Promise<boolean>}
 */
export async function checkTrustline(userAddress, issuerAddress, currencyCode = 'MPT') {
    const client = await getClient();
    try {
        // Convert currency code to XRPL-compliant format
        const xrplCurrency = convertCurrencyCodeToHex(currencyCode);

        const response = await client.request({
            command: 'account_lines',
            account: userAddress,
            ledger_index: 'validated'
        });

        const lines = response.result.lines || [];
        return lines.some(line =>
            line.account === issuerAddress &&
            line.currency === xrplCurrency
        );
    } catch (error) {
        console.error('Error checking trustline:', error);
        return false;
    } finally {
        client.disconnect();
    }
}

/**
 * Get user's token balance for a specific currency
 * @param {string} userAddress - User's address
 * @param {string} issuerAddress - Token issuer's address (optional)
 * @param {string} currencyCode - Currency code (default 'MPT')
 * @returns {Promise<{balance: string, currency: string, issuer: string}[]>}
 */
export async function getTokenBalance(userAddress, issuerAddress = null, currencyCode = 'MPT') {
    const client = await getClient();
    try {
        const xrplCurrency = convertCurrencyCodeToHex(currencyCode);

        const response = await client.request({
            command: 'account_lines',
            account: userAddress,
            ledger_index: 'validated'
        });

        const lines = response.result.lines || [];

        // Filter by currency and optionally by issuer
        const balances = lines
            .filter(line => {
                const matchesCurrency = line.currency === xrplCurrency;
                const matchesIssuer = !issuerAddress || line.account === issuerAddress;
                return matchesCurrency && matchesIssuer;
            })
            .map(line => ({
                balance: line.balance,
                currency: currencyCode,
                issuer: line.account,
                limit: line.limit
            }));

        return balances;
    } catch (error) {
        console.error('Error fetching token balance:', error);
        return [];
    } finally {
        client.disconnect();
    }
}
