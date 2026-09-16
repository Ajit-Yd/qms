# QMS Project — Evaluation & Completion Report

Date: 2026-09-09
Scope: `A:\qms` (Next.js 16.3.5 App Router, React 19, TypeScript strict, Prisma 7.9.1 + `@prisma/adapter-pg`, Neon PostgreSQL, NextAuth.js v4 Credentials/JWT, Resend, Tailwind v4)
Repo: NOT under git — deletions are permanent.

---

## 1. Verification status (headline)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint .` | 0 problems |
| `npm run build` | Green — compiled, TypeScript passed, 30 pages emitted; ƒ Proxy (Middleware) registered |
| Proxy (auth gate) | Anonymous users → 307 redirect to `/login`; public paths (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/unauthorized`) + API routes pass through; authenticated access confirmed |
| DB migrations | All 5 applied to live Neon DB (was 3 pending + 1 broken) |
| Prisma client | Regenerated against current schema |
| DB seed | Re-seeded (demo data + passwords) — see §4.1 |
| Runtime test | Passed — live server: login, dashboards, committees, profiles, notifications, succession, mark-read, auth guards (§8) |

### 2.2 Runtime security fix (found during live testing)
- **Password hashes were leaking** from 4 API routes (`/api/profiles`, `/api/profiles/[id]`, `/api/admin/team`, `/api/admin/permissions`) because full Prisma rows were returned. Added `toPublicProfile()` sanitizer (`src/lib/permissions.ts`) and applied it everywhere; `/api/profiles/[id]` now uses an explicit `select` without `passwordHash`. Verified live that no response contains `passwordHash`.

### 2.6 Final cleanup pass (2026-09-10)
- **Removed** the stale `A:\files3` deliverable package (planning docs/templates from an earlier session that referenced a different schema — `prisma.history`, `updatedAt`, `@/lib/qms-queries` — none of which exist in this codebase).
- **Real per-user credentials**: seed now gives each of the 11 profiles its own distinct password (`profilePasswords` in `prisma/seed.ts`) and prints the full credentials table (§4.1). Verified live: new passwords log in, the old `DemoPass123!` no longer works, wrong passwords are rejected.
- **`app/layout.tsx`** metadata → real QMS title/description (was `"Create Next App"`).
- **`components/qms.tsx`**: removed duplicate `"In Progress"` statusStyles entry; `StatusBadge` now normalizes case variants via `normalizeStatus`.
- **`toModuleKey`**: extracted to a single shared export in `src/lib/qms-record-api.ts` (was duplicated in 3 routes).
- **Committee Edit/Delete**: added `PATCH`/`DELETE /api/committees/[id]` (guarded by `canManageCommitteeMembers`), wired the once-inert buttons on the detail page to an inline edit form and a confirm-and-delete flow. Verified live (rename, create/delete, staff → 403).
- **Add user now creates a loggable account**: `/api/admin/team` `POST` builds a `passwordHash` (explicit `password` in the request or a generated temp password) and returns `temporaryPassword`; the admin UI surfaces it. Verified: added user can sign in.
- **`NEXTAUTH_SECRET`** replaced with a generated 48-char random secret.
- Full re-verify: `npx tsc --noEmit` 0 errors, `npx eslint .` 0 problems, `npm run build` green, reseeded (11 profiles), production server on :3000 serving the new build.
- **Profile pages with correct data**: new `app/profiles/[id]/page.tsx` (public profile: stats, direct reports, manager, committee memberships) backed by new `GET /api/profiles/[id]`. `ProfileDisplay` upgraded (email fallback, member-since, direct-report list, clickable committees). `/settings` now loads real memberships and links to the public profile; `/admin/team` profile cards link to profiles.
- **Email**: sender configurable via `RESEND_FROM_EMAIL`, `isEmailEnabled()`, and a `POST /api/admin/test-email` endpoint (top-authority only) to verify delivery. Email remains gracefully disabled until `RESEND_API_KEY` is added to `.env.local` (see §5.1).
- **Notifications**: `/notifications` page is now real — reads `/api/notifications`, per-item "Mark read" (`PATCH`), unread badge.
- **Seed**: demo login passes, extra committee tasks → 5, richer notifications.

### 2.7 UI finishing pass — responsiveness & navigation latency (2026-09-15)
- **Removed page-switching delays** in the main dashboard. Module switching, "New record", and row Edit no longer do a `router.push` (which remounted `Home` and re-fetched ~7 endpoints server-side every time). They now switch pure client state and keep the URL in sync via `window.history.replaceState` (`app/page.tsx` `syncUrl`), so module/tab switching is instant.
- **Client-side snapshot cache** (`lib/qms-cache.ts`, keyed by `viewerId`): `Home`'s profiles/records/notifications initial state hydrates synchronously from the cache on mount (session is already loaded on remounts), then refreshes silently in the background; the cache is written back after every data change. Back-navigation to `/` renders instantly.
- **Notification links** that point into a module now switch the in-app module/record state instead of navigating away; the review panel opens when the link targets a specific record.
- **Committee detail page** (`app/committees/[id]/page.tsx`): the three `window.location.reload()` calls after Add Member / Assign Task / Save Edit → replaced with an in-place `refetch()`. Incremental/near-instant updates, no full-page reload.
- **Committee list** (`app/committees/page.tsx`): create no longer relies on `router.refresh()` (which didn't refill rows); re-fetches in place; detail routes get `router.prefetch()`'d for instant row→detail nav.
- **Dashboard overdue logic** (`components/dashboard.tsx`): removed the hard-coded `2026-08-25` cutoff that made everything overdue; uses a relative `isOverdue()` (status `Overdue` or `dueDate < now`).
- **Responsive/UI polish**: login card `w-full` on small screens; verified existing responsive grids (KPIs `sm:grid-cols-2 xl:grid-cols-4`, detail `xl:grid-cols-[1.5fr_0.8fr]`, mobile card-list in `DataTable`, approval panel `max-w-[calc(100vw-2rem)]`).
- Full re-verify: `npx tsc --noEmit` 0 errors, `npx eslint .` 0 problems, `npm run build` green (30 pages), server restarted, `/`, `/documents`, `/committees`, `/audits/new`, `/capa/capa-1`, `/login` all HTTP 200 with a real session.

### 2.8 Deployment prep (2026-09-15)
- **Next.js upgraded to 16.3.5** — resolved a critical RCE advisory (GHSA-p293-qw3h-jr36) that specifically affected Windows-hosted instances; also fixes an Image Optimization AVIF RCE. `npm audit` now 0 critical, 5 remaining highs are all `mysql2` (transitive Prisma dep, unused by PostgreSQL).
- **`proxy.ts` auth gate** added (Next 16 convention — `middleware.ts` deprecated). Unauthenticated users are redirected to `/login` (307); public paths (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/unauthorized`) and API routes (self-guarded) pass through. Verified live: anonymous → 307 for `/`, `/committees`, `/settings`; authenticated → 200 everywhere.
- **`DEPLOY.md`** created — step-by-step deployment checklist covering env vars, database, build, platform notes (Vercel/Railway/Docker), post-deploy verification, security notes, and known limitations.
- Full re-verify: `npx tsc --noEmit` 0 errors, `npx eslint .` 0 problems, `npm run build` green, production server on :3000.

