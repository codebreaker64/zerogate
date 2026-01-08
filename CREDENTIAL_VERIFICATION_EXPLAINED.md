# How Credential Verification Works in ZeroGate

## Overview
ZeroGate uses the **XRPL blockchain** as a decentralized, immutable verification system. Credentials are issued and verified on-chain without needing a centralized database.

---

## The Process

### 1️⃣ **Credential Issuance (Admin → User)**

When an admin approves a KYB application, this happens:

```javascript
// In: issueCredential(issuerWallet, userAddress)

1. Create a Payment transaction (1 drop = 0.000001 XRP)
2. Attach a Memo with credential data:
   - MemoType: "CredentialType"
   - MemoData: "AccreditedInvestor"
   - MemoFormat: "text/plain"
3. Sign with admin's wallet
4. Submit to XRPL ledger
5. Transaction is permanently recorded on blockchain
```

**Example Transaction:**
```json
{
  "TransactionType": "Payment",
  "Account": "rAdminWallet...",
  "Destination": "rCorporateWallet...",
  "Amount": "1",
  "Memos": [{
    "MemoType": "CredentialType",
    "MemoData": "AccreditedInvestor"
  }]
}
```

---

### 2️⃣ **Credential Verification (Check if User has Credential)**

When a user connects their wallet, the app checks:

```javascript
// In: checkCredential(userAddress, issuerAddress)

1. Fetch last 20 transactions for the user's wallet
2. Filter for Payment transactions
3. Check if ANY transaction matches:
   ✅ Sent FROM the issuer address
   ✅ Sent TO the user address
   ✅ Contains Memo with MemoType = "CredentialType"
4. If match found → User is verified ✅
5. If no match → User is not verified ❌
```

**Verification Logic:**
```javascript
const hasCredential = transactions.some(tx => {
  const t = tx.tx_json;
  
  // Must be a Payment transaction
  if (t.TransactionType !== 'Payment') return false;
  
  // Must be FROM the trusted issuer
  if (t.Account !== issuerAddress) return false;
  
  // Must be TO the user
  if (t.Destination !== userAddress) return false;
  
  // Must have credential memo
  return t.Memos?.some(m => {
    const type = Buffer.from(m.Memo.MemoType, 'hex').toString();
    return type === 'CredentialType';
  });
});
```

---

## Key Advantages

### ✅ **Decentralized Trust**
- No central database to hack or manipulate
- Credentials are on public blockchain
- Anyone can verify independently

### ✅ **Immutable Records**
- Once issued, credentials can't be altered
- Full audit trail of when credential was issued
- Transaction hash provides proof

### ✅ **Cost Effective**
- Only 1 drop (0.000001 XRP) per credential
- No ongoing storage costs
- Testnet is completely free

### ✅ **Standards Based**
- Uses XRPL Payment transactions
- Memos are standard XRPL feature
- Can evolve to XLS-70d formal credentials

---

## Current Implementation vs. Future (XLS-70d)

### Current (Demo):
```
Payment Transaction + Memo
├── Simple to implement
├── Works on testnet immediately
└── Good for proof-of-concept
```

### Future (Production with XLS-70d):
```
CredentialCreate + CredentialAccept
├── Formal credential objects
├── User must explicitly accept
├── Stronger compliance
└── Industry standard
```

---

## Security Considerations

### ✅ **What's Secure:**
- Credentials are cryptographically signed
- Blockchain prevents tampering
- Public verification by anyone

### ⚠️ **Important Notes:**
- Issuer address must be trusted
- Only check credentials from known issuers
- Store issuer address securely

---

## How It Works in Your App

### **Marketplace Flow:**
```
1. User connects wallet
   ↓
2. App calls: checkCredential(userAddress, trustedIssuerAddress)
   ↓
3. Queries XRPL for transactions
   ↓
4. Looks for Payment from issuer with "CredentialType" memo
   ↓
5. Returns true/false
   ↓
6. UI shows "Verified Investor" badge or "Not Verified"
```

### **Admin Dashboard Flow:**
```
1. Admin reviews KYB application
   ↓
2. Admin clicks "Approve & Issue Credential"
   ↓
3. App calls: issueCredential(adminWallet, corporateAddress)
   ↓
4. Creates Payment with credential memo
   ↓
5. Signs and submits to XRPL
   ↓
6. Returns transaction hash
   ↓
7. Credential is now on blockchain forever ✅
```

---

## Live Example

**Check a real credential transaction:**
```javascript
// In browser console:
const userAddress = "rYourWallet...";
const issuerAddress = "rIssuerWallet...";
const verified = await checkCredential(userAddress, issuerAddress);
console.log("Is verified:", verified);
```

**On XRPL Explorer:**
1. Go to https://testnet.xrpl.org/
2. Search for the transaction hash
3. Click "Memos" tab
4. See the credential data!

---

## Why This Approach?

### **Traditional Approach:**
```
Database → Can be hacked
         → Single point of failure
         → Requires trust in database operator
```

### **Blockchain Approach:**
```
XRPL Ledger → Decentralized (no single point of failure)
            → Immutable (can't change history)
            → Transparent (anyone can verify)
            → Cryptographically secure
```

---

## Summary

**Issuing Credential:**
- Admin sends 1 drop XRP to corporate wallet
- Includes memo: "This is an accredited investor"
- Recorded on blockchain forever

**Checking Credential:**
- Look at wallet's transaction history
- Find payment from trusted issuer
- Check if it has credential memo
- If yes → Verified! ✅

**It's like a digital certificate stamped on the blockchain that anyone can verify but no one can forge!** 🔒
