# ZeroGate Admin Portal - Supabase Integration Guide

## 🎯 What We've Built

A **professional institutional-grade Compliance & Governance Dashboard** with:

✅ Secure admin authentication (separate from business login)
✅ KYB Review Desk with approval workflow
✅ Real-time notifications
✅ Professional UI with stats dashboard
✅ Component structure for all 5 admin features

---

## 📦 What's Been Created

### 1. **Supabase Configuration**
- `/frontend/src/utils/supabase.js` - Complete Supabase client with all functions
- `/frontend/.env.example` - Environment variables template

### 2. **Admin Pages**
- `/frontend/src/pages/AdminLogin.jsx` - Professional login screen
- `/frontend/src/pages/ComplianceDashboard.jsx` - Main admin dashboard

### 3. **Admin Components** (`/frontend/src/components/admin/`)
- `KYBReviewDesk.jsx` - **FULLY IMPLEMENTED** ✅
- `CredentialManager.jsx` - Placeholder (ready to implement)
- `AssetAuthorization.jsx` - Placeholder (ready to implement)
- `PaymentMonitor.jsx` - Placeholder (ready to implement)
- `RevocationTool.jsx` - Placeholder (ready to implement)

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings → API

### Step 2: Create Database Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- KYB Applications Table
CREATE TABLE kyb_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    legal_entity_name TEXT NOT NULL,
    business_reg_number TEXT,
    director_wallet_address TEXT NOT NULL,
    business_type TEXT,
    incorporation_date DATE,
    registered_address TEXT,
    status TEXT DEFAULT 'pending',
    credential_status TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    credential_claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets Table
CREATE TABLE assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    company_id UUID REFERENCES kyb_applications(id),
    asset_type TEXT,
    status TEXT DEFAULT 'draft',
    authorized_by UUID,
    authorized_at TIMESTAMPTZ,
    nft_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments Table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount NUMERIC,
    currency TEXT,
    asset_id UUID REFERENCES assets(id),
    tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credentials Table
CREATE TABLE credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kyb_application_id UUID REFERENCES kyb_applications(id),
    wallet_address TEXT NOT NULL,
    credential_type TEXT,
    status TEXT DEFAULT 'active',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT
);

