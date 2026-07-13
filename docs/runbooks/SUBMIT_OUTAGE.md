# Runbook: Submit Outage (TSP-110)

**Severity when live:** P1 — students lose test results.

## Symptoms
- Students report "Submitting..." hanging or an error after pressing Submit test.
- `/admin/ops`: submits-observed goes to 0 while sessions are active; queue-stalled or jobs-failing alerts may fire.
- `scripts/post-deploy-smoke.mjs` may still pass (submit needs auth) — absence of a smoke failure proves nothing here.

## User impact
Answers are autosaved server-side per question; a failed submit does NOT lose answers. The session stays `in_progress` and can be re-submitted.

## Triage (in order)
1. `GET /api/health` — if `db:false`, this is a Supabase outage: check status.supabase.com, then Supabase dashboard → Reports → Database (connections maxed?).
2. Vercel → Logs, filter the submit server action — look for `submit_test_session` RPC errors.
3. SQL editor:
   ```sql
   select status, count(*) from public.test_sessions
   where updated_at > now() - interval '2 hours' group by status;
   select id, error_message from public.jobs
   where status in ('failed','dead') and updated_at > now() - interval '2 hours';
   ```
4. If sessions stick at `in_progress` with no RPC errors → suspect the app deploy: roll back to previous Vercel deployment (Deployments → previous → Promote).

## Remediation
- DB pool exhaustion: kill idle connections (Supabase dashboard), then fix the leak before scale-up.
- Bad deploy: Vercel instant rollback (docs/process/DEPLOYMENT.md §Rollback).
- RPC broken by migration: apply the matching `supabase/rollbacks/*_down.sql`, then re-apply the previous definition per its header note.
- Stuck sessions after fix: students press Submit again — `submit_test_session` is idempotent per session (already-scored sessions return the existing result).

## Escalation
Founder owns comms. If data loss is suspected, STOP and take a backup snapshot before further writes (docs/ops/BACKUP_RESTORE.md).
