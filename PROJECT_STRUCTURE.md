# Project Structure & Configuration Guide

## 📋 Overview

This document explains how the ZeroGate project is organized and configured to work with both **Node.js** (frontend) and **Deno** (backend Edge Functions).

## 🏗️ Directory Structure

```
zerogate/
├── .env                      # Root environment variables (git-ignored)
├── .env.example              # Example environment variables template
├── .gitignore                # Root gitignore for the entire project
├── package.json              # Root monorepo configuration with workspaces
├── package-lock.json         # Root lockfile
├── node_modules/             # Shared Node.js dependencies (root level)
├── README.md                 # Main project documentation
│
├── .vscode/                  # VS Code workspace configuration
│   ├── settings.json        # IDE settings for Deno + Node.js
│   └── extensions.json      # Recommended VS Code extensions
│
├── frontend/                 # React application (Node.js workspace)
│   ├── src/                 # React components and utilities
│   ├── package.json         # Frontend workspace config (minimal)
│   └── vite.config.js       # Vite build configuration
│
├── scripts/                  # Utility scripts (Node.js workspace)
│   ├── issue_credential.js
│   └── package.json         # Scripts workspace config
│
└── supabase/                 # Supabase backend
    └── functions/           # Deno Edge Functions
        ├── deno.json        # Deno configuration
        ├── issue-credential/
        └── revoke-credential/
```

## 🔧 Why This Structure?

### Monorepo with npm Workspaces

This project uses **npm workspaces** to manage multiple packages:

1. **`frontend/`** - React application workspace
2. **`scripts/`** - Utility scripts workspace

All Node.js dependencies are installed at the **root level** in a single `node_modules/` folder, which is shared by both workspaces. This:
- ✅ Reduces disk space (no duplicate dependencies)
- ✅ Ensures version consistency across workspaces
- ✅ Simplifies dependency management
- ✅ Faster npm install times

### Dual Runtime Architecture

This project uses **two different JavaScript runtimes**:

1. **Node.js** (`frontend/`) - Traditional npm packages
   - Uses `node_modules` for dependencies
   - Imports like: `import React from 'react'`
   - Package manager: npm/yarn

2. **Deno** (`supabase/functions/`) - Modern, secure runtime
   - Uses HTTP imports for dependencies
   - Imports like: `import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'`
   - No `node_modules` needed

### Why Can't They Share node_modules?

**They use completely different module systems:**
- Node.js loads from `node_modules/` folder
- Deno loads from URLs and caches globally
- Trying to mix them causes conflicts and errors

## 🌍 Environment Variables

### Root `.env` File

All environment variables are now centralized in the **root `.env`** file:

```bash
# Supabase Configuration (for backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# XRPL Configuration
ISSUER_SEED=sYourSecretSeedHere
XRPL_NETWORK=testnet

# Frontend (Vite requires VITE_ prefix)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_XRPL_NETWORK=testnet
```

### Variable Naming Conventions

- **Frontend variables**: Must start with `VITE_` to be accessible in the browser
- **Backend variables**: No prefix needed, only accessible in Edge Functions
- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` or `ISSUER_SEED` to the frontend!

## 💡 IDE Configuration

### VS Code Settings (`.vscode/settings.json`)

The workspace is configured to handle both environments:

```json
{
  "deno.enable": true,
  "deno.enablePaths": [
    "./supabase/functions"  // Only enable Deno for this folder
  ],
  "typescript.tsdk": "frontend/node_modules/typescript/lib"
}
```

This tells VS Code:
- Use **Deno** for files in `supabase/functions/`
- Use **Node.js/TypeScript** for files in `frontend/`

### Recommended Extensions

Install these VS Code extensions:
- **Deno** (`denoland.vscode-deno`) - For Supabase Edge Functions
- **ESLint** (`dbaeumer.vscode-eslint`) - For frontend linting
- **Supabase** (`supabase.supabase-vscode`) - Supabase integration

## 🚫 Git Ignore Strategy

The root `.gitignore` ignores:
- All `.env` files (security)
- All `node_modules/` folders
- Build outputs (`dist/`, `build/`)
- IDE files (`.vscode` except settings)

**Only committed**: `.env.example`

## 🔍 Common Issues & Solutions

### "Cannot find module 'xrpl'" in Supabase functions

**Cause**: TypeScript trying to check Deno files with Node.js types

**Solution**: Files use `// @ts-nocheck` to disable TypeScript checking
- Deno has its own type system
- Types work correctly at runtime in Deno
- IDE errors are suppressed

### Frontend can't read environment variables

**Cause**: Variables don't have `VITE_` prefix

**Solution**: Add `VITE_` prefix to any variable you need in the frontend:
```bash
# ❌ Won't work in frontend
SUPABASE_URL=...

# ✅ Works in frontend
VITE_SUPABASE_URL=...
```

### Changes to `.env` not reflecting

**Solution**: Restart the dev server:
```bash
cd frontend
npm run dev
```

For Supabase functions: redeploy them after env changes

## 📦 Dependency Management  

### Installing Dependencies

All dependencies are managed from the **root directory**:

```bash
# Install all dependencies for all workspaces
npm install

# Add a dependency to a specific workspace
npm install <package-name> --workspace=frontend
npm install <package-name> --workspace=scripts

# Add a dev dependency
npm install <package-name> --save-dev --workspace=frontend
```

### Supabase Edge Functions (Deno)

No installation needed! Just import via URL:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
```

Deno caches them automatically on first use.

## 🚀 Development Workflow

### Starting the Frontend

```bash
# From root directory
npm run dev

# Or explicitly
npm run dev:frontend

# First time? Just run:
npm install  # Installs everything
npm run dev  # Starts dev server
```

### Testing Edge Functions Locally

1. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. Serve functions:
   ```bash
   supabase functions serve
   ```

### Deploying Edge Functions

```bash
supabase functions deploy issue-credential --no-verify-jwt
supabase functions deploy revoke-credential --no-verify-jwt
```

## 📚 Additional Resources

- [Deno Documentation](https://deno.land/manual)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## ✅ Checklist for New Developers

- [ ] Clone the repository
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Install all dependencies from root: `npm install`
- [ ] Install recommended VS Code extensions
- [ ] Start frontend dev server from root: `npm run dev`
- [ ] (Optional) Install Deno locally for better IDE support: `brew install deno`
- [ ] (Optional) Install Supabase CLI for local function testing: `brew install supabase/tap/supabase`

---

**Questions?** Check the main [README.md](./README.md) or project documentation files.
