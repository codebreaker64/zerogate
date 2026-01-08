# Backend API Deployment Guide

## ✅ What's Been Created

### 1. Secure Edge Function
**Location**: `/supabase/functions/issue-credential/index.ts`

**Features**:
- ✅ Admin authentication verification
- ✅ XRPL credential issuance
- ✅ Database updates
- ✅ Secure seed management
- ✅ CORS support

### 2. API Wrapper Function
**Location**: `/frontend/src/utils/supabase.js`

```javascript
import { issueCredentialViaAPI } from '../utils/supabase';

// In your component:
const result = await issueCredentialViaAPI(application.id);
console.log('Credential issued:', result.hash);
```

---

## 🚀 Deployment Steps

### Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### Step 2: Link to Your Project

```bash
cd /Users/kaijie/Documents/GitHub/zerogate
supabase login
supabase link --project-ref your-project-ref
```

Find your project ref in Supabase Dashboard → Project Settings → General

### Step 3: Set Environment Secrets

```bash
# Set the issuer seed (NEVER commit this!)
supabase secrets set ISSUER_SEED=sYourActualSeedHere

# Verify it's set
supabase secrets list
```

### Step 4: Deploy the Function

```bash
supabase functions deploy issue-credential
```

### Step 5: Test the Function

```bash
# Test locally first
supabase functions serve issue-credential

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/issue-credential' \
  --header 'Authorization: Bearer YOUR_SESSION_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"applicationId":"test-id"}'
```

---

## 🔧 Update KYBReviewDesk Component

**File**: `/frontend/src/components/admin/KYBReviewDesk.jsx`

Replace the `handleApprove` function:

```javascript
import { issueCredentialViaAPI } from '../../utils/supabase';

const handleApprove = async (application) => {
    setProcessing(application.id);
    try {
        // Call secure backend API
        const result = await issueCredentialViaAPI(application.id);

        await loadApplications();
        if (onUpdate) onUpdate();
        
        alert(`✅ ${application.legal_entity_name} approved!\nCredential issued.\nTx Hash: ${result.hash}`);
    } catch (error) {
        console.error('Approval failed:', error);
        alert(`Failed to approve: ${error.message}`);
    } finally {
        setProcessing(null);
    }
};
```

---

## 📝 Environment Variables Checklist

### Frontend `.env`:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Secrets (via CLI):
```bash
ISSUER_SEED=sYourTestnetSeedHere
```

**IMPORTANT**: The Edge Function automatically has access to:
- `SUPABASE_URL` - Auto-injected
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected
- `ISSUER_SEED` - You must set this

---

## 🔐 Security Flow

```
User clicks "Approve" in Admin Dashboard
         ↓
Frontend calls issueCredentialViaAPI(applicationId)
         ↓
Frontend sends session token to Edge Function
         ↓
Edge Function verifies:
  1. Valid session token ✓
  2. User has admin role ✓
  3. Application exists ✓
         ↓
Edge Function retrieves ISSUER_SEED from env
         ↓
Edge Function signs XRPL transaction
         ↓
Edge Function updates database
         ↓
Returns transaction hash to frontend
```

**Key Point**: ISSUER_SEED never leaves the backend!

---

## 🐛 Troubleshooting

### Problem: Function not deploying
```bash
# Check function syntax
deno check supabase/functions/issue-credential/index.ts

# View logs
supabase functions logs issue-credential
```

### Problem: Authentication errors
- Check that admin user has `role: "admin"` in metadata
- Verify session token is being sent in header
- Check Edge Function logs for error details

### Problem: XRPL connection fails
- Verify testnet is accessible
- Check ISSUER_SEED is valid
- Try a different XRPL server in the function

### Problem: Database update fails
- Check table policies allow service role
- Verify column names match schema
- Check Edge Function logs

---

## 🧪 Testing the Full Flow

### 1. Create Test Application
Navigate to marketplace → Submit KYB

### 2. Login to Admin
Navigate to `/admin/login` → Use admin credentials

### 3. Approve Application
Click "Approve & Issue" → Should call Edge Function

### 4. Check Results
- Frontend shows success alert with hash
- Supabase table updated
- XRPL transaction visible on testnet explorer

---

## 📊 Monitoring

### View Function Logs
```bash
supabase functions logs issue-credential --tail
```

### Check Database
```sql
-- See all applications
SELECT * FROM kyb_applications ORDER BY created_at DESC;

-- See issued credentials
SELECT * FROM credentials ORDER BY issued_at DESC;
```

### Verify XRPL Transaction
```
https://testnet.xrpl.org/transactions/{hash}
```

---

## 🎯 Production Checklist

- [ ] ISSUER_SEED set in Supabase secrets
- [ ] Edge Function deployed
- [ ] Frontend using `issueCredentialViaAPI()`
- [ ] Admin authentication working
- [ ] Database policies configured
- [ ] Error handling in place
- [ ] Logging enabled
- [ ] Tested end-to-end flow

---

## 📚 Reference

**Supabase Edge Functions Docs**:
- https://supabase.com/docs/guides/functions

**XRPL Credentials**:
- https://xrpl.org/docs/concepts/transactions/transaction-types/credentialcreate

**Deno Deploy**:
- https://deno.com/deploy/docs

---

**You now have a production-ready, secure backend for credential issuance!** 🎉

The frontend makes a simple API call, and all the sensitive operations happen securely on the backend.
