# Knowledge Base

Internal knowledge base application - Confluence alternative. Built with Next.js, Fastify, and Supabase.

## Architecture

- **Web** (Vercel): Next.js App Router - SSR/ISR for KB pages, Admin UI
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