### 2.9 Director → monitor-only + Deputy Director role (2026-09-16)
- Director (`p-director`) is now **monitor-only**: views everything and still approves/rejects as final authority, but **cannot** create records, reassign/assign records, or manage committees. Keeps system admin (team page: add user, role/reportsTo edits, reassign records visible to deputies-not-director, succession, test-email, grant committee permissions).
- New org layer: **Deputy Director** `p-deputy` (Marcus Webb, `marcus.webb@qms.local`, `Webb-sD6m!39`, `reportsTo: p-director`, `canManageCommittees: true`). Both leads (`p-lead-qa`, `p-lead-ops`) now report to the deputy; org chain is Director → Deputy → Leads → Owners → staff.
- Permissions (`src/lib/permissions.ts`): added `isMonitorOnly()` (= top authority, i.e. `reportsTo === null`); `canCreateRecords()` / `canAssignRecords()` return `!isMonitorOnly`; `canManageCommittees()` no longer auto-grants to the top authority (flag + monitor-only exclusion); `canAssignCommitteeTask()` returns false for monitor-only. `canApproveOrRevise()` unchanged (director still final authority) — approval chain Director → Deputy → Leads → Owners → staff.
- Enforcement points: `createModuleRecord` 403 "monitor-only role cannot create records", `POST /records/assign` 403 "monitor-only role cannot assign tasks", `/admin/team` reassign branch 403, "New record" button + `/[module]/new` server gate (`PermissionNotice`) hidden via `canCreateRecords`.
- Seed/data: `p-deputy` profile + password added; committee `c-qa` head moved to the deputy, director kept as member; committee seeded tasks/creators re-pointed to the deputy.
- Verified live against the running server: director create-document → 403, create-committee → 403, records/assign → 403, GET documents/committees → 200, `/documents/new` → permission notice, approve record → 200; deputy create-document → 201, create-committee → 201, records/assign → 200, approve → 200. Re-seeded clean afterwards (12 profiles); full re-verify: `npx tsc --noEmit` 0 errors, `npx eslint .` 0 problems, `npm run build` green.

