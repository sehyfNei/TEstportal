# Runbook: AI Outage (TSP-110)

**Severity:** P2 — tests, scoring, and mastery all keep working; only analysis/plan/chat degrade.

## Symptoms
- Post-test analysis panel stays "pending"; improvement plans don't generate; chat errors.
- `/admin/ops`: jobs-failing alert with `generate_analysis` / `generate_improvement_plan` in the type list; AI calls flatline.
- `llm_cost_ledger` rows with `status = 'error'`.

## Triage
1. Groq status page + try a manual call with the project key (any REST client).
2. `/admin/jobs?status=failed` — read `error_message` (401 = key rotated/expired; 429 = rate limit; 5xx = provider outage).
3. Confirm `GROQ_API_KEY` still present in Vercel env (founder).

## Remediation
- Provider outage: nothing to fix — jobs retry with backoff up to max_attempts; after recovery, Retry any `dead` jobs from /admin/jobs.
- Key invalid: founder rotates key in Vercel env and redeploys.
- Sustained outage during a beta window: flip the `ai_analysis_enabled` feature flag off (/admin/ops → Flags) so the UI stops promising analysis; flip back after recovery.

## What users see
Score and per-question review remain available immediately (synchronous). Analysis shows its pending/unavailable state — no user data is lost; jobs are queued, not dropped.

See also: docs/runbooks/AI_PIPELINE_FAILURE.md for the live-test-specific deep dive.
