# ZeroGate – Institutional Grade Credential Platform

ZeroGate is a full-stack XRPL + Supabase platform for institutional credentialing, KYB, asset governance, and managed issuance. This consolidated README replaces all other Markdown docs.

## Table of Contents
- Overview
- Quick Start (5 minutes)
- Project Structure
- Core Features
- Authentication (SIWX)
- Database Setup
- Admin Portal Setup
- Backend API (Secure Edge Function)
- Credential Verification (On-Chain)
- Implementation Summary & TODOs
- Managed Asset Issuance Portal
- Environment Variables
- Frontend Notes (Vite template)
- Troubleshooting & Resources

## Overview
- Decentralized credential issuance and verification on XRPL.
- Supabase provides auth, database, realtime, and Edge Functions.
- Dual portals: Business marketplace and Admin compliance dashboard.

## Quick Start (5 minutes)
1. Create a Supabase project at https://supabase.com/dashboard.
2. Copy project URL and anon key.
3. Create frontend env file:
   ```bash
   cd frontend
   cp .env.example .env
   ```
   Fill:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   VITE_XRPL_NETWORK=testnet
   ```
4. Run database SQL from the Database Setup section below.
5. Create admin user in Supabase Auth with user metadata `{ "role": "admin" }`.
6. Start app: `npm run dev` (from repo root). Visit:
   - Business portal: http://localhost:5173/
   - Admin login: http://localhost:5173/admin/login

## Project Structure
```
zerogate/
├── .env (git-ignored) / .env.example
├── package.json / package-lock.json (npm workspaces)
├── frontend/ (React + Vite)
│   ├── src/
│   └── package.json
├── scripts/ (utility scripts workspace)
├── supabase/
│   └── functions/ (Deno Edge Functions: issue-credential, asset-workflow, wallet-auth, revoke-credential)
└── node_modules/ (shared across workspaces)
```
Why: npm workspaces reduce duplication; Node.js (frontend/scripts) and Deno (Edge Functions) stay isolated.

## Core Features
- Three.js landing page with animated particle field, rings, and sphere.
- Crossmark wallet integration (auto-detect, dual wallet support, install prompt).
- KYB workflow with admin review, stats dashboard, realtime notifications.
- Credential issuance on XRPL (secure backend path) and verification via transaction memos.
- NFT-based RWA minting (unique NFTs), asset governance, and managed issuance portal.

## Authentication (SIWX Hybrid)
- Wallet-first auth with nonce + signed message (Crossmark).
- Business profile layer (company name, UEN, corporate email, industry, country).
- Backend function: `supabase/functions/wallet-auth/index.ts` verifies signature, issues session.
- Entities table (wallet ↔ company mapping) with statuses: `pending_onboarding`, `active`, `suspended`, `pending_kyb`.

## Database Setup
Run once in Supabase SQL Editor:
```sql
-- One-step schema (recommended): use supabase/migrations/00_complete_schema.sql
```
Tables: `entities`, `kyb_applications`, `credentials`, `assets`, `asset_history`, `payments`, enums for `asset_category` and `asset_status`, RLS enabled, audit triggers, indexes.

Legacy split migrations (if needed): create_entities_table.sql, create_assets_schema.sql.

Verify tables:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

Admin user (legacy email login): create via Supabase Auth UI with metadata `{ "role": "admin" }`.

## Admin Portal Setup (Frontend + Supabase)
- Supabase client: frontend/src/utils/supabase.js
- Pages: AdminLogin, ComplianceDashboard
- Components: KYBReviewDesk (implemented), CredentialManager, AssetAuthorization, PaymentMonitor, RevocationTool (placeholders follow KYB pattern)
- Routes (App.jsx): `/` marketplace, `/admin/login`, `/admin/dashboard`, fallback redirect.
- KYB submission uses Supabase functions; production flow should call secure Edge Function for issuance.

### Admin Portal SQL (if not using full schema above)
Creates kyb_applications, assets, payments, credentials with RLS and simple authenticated policies (see previous section for full schema).

### Admin Quickstart
1) Create Supabase project and `.env` as above. 2) Run SQL. 3) Add admin user with role metadata. 4) `npm run dev`. 5) Submit KYB from marketplace and approve in dashboard.

## Backend API (Secure Edge Function)
- Edge Function: supabase/functions/issue-credential/index.ts
  - Verifies admin session token
  - Uses `ISSUER_SEED` from secrets (never in frontend)
  - Issues XRPL Payment with memo, updates kyb_applications and credentials
  - CORS + logging included
- Frontend wrapper: `issueCredentialViaAPI()` in frontend/src/utils/supabase.js (auto session token, returns tx hash).

### Deploy (5 minutes)
```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase secrets set ISSUER_SEED=sYourSeedHere
supabase functions deploy issue-credential
```

### Update KYBReviewDesk
Replace `handleApprove` with the secure API call:
```javascript
import { issueCredentialViaAPI } from '../../utils/supabase';

