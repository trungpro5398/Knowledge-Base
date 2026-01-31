# Knowledge Base

Internal knowledge base application - Confluence alternative. Built with Next.js, Fastify, and Supabase.

## Architecture

- **Web** (Vercel): Next.js App Router - SSR/ISR for KB pages, Admin UI, Đăng ký/Đăng nhập (chỉ @tet-edu.com)
- **API** (Fly.io): Fastify Node.js - CRUD, RBAC, search, audit
- **DB/Auth** (Supabase): PostgreSQL, Auth, Storage

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
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
# Local: http://localhost:3001 | Production: https://knowledge-base-api.fly.dev
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**apps/api/.env**
```
PORT=3001
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://...
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
   - `NEXT_PUBLIC_API_URL` = `https://knowledge-base-api.fly.dev`
4. Build command: `cd ../.. && pnpm build --filter web`

### Fly.io (API)

1. Run migrations on Supabase first
2. From `apps/api`: `fly launch` (creates app) or `fly deploy` - use parent directory as build context
3. Or from repo root with fly.toml at root
4. Set secrets: `fly secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... DATABASE_URL=... CORS_ORIGINS=https://your-vercel-app.vercel.app`
