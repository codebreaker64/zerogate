# Database Setup - Complete Schema

## 🎯 One-Step Setup

Run this **single SQL file** in Supabase to create all tables:

### Quick Setup

1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy **entire content** from:
   ```
   /Users/kaijie/Documents/GitHub/zerogate/supabase/migrations/00_complete_schema.sql
   ```
5. Paste and click **Run** (or Cmd+Enter)
6. ✅ Success! All tables created

## 📊 Tables Created

This unified migration creates:

### Authentication & Business
- ✅ **entities** - Wallet-based authentication (SIWX)
- ✅ **kyb_applications** - Business verification (KYB)
- ✅ **credentials** - Issued credentials

### Assets & Trading
- ✅ **assets** - RWA assets with polymorphic metadata
- ✅ **asset_history** - Audit trail for all changes
- ✅ **payments** - Transaction tracking

### Enums
- ✅ **asset_category** - Real Estate, Bonds, Carbon Credits, etc.
- ✅ **asset_status** - Draft → Pending → Authorized → Minted

### Features Included
- ✅ Row Level Security (RLS) enabled
- ✅ Auto-updating timestamps
- ✅ Audit logging triggers
- ✅ Proper indexes for performance
- ✅ Foreign key relationships

## 🔍 Verify Installation

After running the migration, check in Supabase:

**Table Editor** should show:
- entities
- kyb_applications  
- assets
- asset_history
- credentials
- payments

**SQL Editor** - Run this to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Should return 6 tables ✅

## 🚀 Next Steps

### Option 1: Use Wallet Login (Recommended)
1. Visit `http://localhost:5173/`
2. Click "Sign In with Crossmark"
3. Complete business onboarding
4. Start adding assets!

### Option 2: Use Admin Login (Legacy)
1. Create admin user in Supabase:
   - Go to **Authentication** → **Users**
   - Click **Add User**
   - Email: `admin@zerogate.com`
   - Password: (your choice)
   - User Metadata: `{"role": "admin"}`
2. Visit `http://localhost:5173/admin/login`
3. Login with credentials

## 📝 Schema Overview

### Entity → KYB → Asset Flow

```
1. Entity signs in with wallet (SIWX)
   ↓
2. Completes business onboarding
   ↓
3. Submits KYB application
   ↓
4. Admin reviews and approves
   ↓
5. Entity creates assets (draft)
   ↓
6. Admin authorizes assets
   ↓
7. Entity mints tokens
   ↓
8. Assets appear on marketplace
```

### Database Relationships

```
entities (1) ←→ (many) kyb_applications
entities (1) ←→ (many) assets
entities (1) ←→ (many) credentials
assets (1) ←→ (many) asset_history
assets (1) ←→ (many) payments
```

## 🔧 Troubleshooting

### "relation already exists"
- Normal if re-running
- The `IF NOT EXISTS` clauses handle this
- Migration is idempotent (safe to run multiple times)

### "permission denied"
- Make sure you're using **SQL Editor** in Supabase Dashboard
- Don't run via Supabase CLI if not configured

### Login still fails
- Clear browser cache
- Reload page
- Check that RLS policies are enabled

## 📚 File Organization

```
supabase/migrations/
├── 00_complete_schema.sql        ← RUN THIS ONE! (All-in-one)
├── create_entities_table.sql     ← (Deprecated - included above)
└── create_assets_schema.sql      ← (Deprecated - included above)
```

**Use `00_complete_schema.sql` - it has everything!**

---

**Ready to go!** 🚀 Run the migration and start building!