const handleApprove = async (application) => {
  setProcessing(application.id);
  try {
    const result = await issueCredentialViaAPI(application.id);
    await loadApplications();
    if (onUpdate) onUpdate();
    alert(`Approved! Tx Hash: ${result.hash}`);
  } catch (error) {
    alert(`Failed: ${error.message}`);
  } finally {
    setProcessing(null);
  }
};
```

### Deployment Checklist
- Supabase CLI installed and project linked
- ISSUER_SEED secret set
- Function deployed
- Frontend uses `issueCredentialViaAPI()`
- Admin auth working; policies configured; logging enabled

## Credential Verification (On-Chain)
- Issuance: XRPL Payment of 1 drop with memo (`MemoType=CredentialType`, `MemoData=AccreditedInvestor`).
- Verification flow: fetch recent transactions → filter Payments → issuer match → destination match → memo match.
- Advantages: decentralized trust, immutability, cost effective, standards-based; future upgrade path to XLS-70d credential objects.

## Implementation Summary & TODOs
Completed:
- Persistent testnet wallet stored in localStorage (key `zerogate_testnet_wallet`).
- Shared KYB storage (frontend/src/utils/kybStorage.js) with submit/get/update and event dispatch for realtime UI sync.
- NFT-based RWA tokens (frontend/src/utils/nft.js) with mint/list/offer helpers.
- Marketplace updated to use shared KYB, NFT display, and minting.

Outstanding updates (recommended):
- Marketplace `handleMint` flow (see Implementation Summary for full snippet) to use temporary issuer wallet and refresh NFTs.
- AdminDashboard to load from shared storage and listen for KYB events.
- Marketplace header NFT display and improved testnet wallet connection parity with Crossmark.

## Managed Asset Issuance Portal
- Value: self-service institutional tokenization with Draft → Review → Authorization → Mint governance; ZeroGate stays Authorized Minter.
- Status lifecycle: draft → pending_review → authorized → minted; rejected/suspended paths supported.
- Polymorphic metadata per asset class (Real Estate, Fixed Income, Carbon Credits) with required documents and JSONB storage.
- Edge Function: `asset-workflow` handles submit_for_review, authorize, reject.
- UI: company portal asset dashboard + creation modal; admin review queue with authorize/reject and audit trail.

## Environment Variables
Root `.env` (shared):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ISSUER_SEED=sYourSecretSeedHere
XRPL_NETWORK=testnet
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_XRPL_NETWORK=testnet
```
Rules: Frontend vars require `VITE_` prefix; never expose service role key or issuer seed to browser.

## Frontend Notes (Vite template)
- React + Vite with HMR; ESLint available. React Compiler disabled by default; see React docs if enabling.
- For production apps, TypeScript with type-aware ESLint is recommended.

## Troubleshooting & Resources
- Function deploy issues: `deno check supabase/functions/issue-credential/index.ts` then `supabase functions logs issue-credential`.
- Auth errors: ensure admin user metadata `role: "admin"`; session token sent to Edge Function.
- XRPL errors: verify testnet connectivity and valid `ISSUER_SEED`.
- Database missing: rerun full schema SQL; confirm RLS policies.
- Realtime issues: enable Realtime in Supabase dashboard.

Resources: Supabase docs, XRPL docs, Vite env guide, Deno manual.
