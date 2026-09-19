# Deployment Checklist

## 1. Environment Variables

Set these on your hosting platform (Vercel, Railway, etc.):

```
DATABASE_URL=postgresql://neondb_owner:...@ep-....us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=<any long random string, 32+ chars>
NEXTAUTH_URL=https://your-production-domain.com
```

**Never commit `.env.local`** to version control.

## 2. Database

The Neon database is already live with all migrations applied and seeded.
No action required unless you're deploying to a fresh database:

```bash
npx prisma migrate deploy --config prisma.config.ts
npx prisma db seed --config prisma.config.ts   # DESTRUCTIVE — clears all data
```

## 3. Build

```bash
npm ci
npm run build
```

If deploying to Vercel/Netlify/Railway, this runs automatically on push.

## 4. Start (self-hosted)

```bash
PORT=3000 node node_modules/next/dist/bin/next start
```

## 5. Post-deploy verification

1. Visit `https://your-domain.com/` — should redirect to `/login`
2. Log in with a seeded account (see `PROJECT_REVIEW.md` §4.1 for credentials)
3. Verify: Dashboard loads, module switching is instant, no console errors
4. Test a workflow action (e.g. Submit → Approve)

## 6. Platform-specific notes

### Vercel
- Auto-detects Next.js, no config needed
- Neon DATABASE_URL works directly (serverless driver via `@prisma/adapter-pg`)
- `NEXTAUTH_URL` must match your Vercel domain exactly (no trailing slash)

### Railway / Render / Fly.io
- Set `PORT` env var if not 3000
- Ensure Node.js 20+ runtime
- Neon connection pooling via `-pooler` suffix in `DATABASE_URL` is already configured

### Docker
- Build: `docker build . -t qms`
- Run: `docker run -p 3000:3000 -e DATABASE_URL=... -e NEXTAUTH_SECRET=... -e NEXTAUTH_URL=https://your-domain.com qms`

## 7. Security notes

- `proxy.ts` (Next 16 auth proxy) redirects unauthenticated users to `/login`
- API routes (`/api/*`) are excluded from the proxy but self-guarded server-side (return 401)
- `passwordHash` is stripped from all API responses (`src/lib/permissions.ts`)
- The Neon pooler SSL connection is configured in `DATABASE_URL`

## 8. Known limitations

- **5 npm audit highs** are all `mysql2` (transitive dep of Prisma, unused for PostgreSQL) — not exploitable
