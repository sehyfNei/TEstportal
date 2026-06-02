# Agent Workflow
## Shared Multi-Agent Build Process

**Purpose:** Keep multiple agents productive in the same workspace without overwriting work, losing context, or marking incomplete work as done.

This file applies to all builder and reviewer agents working on the Test Series Portal.

---

## 1. Source Of Truth

Use these files in this order. Paths are relative to the repository root:

1. `docs/final/FINAL_TRD.md` - implementation contract.
2. `docs/final/FINAL_PRD.md` - product behavior contract.
3. `docs/process/ROADMAP.md` - milestone plan and critical path. **The Architect must read this before planning any session** and name the milestone the session advances. The `Milestone` column in the tracker maps each row to a roadmap milestone.
4. `trackers/JIRA_TRACKER.csv` - task ownership, status, dependencies, milestone, and review comments.
5. Codebase files - current implementation reality.

Agent-specific brainstorm files are historical context only. Do not treat them as active requirements unless their contents were merged into final docs or tracker rows.

---

## 2. Sequential Agent Loop

Work should move through agents in this order for each meaningful implementation slice:

1. **Architect Agent** - reviews the final docs, tracker row, dependencies, and nearby code before implementation. Writes the approach, expected files, risks, verification gates, and open questions into `docs/process/HANDOFF.md`.
2. **Builder Agent** - implements the selected tracker row, updates code/docs/tracker, runs the relevant verification gates, and records a builder handoff in `docs/process/HANDOFF.md` with changed files, commands run, results, blockers, and recommended next step.
3. **Sanity Test Agent** - reviews the builder output, runs targeted sanity checks and any required browser/database smoke, records pass/fail findings in `docs/process/HANDOFF.md`, and adds tracker comments or follow-up rows for unresolved issues.

Each agent should read the latest handoff before starting and append a new dated entry before handing work to the next agent. Do not overwrite another agent's handoff entry except to fix a clear typo or broken path.

If the Builder needs to deviate from the Architect handoff, record the reason in `docs/process/HANDOFF.md` and in the relevant tracker remarks. If Sanity Test finds a blocker, the row must remain `In Progress`, `Review`, or `Blocked` until a later Builder pass resolves it and verification is rerun.

---

## 3. Task Selection Rules

Before starting work:

1. Open `trackers/JIRA_TRACKER.csv`.
2. Pick rows where dependencies are done or explicitly non-blocking.
3. Prefer the next row in the current implementation sequence from `docs/final/FINAL_TRD.md`.
4. If a required task is missing, add a new row before implementing it.
5. Set selected task rows to `In Progress`.
6. Set `Owner` and `Built By` to your agent name.

Do not start coding against an untracked task.

---

## 4. Ownership Rules

### Builder Agent

The builder agent owns implementation for selected tracker rows.

Builder responsibilities:

- Edit code and docs needed for the selected task.
- Avoid unrelated refactors.
- Preserve work from other agents.
- Update tracker status and builder remarks.
- Run verification before marking done.
- Record blockers clearly.
- Append a builder handoff to `docs/process/HANDOFF.md`.

### Architect Agent

The architect agent owns the implementation approach for selected tracker rows before code changes begin.

Architect responsibilities:

- Read `docs/process/ROADMAP.md` first; name the milestone the session advances and respect the critical-path ordering. Flag any requested work that conflicts with the roadmap before planning.
- Confirm the active tracker row, dependencies, and source-of-truth requirements.
- Review nearby code and existing patterns.
- Identify likely files, integration points, risks, and verification gates.
- Record the plan in `docs/process/HANDOFF.md`.
- Avoid marking implementation complete.

### Sanity Test Agent

The sanity test agent owns independent verification after builder work.

Sanity test responsibilities:

- Review the builder handoff, tracker remarks, and changed files.
- Run the most relevant local, browser, database, or smoke checks available.
- Record pass/fail evidence and exact blockers in `docs/process/HANDOFF.md`.
- Add tracker comments or follow-up rows for unresolved defects.
- Avoid broad rewrites unless explicitly assigned a fix task.

### Reviewer Agent

Reviewer agents should not rewrite builder code unless explicitly assigned a fix task.

Reviewer responsibilities:

- Add review findings to `Agent S Comments`, reviewer-specific columns, or a review markdown file if needed.
- Reference exact files and tracker keys.
- Mark concerns as blocker/non-blocker.
- Suggest follow-up tracker rows when needed.

