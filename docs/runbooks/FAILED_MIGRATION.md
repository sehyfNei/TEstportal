# Runbook: Failed Migration (TSP-110)

**Severity:** P1 if applied to production and partially executed.

## Symptoms
- SQL editor error mid-migration; app errors mentioning missing/renamed relations; typecheck fine but runtime RPC "function does not exist".

## Triage
1. Identify exactly which statements executed (SQL editor output). Our migrations are plain SQL run in one editor session — Postgres DDL is transactional per statement batch ONLY if wrapped; ours are not wrapped, so partial application is possible.
2. Probe current state:
   ```sql
   select to_regclass('public.<new_table>');
   select proname from pg_proc join pg_namespace n on n.oid = pronamespace
   where nspname='public' and proname like '<fn>%';
   ```

## Remediation
1. Run the matching `supabase/rollbacks/<migration>_down.sql` — all statements are `if exists`, safe against partial state.
2. If the migration replaced a function in place, re-apply the previous definition per the down script's header note.
3. Fix the migration file (new file, never edit the applied one — docs/ops/MIGRATION_ROLLBACK.md rule 2), re-apply, re-probe.
4. Update the app only after the DB gate passes.

## Prevention
Expand → migrate → contract; rehearse on staging once TSP-102 lands; every migration commit carries its rollback SQL.
