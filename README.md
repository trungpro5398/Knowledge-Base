# Knowledge Base for TET

Tài liệu vận hành, quy trình và quyết định nội bộ. Built with Next.js, Fastify, and Supabase.

## Architecture

- **Web** (Vercel): Next.js App Router - SSR/ISR for KB pages, Admin UI, Google Workspace SSO (chỉ @tet-edu.com)
- **API** (Vercel): Fastify Node.js - CRUD, RBAC, search, audit
- **DB/Auth** (Supabase): PostgreSQL, Auth, Storage

## Quick Start

### Prerequisites

- Node.js 22.13+
- pnpm 11.16+
- Supabase account

### Setup

```bash
pnpm install
```

### Environment

Create `.env` in `apps/web` and `apps/api`:

**apps/web/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
# Local: http://localhost:3001 | Production: https://knowledge-base-api-alpha.vercel.app
NEXT_PUBLIC_API_URL=http://localhost:3001
# Optional: protects the manual /api/revalidate webhook
# REVALIDATE_SECRET=your-secret
```

**apps/api/.env**
```
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SECRET_KEY=your-server-secret
# The API calls Supabase server-side through PostgREST/RPC; no DB pooler URL is needed.
CORS_ORIGINS=http://localhost:3000
```

### Run

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

## Project Structure

```
├── apps/
│   ├── web/       # Next.js frontend
│   └── api/       # Fastify backend
├── packages/
│   └── shared/    # Shared types & schemas
└── supabase/
    └── migrations/
```

## Deployment

### Vercel (Web)

1. Connect GitHub repo to Vercel
2. Set root directory to `apps/web` or use monorepo detection
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
   - `NEXT_PUBLIC_API_URL` = `https://knowledge-base-api-alpha.vercel.app`
4. Build command: `cd ../.. && pnpm build --filter web`

### Vercel (API)

1. Run migrations on Supabase first.
2. Create/link project `knowledge-base-api` with root directory `apps/api`.
3. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`, and `CORS_ORIGINS` in Vercel.
