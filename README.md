# ZeroGate - Institutional Grade Credential Platform

A decentralized credential platform built on XRPL with Supabase backend for institutional compliance.

## 📁 Project Structure

```
zerogate/
├── frontend/           # React + Vite frontend application
│   ├── src/           # React components and utilities
│   └── package.json   # Frontend workspace config
├── supabase/          # Supabase Edge Functions (Deno)
│   └── functions/     # Serverless functions
│       ├── issue-credential/
│       ├── revoke-credential/
│       └── deno.json  # Deno configuration
├── scripts/           # Utility scripts
│   └── package.json   # Scripts workspace config
├── node_modules/      # Shared Node.js dependencies (root level)
├── package.json       # Root monorepo configuration
├── package-lock.json  # Root lockfile
├── .env              # Root environment variables (shared)
├── .env.example      # Example environment variables
└── .gitignore        # Root gitignore

```

## 🔧 Technology Stack

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Three.js** - 3D graphics
- **Crossmark SDK** - XRPL wallet integration
- **Supabase Client** - Backend API client

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Edge Functions (Deno runtime)
  - Authentication
  - Real-time subscriptions
- **XRPL** - Blockchain for credential issuance

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for frontend and scripts)
- npm (comes with Node.js)
- Deno (optional, only for local Edge Function testing)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd zerogate
```

2. **Install all dependencies (from root)**
```bash
npm install
```

This will install dependencies for both frontend and scripts workspaces into a single `node_modules` at the root.

3. **Set up environment variables**

Copy the example environment file and update with your values:
```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (backend only)
- `ISSUER_SEED` - XRPL issuer wallet seed
- `VITE_SUPABASE_URL` - Supabase URL for frontend
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key for frontend

### Running the Application

#### Frontend Development Server
```bash
# From root directory
npm run dev

# Or explicitly
npm run dev:frontend
```
The frontend will run on `http://localhost:5173`

#### Supabase Edge Functions
Edge functions are deployed to Supabase and run in a Deno runtime. 

**Local testing (requires Supabase CLI)**:
```bash
supabase functions serve
```

**Deploy to Supabase**:
```bash
supabase functions deploy issue-credential
supabase functions deploy revoke-credential
```

## 📦 Environment Variables

### Root `.env` (Shared Configuration)
The root `.env` file contains all environment variables for both frontend and backend.

**Frontend variables** must have the `VITE_` prefix to be accessible in the browser.

**Backend variables** are used by Supabase Edge Functions and should never be exposed to the frontend.

### Why Two Runtimes?

This project uses both **Node.js** and **Deno**:

- **Node.js** (`frontend/`): React app with traditional npm packages
- **Deno** (`supabase/functions/`): Supabase Edge Functions with HTTP imports

They **cannot share the same node_modules** because:
1. Deno uses HTTP imports (e.g., `https://esm.sh/xrpl@2.9.0`)
2. Node.js uses npm packages (e.g., `npm install xrpl`)
3. Different runtime APIs and security models

## 🛠️ IDE Setup

### VS Code (Recommended)

The project includes VS Code workspace settings in `.vscode/settings.json` that:
- Enable Deno for `supabase/functions/` directory
- Use TypeScript for the frontend
- Configure formatters and linters
- Exclude unnecessary files from search

**Recommended Extensions**:
- [Deno](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) - For Supabase Edge Functions
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) - For frontend linting
- [Supabase](https://marketplace.visualstudio.com/items?itemName=supabase.supabase-vscode) - Supabase integration

## 📝 Key Features

- **KYB Application System** - Business verification workflow
- **Credential Issuance** - Issue verifiable credentials on XRPL
- **Credential Revocation** - Revoke credentials when needed
- **Wallet Integration** - Crossmark wallet support
- **Admin Dashboard** - Institutional compliance portal
- **Real-time Updates** - Live status updates via Supabase

## 🔐 Security

- Environment variables are kept in `.env` (git-ignored)
- Service role keys are only used in backend Edge Functions
- Frontend only has access to `VITE_` prefixed variables
- XRPL wallet seeds are stored securely in environment variables

## 📚 Documentation

- [Admin Portal Setup](./ADMIN_PORTAL_SETUP.md)
- [Backend API Complete](./BACKEND_API_COMPLETE.md)
- [Credential Verification](./CREDENTIAL_VERIFICATION_EXPLAINED.md)
- [Features Overview](./FEATURES.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Add your license here]
