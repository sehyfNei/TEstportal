# Worker Escalation Plan (TSP-119)

How we decide when to move background work off the current in-Postgres job
system and onto a managed queue or a dedicated worker process. Keep this next
to [OBSERVABILITY.md](./OBSERVABILITY.md) — the same metrics drive both.

## Current architecture (the baseline we are escalating *from*)

- **Queue**: a `jobs` table in Postgres. Handlers are registered in the runner
  `HANDLERS` map (`src/lib/ai/jobs/*`); only `generate_analysis` and
  `generate_improvement_plan` run today.
- **Execution triggers**:
  1. **Post-submit kick** (`kickJobRunnerNonFatal`) — runs pending jobs
     in-process right after a test submit via Next `after()`. Needs
     `SUPABASE_SERVICE_ROLE_KEY`. This is the primary path.
  2. **Daily cron sweeper** — `vercel.json` cron hits `/api/jobs/run`. Needs
     `CRON_SECRET`. This is the backstop for jobs the kick missed.
- **Concurrency**: effectively one worker (the serverless invocation). No
  parallel consumers, no priority lanes.
- **Retries**: attempt counter on the row; dead-letter after max attempts.

This is correct and cheap for the current load (single-digit jobs per submit,
mostly one LLM call each). Do not escalate on vibes — escalate on the signals
below.

## Escalate when ANY of these is sustained (not a one-off spike)

Read these against `OpsMetrics` / `OPS_THRESHOLDS` (`src/lib/ops/`).

| Signal | Threshold to act | Why it means the current system is the bottleneck |
|---|---|---|
| Oldest pending job age | > 15 min (`queueAgeRedMin`) for 3+ consecutive days despite a healthy sweeper | The kick + daily sweep cannot keep the queue drained; you need a continuous consumer. |
| Queue depth at sweep time | > ~200 pending routinely | A single serverless sweep can't clear the batch within its time limit. |
| Job runtime vs. platform limit | p95 handler time > ~50% of the serverless max duration | You are one slow LLM call away from timeouts killing jobs mid-flight. |
| New job types needing schedules | Any recurring/nightly handler (e.g. `decay_mastery`, reminders) that must run on a cadence independent of user submits | Cron-per-type in `vercel.json` does not scale past a couple of jobs; you want a scheduler. |
| Failure rate | `jobsFailed24h` red (>3) driven by timeouts/OOM, not bad data | Infra limits, not logic — a dedicated worker with more headroom fixes it. |
| Fan-out work | Bulk AI generation / backfill (TSP-187/188) running hundreds of calls | Needs rate-limited parallelism the in-process kick cannot provide safely. |

## Escalation options, cheapest first

1. **Stay, but add a scheduled sweeper cadence** (minutes, not daily) + raise the
   kick batch size. Buys headroom for queue-age pressure without new infra.
   Reach for this first.
2. **Dedicated long-running worker** (Railway / Fly / a small VM) polling the
   same `jobs` table in a loop, with real concurrency and per-type rate limits.
   No schema change — it is another consumer of the existing table. This is the
   likely first real move; it directly fixes runtime-limit and queue-depth
   signals while keeping Postgres as the source of truth.
3. **Managed queue** (e.g. QStash / SQS / a hosted queue) in front of the
   worker when you need priority lanes, delayed delivery, or delivery guarantees
   the table polling can't give. Adopt only when option 2's single worker is
   itself the bottleneck or you need multi-region.

## Guardrails when we move

- Keep Postgres as the **system of record** for job state through option 2 so a
  rollback is "turn the worker off, the kick + cron still drain the table."
- Any managed queue must respect the existing **AI cost caps**
  (`OPS_THRESHOLDS.aiSpend*`) — a faster consumer must not outrun the budget.
- Register new recurring handlers in one place and document their cadence here;
  `decay_mastery` is defined but unregistered today and is the first candidate
  when a scheduler exists.

## Review cadence

Re-check these signals whenever the ops dashboard shows queue-age or failure
alerts amber+ for a week, or before launching any bulk AI generation feature.