---

## 2. What was WRONG and was FIXED

### 2.1 Type errors → 0
- `prismaForModule` in `src/lib/qms-record-api.ts` was typed loosely; annotated as `Prisma.DocumentDelegate` (with explicit casts) — fixed all "union not callable" TS2349 errors.
- `app/module-routes.tsx` carried a stale local `prismaModelByModule` mapping; now uses `prismaForModule`.
- `lib/qms-data.ts` was missing helpers used by pages — added `getProfileById`/`getCommitteeById`/`getMembershipsForCommittee`/`getTasksForCommittee`.
- `app/page.tsx` called `getProfileById(id, profiles)` against a 1-arg helper — now imports the 2-arg version from `@/lib/permissions`.
- `app/committees/page.tsx` (list) and `app/committees/[id]/page.tsx` (detail) referenced removed fields (`joinedAt`) and wrong signatures — rebuilt (see 2.3).
- `app/admin/team/page.tsx` had `useState<any>(null)` → `useState<SuccessionSummary | null>`.
- `app/settings/page.tsx` only resolved `p-*` mock IDs — now resolves the real logged-in user via `/api/profiles`.
- `tsconfig` was green only after regenerating the Prisma client (stale `.prisma/client` lacked `passwordHash`).

### 2.2 Runtime CRASH class fixes (server code pulled into browser bundle)
- `app/admin/team/page.tsx` (client) imported `generateSuccessionSummary` from `src/lib/succession.ts`, which imports Prisma — instantiating a Prisma client in the browser throws (no `DATABASE_URL`). ALSO its use was async-without-await (`setSuccessionSummary(summary)` received a `Promise`).
  - Fixed: succession preview now calls `GET /api/admin/succession?departingUserId=&replacementUserId=`, execution calls `POST /api/admin/succession` with `{ confirmed: true }`; a separate "Execute Replacement" button appears after preview; `SuccessionForm` gained an `onExecute` prop.
- `src/lib/permissions.ts` imported Prisma for `loadProfiles`, but its pure helpers (`canManageCommittees`, `getDashboardRole`, `getProfileById`, …) are imported by every client page — this pulled `pg` + Prisma into the browser bundle and broke `next build`.
  - Fixed: `loadProfiles` moved to new server-only `src/lib/load-profiles.ts`; `permissions.ts` is now pure (client-safe). Updated `src/lib/api-auth.ts` and `app/module-routes.tsx`.
- `app/admin/team/page.tsx` permission submit was a stub (`console.log`) — now `POST /api/admin/permissions` and local state update.
- `app/admin/team/page.tsx` add-user/reassign/role/reportsTo already called `/api/admin/team` correctly (left as-is).

### 2.3 Committees made real (was mock-data + stub handlers)
- List page (`app/committees/page.tsx`): reads `/api/committees` + `/api/profiles`; "+ New Committee" does `POST /api/committees`; permission gated by `canManageCommittees(viewerId, profiles)`.
- Detail page (`app/committees/[id]/page.tsx`): reads `/api/committees/[id]` + `/api/profiles`; "+ Add Member" → `POST /api/committees/[id]/members`; "+ Assign Task" → `POST /api/committees/[id]/tasks` (server sends email + in-app `task_assigned` notification). Members from `memberships.profile`, creator name from `createdByProfile`. Loading / not-found states added.
- `components/committee-forms.tsx`: removed unused `StatusBadge` import and dead `committeeId` props from `AddMemberForm`/`AssignTaskForm`; button label "Proceed with Replacement" → "Preview Replacement" + added "Execute Replacement" when summary exists.

### 2.4 Database (live Neon, schema was stale)
- `prisma migrate status` showed 3 migrations NOT applied: `20260904_add_deleted_at_to_document`, `20260908_add_soft_delete_and_capa_created_at`, `20260909_passwords_and_reset_tokens`. The live DB had NO `passwordHash`, `Committee*`, `Notification`, `PasswordResetToken` tables/columns → register/login/committees/notifications would 500 at runtime.
- Migration `20260904` was BROKEN: generated `ALTER TABLE ... ADD INDEX "Document_deletedAt_idx"("deletedAt");` — invalid PostgreSQL (error P3018, type `Document_deletedAt_idx` does not exist). Rewrote it as `ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` (the `20260909` migration already creates the same index idempotently).
- `prisma migrate resolve --rolled-back` cleared the failed record, then `prisma migrate deploy` applied all remaining migrations successfully.

