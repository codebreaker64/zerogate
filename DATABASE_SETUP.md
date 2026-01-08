# Database Setup Instructions

## Run These SQL Migrations in Supabase

### Step 1: Go to Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Select your project: `ikytcaoopklycygrvefk`
3. Click "SQL Editor" in the left sidebar

### Step 2: Run Migrations

Copy and paste each migration file into the SQL Editor and click "Run"

#### Migration 1: Create Entities Table
```sql
-- File: supabase/migrations/create_entities_table.sql
-- Copy content from: /Users/kaijie/Documents/GitHub/zerogate/supabase/migrations/create_entities_table.sql
```

#### Migration 2: Create Assets Schema
```sql
-- File: supabase/migrations/create_assets_schema.sql
-- Copy content from: /Users/kaijie/Documents/GitHub/zerogate/supabase/migrations/create_assets_schema.sql
```

### Quick Commands

```bash
# Option 1: Use Supabase CLI (if installed)
supabase db push

# Option 2: Manually run each file in SQL Editor
# - Open Supabase Dashboard
# - SQL Editor
# - Paste migration content
# - Run
```

### Verify Tables Created

After running migrations, check these tables exist:
- ✅ `entities` - Business profiles with wallet addresses
- ✅ `assets` - RWA assets with polymorphic metadata
- ✅ `asset_history` - Audit trail
- ✅ `kyb_applications` - KYB submissions (if exists from earlier setup)
- ✅ `credentials` - Issued credentials (if exists from earlier setup)

### Admin User Setup

For the legacy admin login to work, create an admin user:

```sql
-- Create admin user (run in Supabase SQL Editor)
-- This uses Supabase Auth

-- First, you need to sign up via the admin portal UI
-- OR create manually:

-- Go to Authentication > Users in Supabase Dashboard
-- Click "Add User"
-- Email: admin@zerogate.com
-- Password: [choose a secure password]
-- User Metadata: {"role": "admin"}
```

## Current Status

❌ **Issue:** Tables don't exist in database  
✅ **Solution:** Run migrations above  
🔧 **Alternative:** Use WalletLogin instead (SIWX) - this is the new recommended way  
