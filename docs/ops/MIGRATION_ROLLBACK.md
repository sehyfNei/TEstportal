# Migration Rollback Playbook (TSP-113)

**Owner:** Architect · **Created:** 2026-07-13 · **Status:** convention in force; staging rehearsal pending TSP-102

Full per-migration rollback scripts for all applied migrations are a separate row (TSP-141). This doc is the convention, the per-class recipes, and the rollback SQL for the most recent migrations.

---

## 1. Convention: expand → migrate → contract

Every schema change ships in up to three separately-deployable steps:

1. **Expand** — add the new table/column/RPC alongside the old shape. Old code keeps working. Always instantly rollback-able.
2. **Migrate** — backfill data / switch application code to the new shape (a normal app deploy, not a migration).
3. **Contract** — drop the old shape, **at least one session after** the expand proved itself in production.

We already follow this: e.g. `202607130001_rate_limit.sql` is a pure expand whose rollback is two `drop` statements.

## 2. Rules

- Every migration commit **states its rollback SQL in the commit body** (and in HANDOFF.md session notes).
- **Never edit a migration file after it has been applied** to any live database — write a new one.
- Destructive contracts (drop column/table with data) require a fresh backup confirmation first (see [BACKUP_RESTORE.md](BACKUP_RESTORE.md)).
- Migrations are applied via the Supabase SQL editor against live; the DB gate verifies effect (probe queries) before the row leaves Builder.
- Filenames: `YYYYMMDDNNNN_short_name.sql`, ordered, in `supabase/migrations/`.

## 3. Rollback recipes by class

| Change class | Rollback | Watch out for |
|---|---|---|
| add table | `drop table if exists public.<t>;` | dependent FKs, views, RLS policies drop with it |
| add column | `alter table public.<t> drop column if exists <c>;` | app code reading the column must deploy first |
| add index | `drop index if exists public.<idx>;` | none — safe anytime |
| add constraint | `alter table public.<t> drop constraint if exists <name>;` | upserts relying on `onConflict` will break |
| RPC (function) | `drop function if exists public.<fn>(<arg types>);` | re-grant/revoke state disappears with it; note grants in commit |
| RLS policy | `drop policy if exists <name> on public.<t>;` | if RLS stays enabled with zero policies, the table becomes inaccessible to clients — sometimes that IS the design (rate_limit_counters) |
| data backfill | inverse `update`, or restore from backup if not invertible | prefer writing the inverse into the same session's notes |

## 4. Staging rehearsal (founder-gated on TSP-102)

Once staging exists: apply latest migration → run its rollback → run the 4 gates against staging → re-apply. Record date + result here:

| Date | Migration rehearsed | Result |
|---|---|---|
| _pending_ | — | blocked on staging |

## 5. Rollback SQL — last 5 applied migrations

**`202607130001_rate_limit.sql`** (expand)
```sql
drop function if exists public.consume_rate_limit(text, int, int);
drop table if exists public.rate_limit_counters;
```

**`202607120001_scheduling.sql`** (expand)
```sql
drop table if exists public.scheduled_items; -- policy + index drop with it
```

**`202606180001_chat_schema.sql`** (expand)
```sql
drop table if exists public.chat_messages;
drop table if exists public.chat_sessions; -- messages first (FK), policies/indexes drop with tables
```

**`202606070001_mastery_records_unique_constraints.sql`** (contract of earlier partial indexes)
```sql
alter table public.mastery_records drop constraint if exists mastery_records_topic_unique;
alter table public.mastery_records drop constraint if exists mastery_records_concept_unique;
-- to fully revert, recreate the original partial unique indexes:
create unique index mastery_records_user_exam_topic_unique
  on public.mastery_records (user_id, exam_id, topic_id) where concept_id is null;
create unique index mastery_records_user_exam_concept_unique
  on public.mastery_records (user_id, exam_id, concept_id) where topic_id is null;
-- note: mastery upserts (onConflict) FAIL against partial indexes — that is why this migration exists.
```

**`202606050002_resolve_flags_for_question.sql`** (expand)
```sql
drop function if exists public.resolve_flags_for_question(uuid, text, text);
```