---

## 3. What was REMOVED (dead code, Phase 1)

- `app/page.tsx`: 4 shadowed duplicate handlers (~112 lines), dead `{false && …}` JSX (~126 lines), unused constants/state (`initialHistory`, `initialComments`, `initialNotifications`, `statsMode`, `cardSummary`, `activityFeed`), `let method` → `const method`.
- `src/lib/permissions.ts`: unused exports `PermissionProfile`, `canViewUserProfile`, `canEditUserProfile`, `PermissionError`.
- `src/lib/passwords.ts`: unused `DEFAULT_PASSWORD`.
- `src/lib/succession.ts`: unused `formatSuccessionSummary`.
- Deleted files: `src/lib/hierarchy.ts` (never imported), empty `CLAUDE.md`, `prisma/seed.js` (duplicate of `seed.ts`), `proxy.ts` (non-functional; not a valid Next 16 middleware name — **no auth middleware exists**), empty `src/app/` tree.
- Unused imports in `app/api/records/approve/route.ts`, `app/api/admin/succession/route.ts`, `app/committees/page.tsx` (+ unused `userCanManage` state).
- Removed unused dependency `@auth/prisma-adapter` (+ `npm install`).
- Deleted all 7 debug DB scripts (user-approved): `check-db.js`, `verify-seeding.js`, `scripts/check-db-state.js`, `scripts/count-live.js`, `scripts/live-counts.js`, `scripts/manual-permissions.ts`, `scripts/report-db-counts.js`, then empty `scripts/` dir.

---

## 4. What WORKS now

- Login/register/reset-password: DB now has `passwordHash` + `PasswordResetToken`; next-auth Credentials sign-in **tested live** (director + staff logins, 302 → session cookie).
- Dashboard, module list/detail/edit (`/[module]`, `/[module]/[id]`), approve/revise/assign APIs (guarded by `requireSessionUser`).
- Committees: list, create, detail, add member, assign task (with permission checks + notification email).
- Admin: team structure edits, add user, reassign records, succession (preview + execute), committee permission grant/revoke — all against real APIs.
- Settings: real profile lookup + password change (`/api/account/password`).
- Profiles: public profile pages with live org data (`/profiles/[id]`).
- Notifications: real list + mark-read.
- Email: enabled with a real Resend API key and `onboarding@resend.dev` sender; **verified live** — a `task_assigned` email was delivered to the account owner's inbox (Resend API reports `delivered`). `POST /api/admin/test-email` confirms configuration.
- Team admin now supports editing a user's email (`PATCH /api/admin/team` + Email field on each profile card and on Add user) so profiles can carry real inboxes for email delivery (2026-09-16).

### 4.1 Demo login (after seed)

Each seeded profile has its **own distinct password** (see table below; the old shared `DemoPass123!` no longer works).

```text
Name                  Email                         Role                     Password
Alicia Reed           alicia.reed@qms.local         Director                 Qms-Director-2026!
Marcus Webb           marcus.webb@qms.local         Deputy Director          Webb-sD6m!39
Mason Lee             mason.lee@qms.local           Quality Lead             Qms-Quality-K5t9!
Priya Shah            priya.shah@qms.local          Operations Lead          QmsOps-R2z7#2026
Noah Foster           noah.foster@qms.local         Process Owner            Foster-x9vE!44
Elena Torres          elena.torres@qms.local        Process Owner            Torres-pK2m@77
Daniel Kim            daniel.kim@qms.local          Process Owner            Kim-Dn8w!31
Sara Khan             sara.khan@qms.local           Process Owner            Khan-sQ6r@58
Chris Allen           chris.allen@qms.local         Quality Analyst          Allen-cL4p!12
Nia Patel             nia.patel@qms.local           QA Technician            Patel-wM2n@90
Tom Brooks            tom.brooks@qms.local          Operations Specialist    Brooks-jR7h!65
Mila Gomez            mila.gomez@qms.local          Document Controller      Gomez-vT6x@23
```

Set a different default per env with `SEED_PASSWORD=... npm run prisma:seed` (seed wipes all data; `SEED_PASSWORD` only applies to profiles without a dedicated entry in `prisma/seed.ts` `profilePasswords`).

---

## 5. Known remaining issues / gaps (NOT fixed)

