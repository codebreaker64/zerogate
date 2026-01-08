// Generate XRPL Testnet Wallet
// Run with: node generate_xrpl_wallet.mjs

import xrpl from 'xrpl';

console.log('🔑 Generating XRPL Testnet Wallet...\n');

// Connect to testnet
const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
await client.connect();

// Generate a new wallet
const wallet = xrpl.Wallet.generate();

console.log('✅ Wallet Generated!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Address: ${wallet.address}`);
console.log(`🔐 Seed:    ${wallet.seed}`);
console.log(`🔑 Public:  ${wallet.publicKey}`);
console.log(`🔒 Private: ${wallet.privateKey}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💰 Funding wallet from testnet faucet...');

try {
    const fundResult = await client.fundWallet(wallet);
    console.log('✅ Wallet funded successfully!');
    console.log(`   Balance: ${fundResult.balance} XRP\n`);
} catch (error) {
    console.error('❌ Failed to fund wallet:', error.message);
    console.log('\n⚠️  You can manually fund it at: https://xrpl.org/xrp-testnet-faucet.html\n');
}

await client.disconnect();

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 NEXT STEPS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Copy the SEED value above');
console.log('2. Set it as a Supabase secret:');
console.log(`   supabase secrets set XRPL_ISSUER_SEED="${wallet.seed}" --project-ref ikytcaoopklycygrvefk`);
console.log('\n⚠️  IMPORTANT: Save this seed in a secure location!');
console.log('   You cannot recover it if lost.\n');