-- Enable Row Level Security
ALTER TABLE kyb_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all authenticated users)
CREATE POLICY "Allow authenticated access" ON kyb_applications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON assets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON payments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access" ON credentials FOR ALL USING (auth.role() = 'authenticated');
```

### Step 3: Configure Environment Variables

Create `/frontend/.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_XRPL_NETWORK=testnet
```

### Step 4: Create Admin User

Run in Supabase SQL Editor:

```sql
-- Create admin user (replace with your email/password)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@zerogate.com',
    crypt('your-password-here', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin"}',
    NOW(),
    NOW()
);
```

**Or use Supabase Dashboard:**
1. Go to Authentication → Users
2. Click "Add User"
3. Email: `admin@zerogate.com`
4. Password: Choose a secure password
5. User Metadata: Add `{"role": "admin"}`

### Step 5: Update App.jsx with Routes

Install React Router (if not already installed):
```bash
npm install react-router-dom
```

Update `/frontend/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Marketplace from './pages/Marketplace';
import AdminLogin from './pages/AdminLogin';
import ComplianceDashboard from './pages/ComplianceDashboard';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Business/Client Routes */}
                <Route path="/" element={<Marketplace />} />
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<ComplianceDashboard />} />
                
                {/* Redirect */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
```

### Step 6: Update Marketplace to use Supabase

Update KYB submission in `/frontend/src/pages/Marketplace.jsx`:

```javascript
import { submitKYBApplication as submitToSupabase } from '../utils/supabase';

const handleKYBSubmit = async (formData) => {
    console.log('KYB Application submitted:', formData);
    
    // Submit to Supabase
    try {
        const application = await submitToSupabase(formData);
        setKybSubmitted(true);
        setShowKYBForm(false);
        alert('✅ KYB Application Submitted! Check the Admin Dashboard to approve it.');
    } catch (error) {
        console.error('Failed to submit KYB:', error);
        alert('Failed to submit application. Please try again.');
    }
};
```

---

## 🎨 What You Get

### Admin Login Flow
```
1. Navigate to /admin/login
2. Enter admin credentials
3. Redirected to /admin/dashboard
```

### Admin Dashboard Features

**Top Bar:**
- Admin email display
- Logout button

**Stats Dashboard:**
- Pending KYB count
- Verified companies
- Active credentials
- Total payments

**Navigation Tabs:**
1. **KYB Review Desk** ← Fully functional!
2. Credential Manager
3. Asset Authorization
4. Payment Monitor
5. Revocation Tool

**Real-time Notifications:**
- Toast notifications for new applications
- Payment updates
- Credential events

---

## 🔐 Security Architecture

### Current Setup (Demo Safe)
- Admin auth through Supabase  
- Credential issuance simulated in frontend
- Good for hackathon demonstration

### Production Setup (Required for 5K Prize)

**Create Secure Backend API:**

```javascript
// Example: Supabase Edge Function
// supabase/functions/issue-credential/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Service role, not anon!
    );

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error } = await supabase.auth.getUser(authHeader?.split(' ')[1]);
    
    if (!user || user.user_metadata?.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Get issuer seed from secret manager (NOT in code!)
    const issuerSeed = Deno.env.get('ISSUER_SEED');
    
    // Issue credential on XRPL
    const { applicationId } = await req.json();
    
    // ... XRPL credential issuance logic here ...
    
    return new Response(JSON.stringify({ success: true, hash }), {
        headers: { 'Content-Type': 'application/json' }
    });
});
```

---

## 📋 Next Steps

### Phase 1: Basic Testing (Now)
1. Create Supabase project
2. Run SQL to create tables
3. Create admin user
4. Test login at `/admin/login`
5. Submit KYB from marketplace
6. View and approve in admin dashboard

### Phase 2: Complete Components (2-4 hours)
Implement the placeholder components following the `KYBReviewDesk` pattern:

1. **CredentialManager** - List all credentials, show status
2. **AssetAuthorization** - Approve draft assets
3. **PaymentMonitor** - Real-time payment feed
4. **RevocationTool** - Revoke credentials

### Phase 3: Backend API (Production)
1. Create Supabase Edge Functions or GCP Cloud Functions
2. Move ISSUER_SEED to secret manager
3. Admin UI calls API, API signs transactions
4. Implement proper authorization checks

### Phase 4: Polish (Optional)
- Add search/filter to all tables
- Export to CSV functionality
- Detailed audit logs
- Multi-sig wallet support for admin

---

## 🏆 For the 5K Prize

**What Judges Want to See:**

✅ **Separate Admin Portal** - Done!
✅ **Secure Login** - Supabase auth implemented
✅ **KYB Review Workflow** - Fully functional
✅ **Professional UI** - Institutional-grade dashboard
✅ **Real-time Updates** - Subscription hooks ready
⏳ **Backend API** - Needs implementation
⏳ **Secret Management** - Use GCP Secret Manager

**The Current Setup:**
- **Good for**: Hackathon demo, showing UI/UX excellence
- **Need for production**: Secure backend API that holds the issuer seed

---

## 🐛 Troubleshooting

**Problem: Can' t login**
- Check Supabase URL and keys in `.env`
- Verify admin user has `role: "admin"` in metadata

**Problem: Applications don't show**
- Check Supabase table policies
- Open browser console for errors
- Verify data exists in Supabase dashboard

**Problem: Real-time not working**
- Enable Realtime in Supabase dashboard
- Check Realtime policies

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Edge Functions](https://supabase.com/docs/guides/functions)

---

**You now have a professional compliance dashboard! 🎉**

The foundation is solid - complete the remaining components and add the secure backend to make it production-ready!
