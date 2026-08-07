# KB App Architecture

## Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Browser   │────▶│  Next.js (Vercel)│────▶│ Fastify API (Vercel)│
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                               │                         │
                               │                         ▼
                               │                 ┌───────────────┐
                               └────────────────▶│   Supabase    │
                                                 │ - Auth         │
                                                 │ - tet_kb       │
                                                 │ - Storage      │
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
- **API**: Vercel serverless Node function, root `apps/api`
- **DB/Auth/Storage**: shared Supabase project `tet-crm`; Knowledge Base tables are isolated in schema `tet_kb`
- **CRM isolation**: CRM tables remain in their existing schema and are not changed by KB routes
- **Rollback**: Fly configuration remains available until the Vercel API is smoke-tested in production