### Orchestrator/User

The orchestrator resolves disagreements, priority changes, and final product decisions.

---

## 5. Tracker Status Rules

Allowed status values:

- `Backlog` - not started.
- `In Progress` - actively being worked.
- `Blocked` - cannot proceed without a decision, credential, dependency, or external service.
- `Review` - implemented and awaiting another agent/user review.
- `Done` - implemented, verified, and tracker remarks updated.

If a task is partially complete, do not mark it `Done`. Keep it `In Progress` or split the remaining work into a new tracker row.

---

## 6. Builder Remarks Rules

Every completed builder-owned row should include `Builder Remarks`.

Remarks should explain:

- What was built.
- Critical decisions made.
- Why a conservative or temporary approach was chosen.
- What remains intentionally out of scope.
- Any dependency on credentials, infrastructure, or future tasks.

Good example:

```text
Auth pages compile and work in no-config mode. Real signup/login awaits Supabase env values. Middleware skips enforcement when Supabase is not configured so local scaffold remains buildable.
```

Bad example:

```text
Done.
```

---

## 7. Commit Discipline

Use small commits tied to tracker rows.

Commit format:

```text
TSP-017 TSP-018: add exam manifest schema and migration
```

Commit body should include:

```text
- Added exam manifest Zod schema
- Added Supabase migration for exams/topics/concepts
- Added UPSC seed manifest
- Verification: typecheck, lint, test, build
```

Rules:

- One commit per logical task slice.
- Do not mix unrelated tracker rows.
- Do not commit generated caches, logs, `.env`, `.next`, `node_modules`, or local temp files.
- If a task cannot be verified, include the reason in the commit body and tracker remarks.
- If the user asks for no commits, do not commit; still follow this structure in the final summary.

Before committing:

1. Check `git status --short`.
2. Confirm all changed files belong to the task.
3. Run required verification.
4. Update `trackers/JIRA_TRACKER.csv`.
5. Commit only relevant files.

---

## 8. Review Gates

A builder can mark a task `Done` only when all relevant gates pass.

### Standard Gate

Required for most tasks:

- Code compiles.
- `corepack pnpm typecheck` passes.
- `corepack pnpm lint` passes.
- Relevant unit tests pass.
- Tracker row updated.
- Builder remarks added.

### App Build Gate

Required for UI, routing, config, and Next.js changes:

- Standard gate.
- `corepack pnpm build` passes.

### Database Gate

Required for schema/migration work:

- Standard gate.
- Migration file added under `supabase/migrations`.
- Drizzle schema updated when applicable.
- RLS/security behavior documented in builder remarks.
- Real DB application may remain blocked until Supabase credentials exist.

### Production Gate

Required for production infrastructure tasks:

- Standard gate.
- Rollback notes added.
- Monitoring/alert behavior documented.
- Any manual cloud step listed clearly.

### Blocker Gate

If verification cannot run:

- Do not mark `Done`.
- Mark `Blocked` or `Review`.
- Add exact command attempted.
- Add exact error or missing dependency.
- Add what is needed from the user/orchestrator.

---

## 9. Conflict And Drift Handling

If you see uncommitted changes you did not make:

1. Do not revert them.
2. Inspect whether they affect your task.
3. Work around unrelated changes.
4. If they conflict directly, stop and ask the orchestrator.

If `docs/final/FINAL_TRD.md` and tracker disagree:

- Follow tracker for task status.
- Follow `docs/final/FINAL_TRD.md` for technical design.
- Add a tracker comment if the mismatch affects implementation.

If implementation requires changing the final docs:

- Make a small doc update.
- Add or update tracker row.
- Explain the reason in builder remarks.

---

## 10. Verification Command Set

Default local verification:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Use build for UI/routing/config changes. Use targeted tests for narrow domain logic when available, but run full verification before marking major slices done.

Some commands may need elevated execution on this Windows workspace because Next, Vitest, or pnpm native dependencies spawn local workers.

---

## 11. Done Checklist

Before final response or handoff:

- Tracker rows have correct status.
- `Built By` is set.
- `Builder Remarks` are meaningful.
- `docs/process/HANDOFF.md` has the current agent handoff.
- Verification results are known.
- Dev server status is reported if started.
- Any blocked item is explicit.
- Next recommended task is clear.