Resolved in this pass (2026-09-10): #2 metadata, #3 statusStyles dup, #4 `toModuleKey` dedup, #5 committee Edit/Delete, #6 add-user login, #8 `NEXTAUTH_SECRET`.

Resolved in this pass (2026-09-15): #1 next.js RCE vulnerabilities (upgraded to 16.3.5), #2 no auth middleware (replaced with `proxy.ts`).

1. **Email is partially enabled** — `RESEND_API_KEY` is now set (valid, live-verified) with sender `Onboarding <onboarding@resend.dev>` (verified: `task_assigned` email delivered to the account owner's inbox). Restriction: `onboarding@resend.dev` delivers **only to the Resend account owner's email**; to email every user, verify a domain at `resend.com/domains`, set `RESEND_FROM_EMAIL="QMS Notifications <no-reply@yourdomain.com>"` in `.env.local`, restart, and ensure profiles use real addresses (Team admin page now has an Email field per profile + on Add user). Seeded accounts use fake `@qms.local` addresses — set real ones before relying on email.
2. ~~No auth middleware~~ — DONE: `proxy.ts` redirects unauthenticated users to `/login`; public paths and API routes pass through.
3. **`npm audit`**: 5 remaining highs are all `mysql2` (transitive Prisma dep, unused by PostgreSQL). Fix requires downgrading Prisma to 6.x (breaking) — acceptable as-is.
4. **`tsconfig.tsbuildinfo`** build cache committed on disk — fine to leave or gitignore.
5. `.env.local.example` corrected (has `#` typo fix + email/auth guidance).
6. **`NEXTAUTH_URL`** must be set to the production domain in the hosting environment before deployment.

---

## 6. Commands reference

```bash
npm run dev                 # dev server
npm run build               # production build
npm run lint                # eslint .
npx tsc --noEmit            # typecheck
npm run prisma:generate     # prisma generate --config prisma.config.ts
npm run prisma:validate     # prisma validate --config prisma.config.ts
npm run prisma:seed         # prisma db seed --config prisma.config.ts  (DESTRUCTIVE)
npx prisma migrate deploy --config prisma.config.ts
npx prisma migrate status --config prisma.config.ts
```

---

## 7. Migration note (important)

`prisma/migrations/20260904_add_deleted_at_to_document/migration.sql` was rewritten by hand from

```sql
ALTER TABLE "Document" ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD INDEX "Document_deletedAt_idx"("deletedAt");
```
to valid PostgreSQL
```sql
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Document_deletedAt_idx" ON "Document"("deletedAt");
```
because the generated inline `ADD INDEX` syntax is rejected by the real Postgres server (P3018). If this repo's migrations are ever re-created with `prisma migrate dev`, re-verify that generated SQL parses on the target DB. This only affected the local/dev pipeline; the live DB is now fully migrated.

---

## 8. Runtime test results (2026-09-09, live `next start` on localhost:3000)

| Test | Result |
|---|---|
| `POST /api/auth/callback/credentials` (director, seeded email + `DemoPass123!`) | 302 + `next-auth.session-token` issued |
| Same for a staff user (`chris.allen@qms.local`) | 302 (login works per role) |
| Anonymous `GET /api/committees` (no cookie) | 401 (guarded) |
| `GET /api/committees` (authed) | 200 — real DB committees |
| `GET /api/profiles` (authed) | 200 — 11 profiles, **no `passwordHash`** |
| `GET /api/profiles/p-director` (authed) | 200 — profile + memberships, **no `passwordHash`** |
| `GET /api/admin/team` (authed) | 200 — **no `passwordHash`** |
| `GET /api/admin/succession?departingUserId=p-staff-1&replacementUserId=p-staff-4` | 200 — summary shows Chris Allen → Mila Gomez, 1 committee membership |
| `PATCH /api/notifications {id:notif-3}` | 200 — read flag flips to `true` |
| `POST /api/admin/test-email` | 400 — "Email is disabled…" (expected until `RESEND_API_KEY` set) |
| Pages `/`, `/committees`, `/committees/c-qa`, `/profiles/p-director`, `/notifications`, `/settings`, `/login` | 200 each (authed where required) |
| `npm run build` | Compiled successfully, TypeScript passed |
| `npx tsc --noEmit` / `npx eslint .` | 0 errors / 0 problems |

Notes:
- The one 500 seen during testing was a PowerShell quoting artifact on the curl body (unquoted JSON), not an app bug; retested with `--data-binary "@file"` → 200.
- Seed's `passwordHash` rows are intentionally present in the DB; they are stripped from every API response (see §2.2).