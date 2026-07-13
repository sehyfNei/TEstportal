# Observability (TSP-108) & Alerts (TSP-109)

**Owner:** Architect · **Created:** 2026-07-13

In-app dashboards live at **`/admin/ops`** (admin-gated). No external vendor is wired yet — error-monitoring service selection is TSP-145; this doc maps what we watch today and where those signals move once staging/production (TSP-102) exists.

## Metrics on /admin/ops

| Metric | Source | Why it matters |
|---|---|---|
| Pending jobs + oldest age | `jobs` (status `pending`) | queue stall = analyses/mastery never arrive |
| Jobs failed (24h) | `jobs` (status `failed`/`dead`, `updated_at` window) | silent AI/mastery pipeline breakage |
| Jobs succeeded (24h) | `jobs` (status `completed`) | baseline throughput |
| AI spend + calls (24h) | `llm_cost_ledger` (`cost_usd`, `created_at` window) | cost runaway before the per-user cap exists (Standing Decision #4) |
| Submits observed (24h) | `jobs` where `type = update_mastery` | one enqueued per submit — submit canary |

**Deliberate exclusions:**
- `rate_limit_counters` is RLS-enabled with zero policies (RPC-only by design, TSP-104) — it is unreadable from any client and intentionally NOT surfaced here.
- `test_sessions` is owner-scoped RLS, so the admin client cannot count all submits directly; the `update_mastery` job count is the trustworthy proxy.

Loader: `src/lib/ops/metrics.ts`. Every query is individually fault-isolated — a missing table degrades one card to 0/null and lists a warning, never blanks the page.

## Alert thresholds

Single source of truth: `OPS_THRESHOLDS` in `src/lib/ops/alerts.ts` (pure evaluator, unit-tested in `src/tests/unit/ops-alerts.test.ts`). Rendered as a red/amber banner atop `/admin/ops`.

| Rule | Amber | Red |
|---|---|---|
| Oldest pending job age | — | > 15 min |
| Jobs failed in 24h | ≥ 1 | > 3 |
| AI spend in 24h | > $5 | > $15 |
| Submits observed in 24h | 0 (canary; expected pre-beta) | — |

Delivery beyond the dashboard (email/Slack paging) requires `RESEND_API_KEY` / TSP-145 and is out of scope here.

## Production homes for the same signals (after TSP-102)

| Signal | Production tool |
|---|---|
| API latency / route errors / function logs | Vercel → Observability (Logs, Analytics) |
| DB connections, slow queries, disk | Supabase → Reports → Database |
| Auth anomalies | Supabase → Reports → Auth |
| Uncaught exceptions with stack traces | error-monitoring vendor — **TSP-145** |
| Cron sweeper health (`vercel.json` daily job) | Vercel → Cron Jobs run history (needs `CRON_SECRET` set) |

When those land, `/admin/ops` remains the single pane for product-level signals (queue, spend, submits); infrastructure-level signals live in the vendor tools.
