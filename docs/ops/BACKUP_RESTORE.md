# Backup & Restore Policy (TSP-107)

**Owner:** Founder (execution) / Architect (policy) · **Created:** 2026-07-13 · **Status:** policy final, drill pending staging (TSP-102)

Deployment-time steps live in [DEPLOYMENT.md](../process/DEPLOYMENT.md). This doc is the standing policy and the drill procedure.

---

## 1. What Supabase provides

| Tier | Backups | Granularity |
|---|---|---|
| Free | none retained | — |
| Pro | daily automated backups, 7-day retention | restore to a daily snapshot |
| Pro + PITR add-on | WAL archiving | restore to any point in time (2-min granularity) |

**Founder action before launch:** confirm the production project is on **Pro**, and enable **PITR** (Dashboard → Settings → Database → Backups → Point in Time Recovery). Until PITR is on, our real RPO is "whenever the last nightly snapshot ran".

## 2. Targets

| Target | With PITR | Without PITR (Pro daily) |
|---|---|---|
| **RPO** (max acceptable data loss) | 1 hour | 24 hours |
| **RTO** (max acceptable downtime) | 4 hours | 4 hours |

Rationale: pre-beta the highest-value data is student answers/mastery history. Losing a day of it breaks trust with early users; losing an hour is survivable and communicable.

## 3. What DB backups do NOT cover

| Asset | Backup method | Owner |
|---|---|---|
| Supabase **auth users** | included in DB backups (auth schema), but export a CSV of users monthly as belt-and-braces (Dashboard → Authentication → Users → export) | Founder |
| **Storage buckets** | none used yet (no file uploads in Phase 1) — revisit when vision PDF ingestion (TSP-125) lands | — |
| **Vercel env vars** | keep the canonical copy in the founder's password manager; DEPLOYMENT.md lists the required keys | Founder |
| **Git repo** | OneDrive working copy + GitHub mirror (`sehyfNei/TEstportal`) — mirror requires a valid PAT | Founder |
| **Supabase project config** (RLS, RPC grants) | fully reproducible from `supabase/migrations/*` — this is why migrations are never edited after apply (see [MIGRATION_ROLLBACK.md](MIGRATION_ROLLBACK.md)) | Agents |

## 4. Restore drill procedure

Run against a **scratch Supabase project**, never production. Founder-gated on staging existing (TSP-102).

1. Create a scratch Supabase project (or reuse staging out of hours).
2. Restore: Dashboard → Backups → pick latest snapshot (or PITR timestamp) → restore into the scratch project.
3. **Gate queries** (SQL editor) — record the numbers:
   ```sql
   select count(*) from public.questions;
   select count(*) from public.test_sessions;
   select count(*) from public.mastery_records;
   select count(*) from public.jobs;
   select max(created_at) from public.test_sessions; -- confirms recency vs RPO
   ```
4. Point a local checkout at the scratch project (`.env.local` → scratch URL + anon key).
5. Smoke: log in as the test student → `/tests` → start any session → answer one question → save. If that works, the auth schema, RLS, and RPCs all survived the restore.
6. Fill in the drill log below. Tear down the scratch project.

**Abort criteria:** any gate query erroring (missing table = incomplete restore), login failing (auth schema loss), or start-session RPC missing (functions not restored).

## 5. Drill log

| Date | Operator | Backup type | Result | Notes |
|---|---|---|---|---|
| _pending_ | Founder | — | — | first drill blocked on TSP-102 staging |
