# KB App Architecture

## Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser   │────▶│  Next.js (Vercel)│────▶│  Fastify (Fly)  │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                               │                      │
                               │                      ▼
                               │              ┌───────────────┐
                               └─────────────▶│   Supabase    │
                                              │ - Auth        │
                                              │ - Postgres    │
                                              │ - Storage     │
                                              └───────────────┘
```

## Data Flow

- **KB Pages (public)**: Next.js SSR fetches from API `GET /api/spaces/by-slug/:slug/pages/by-path?path=...` (no auth for published)
- **Admin**: Next.js calls API with Supabase JWT in Authorization header
- **API**: Verifies JWT with Supabase, checks RBAC via memberships table, queries Postgres

## Key Tables

- `spaces` - Top-level containers
- `pages` - Hierarchical content (ltree path)
- `page_versions` - Content history
- `memberships` - RBAC (viewer/editor/admin per space)
- `audit_events` - Audit log

## Deployment

- **Web**: Vercel, root `apps/web`
- **API**: Fly.io, Dockerfile.api at repo root
- **DB**: Supabase (migrations in `supabase/migrations/`)
