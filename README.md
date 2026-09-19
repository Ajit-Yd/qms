# QMS — Quality Management System

A full-stack quality management app: teams track work records (Documents, CAPAs, Non-conformances, Audits, Training) through an approval workflow, manage committees and tasks, and get notified in-app.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript strict
- **Prisma 7** + **Neon PostgreSQL** (`@prisma/adapter-pg`)
- **NextAuth.js v4** (Credentials, JWT sessions)
- **Tailwind v4**

## Repository layout

| Path | Purpose |
|---|---|
| `app/` | App Router pages + `/api/*` route handlers |
| `src/lib/` | Business logic: record API, permissions, email, api-auth, succession |
| `lib/` | App-shared: seed org data, client cache, client-safe permission re-exports |
| `components/` | Shared React UI (module core, dashboard, committees, forms) |
| `prisma/` | Schema, migrations, seed script |
| `proxy.ts` | Auth gate (Next 16 proxy) — redirects unauthenticated users to `/login` |

Five record modules (documents, capas, nonconformances, audits, training) are driven by one shared implementation parameterized by `ModuleKey` — see `src/lib/qms-record-api.ts` and `src/lib/module-route-factory.ts`.

## Getting started

```bash
npx prisma generate --config prisma.config.ts
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm start            # serve production build
```

Set env vars in `.env.local` (see `.env.local.example`):

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<32+ chars>
NEXTAUTH_URL=http://localhost:3000
```

## Seed data

```bash
npm run prisma:seed          # DESTRUCTIVE — wipes DB, reloads demo data
```

The seed creates an org tree (`Director → Deputy Director → Leads → Owners → staff`), sample records for every module, committees, tasks, history, notifications, and distinct login credentials (printed on success).

## Verification

```bash
npx tsc --noEmit
npx eslint .
```

Deployment checklist: see `DEPLOY.md`.
