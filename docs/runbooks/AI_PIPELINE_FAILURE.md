# Runbook: AI Pipeline Failure During a Live Test (TSP-147)

Covers Groq returning 429/5xx/529-style overload errors or timing out while a
student's post-test analysis job is in flight.

## What the user sees
Submit itself is synchronous and unaffected: score, accuracy, and per-question
review render immediately. The AI analysis panel stays in its pending state and
the improvement plan does not appear. Nothing in the UI blocks on the AI call —
the job runs in the background (`after()` + job queue).

## How the pipeline behaves
1. Submit enqueues `generate_analysis` (and later `generate_improvement_plan`)
   with an idempotency key per result.
2. The runner claims the job; the Groq call fails or times out; the job is
   marked `failed` with the error message, `attempts` incremented, and
   `next_run_at` pushed back (exponential backoff).
3. After `max_attempts` the job goes `dead` — it will NOT retry on its own.
4. Every attempt (including errors) writes an `llm_cost_ledger` row with
   `status = 'error'`, so cost and failure rate stay visible on /admin/ops.

## Support triage
1. Get the approximate submit time from the student.
2. /admin/jobs?status=failed (then ?status=dead) — match by created_at window;
   read `error_message`.
3. Cross-check /admin/ops: if jobs-failing lists `generate_analysis` broadly,
   it's systemic (provider/key), not this one student.
4. Ledger check:
   ```sql
   select status, count(*) from public.llm_cost_ledger
   where created_at > now() - interval '2 hours' group by status;
   ```

## Re-queueing stuck jobs
- **Preferred:** /admin/jobs → the failed/dead row → Retry (calls `retry_job`
  RPC: resets to pending, clears lock, schedules immediately).
- **Bulk (SQL, admin):**
  ```sql
  update public.jobs set status = 'pending', attempts = 0,
    next_run_at = now(), locked_at = null, locked_by = null
  where type = 'generate_analysis' and status = 'dead'
    and created_at > now() - interval '6 hours';
  ```
- Then kick the runner: `GET /api/jobs/run?limit=25` with the CRON_SECRET
  bearer, or wait for the next submit/cron kick.
- Idempotency keys make re-runs safe — a completed analysis will not duplicate.

## When to stop retrying
401/403 (key) → founder rotates GROQ_API_KEY first. Sustained provider outage →
flip `ai_analysis_enabled` flag off, retry the backlog after recovery.
