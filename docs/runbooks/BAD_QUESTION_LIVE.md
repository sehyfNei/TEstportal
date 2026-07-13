# Runbook: Bad Question Live (TSP-110)

**Severity:** P3 (single question) / P2 (systemic import defect).

## Symptoms
- Student flags a question (in-test Report control) or support hears "answer key is wrong".
- `/admin/questions/flags` shows open flags.

## Triage
1. `/admin/questions/flags` — read the flag reason and question.
2. Verify against the source (PYQ provenance / explanation).
3. Check blast radius:
   ```sql
   select count(*) from public.session_questions where question_id = '<id>';
   ```

## Remediation
- Wrong key / defective: quarantine via the flag resolution flow (resolve_flags_for_question with quarantine) or `set_question_status` → `quarantined`. Quarantined questions leave the selection pool immediately; already-delivered sessions keep their snapshot (by design — historical results stay reproducible).
- Fixable typo: admin edit (creates a new question_version), then resolve the flag.
- Systemic (bad import batch): quarantine the batch by `created_at` window; see docs/runbooks/IMPORT_FAILURE.md.

## Scoring correction policy
Pre-beta: do NOT retro-rescore submitted sessions; note the defect and move on. Post-beta this needs a founder decision (rescore vs void question) — flag it when it first happens for real.
