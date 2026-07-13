# Runbook: Question / Manifest Import Failure (TSP-148)

Covers non-Zod failures: DB constraint violations, partial inserts, and network
timeouts. (Zod/validation failures are handled in the UI with per-row errors —
no ops action needed.)

## Two import paths, two failure modes

| Path | Mechanism | Partial state possible? |
|---|---|---|
| Exam manifest (`/admin/manifests`) | single `import_exam_manifest(jsonb, jsonb)` RPC — one plpgsql function = **one transaction** | **No** — any raised error rolls the whole import back |
| Bulk questions (`/admin/questions/import`) | app loops `create_admin_question` **per row** | **Yes** — rows before the failing one are committed |

## What the admin sees
- Manifest path: the action surfaces the raised SQL error message; nothing was
  written (atomic).
- Bulk path: error names the failing row index (loop position); rows above it
  are already live in `questions` + `question_versions`.
- Network timeout mid-batch: the browser shows a failed action but the server
  may have kept inserting — ALWAYS inspect before retrying.

## Inspecting partial state (bulk path)
```sql
-- what landed in the window around the import attempt
select id, stem_hash, status, created_at from public.questions
where created_at > now() - interval '30 minutes'
order by created_at;

select count(*) from public.question_versions
where created_at > now() - interval '30 minutes';
```
Compare the count against the batch size and the reported failing row index.

## Rolling back an incomplete bulk import
1. Quarantine first (reversible), delete only if certain:
   ```sql
   update public.questions set status = 'quarantined'
   where created_at > now() - interval '30 minutes'
     and created_by = '<admin user id>';
   ```
2. Hard delete (destructive — only when the window provably contains just this
   batch): delete `question_concepts`, `question_versions`, then `questions`
   for those ids, in that order (FKs).

## Retrying safely
- Manifest: fix the payload, re-run — atomicity makes retry safe.
- Bulk: re-run ONLY the rows from the failing index onward (the wizard preview
  shows row numbers), or quarantine-then-full-retry. Duplicate stems in the
  same topic will otherwise create near-duplicate live questions (semantic
  dedup is TSP-032, not built).
- Constraint violations (bad topic/concept id): re-export the manifest first —
  the reference data is stale, not the questions.

## Acceptance note
"Tested on staging with a deliberately broken manifest" is founder-gated on
TSP-102 staging; record the drill result here when run.
