# Runbook: Reminder Failure (TSP-110)

**Status note:** reminder delivery (TSP-085, RESEND_API_KEY) is NOT built yet — this runbook is forward-written so it exists at launch, per acceptance.

## Symptoms (once live)
- Students report missing scheduled-test reminders; `send_reminders` jobs failed/dead on /admin/jobs; nightly-stale alert for `send_reminders` on /admin/ops (add it to NIGHTLY_JOB_TYPES when the handler lands).

## Triage
1. /admin/jobs?status=failed → error_message (Resend 401 = key; 429 = quota; timeouts = provider).
2. Resend dashboard → delivery logs (bounces vs never-sent).
3. Confirm scheduled_items rows actually match what users configured.

## Remediation
- Key/quota: founder rotates key / raises plan; Retry dead jobs.
- Provider outage: jobs retry automatically; verify next nightly run completes (ops alert clears).
- Wrong audience/duplicates: pause by flipping the future reminders feature flag off before debugging — double-sending erodes trust faster than silence.

## Escalation
Any incident that emailed the wrong users → founder immediately (comms + potential compliance).
