# Handoff

Read this file first when resuming in a new session.

---

## Startup Checklist

1. Read `docs/process/AGENT_WORKFLOW.md`.
2. **Read `docs/process/ROADMAP.md`** — the milestone plan and critical path. Any session must advance a milestone and respect its ordering.
3. Read `docs/process/SESSION_STATE.md`.
4. Open `trackers/JIRA_TRACKER.csv` and inspect rows with `In Progress`, `Blocked`, or `Review`. The `Milestone` column maps every row to a roadmap milestone.
5. Run:

```powershell
git status --short
```

6. Continue the next unblocked tracker task, picking from the current roadmap milestone.

---

## Source-Of-Truth Order

1. `docs/final/FINAL_TRD.md`
2. `docs/final/FINAL_PRD.md`
3. `trackers/JIRA_TRACKER.csv`
4. Current codebase
5. Agent-specific brainstorm files

---

## Sequential Agent Protocol

Use this order for each meaningful implementation slice:

1. **Architect** — **first reads `docs/process/ROADMAP.md`** and names the milestone the session advances — then writes the approach, risk notes, expected files, and verification gates here before code changes.
2. **Builder** implements the selected tracker row, updates tracker/docs, runs verification, and appends a builder handoff here.
3. **Sanity Test** reviews the diff and builder notes, runs independent checks, and appends pass/fail findings here.

Every handoff entry should include:

- Agent role and name.
- Tracker row or scope.
- Files changed or reviewed.
- Verification commands and results.
- Blockers, risks, and next recommended step.

Do not overwrite earlier entries from other agents. Append a new dated entry so the next agent can review and improve the previous pass.

---

## Latest Agent Handoffs

### 2026-05-29 - Builder Orientation - Codex

Scope:

- Read `docs/process/AGENT_WORKFLOW.md`, `SESSION_STATE.md`, `HANDOFF.md`, `DECISIONS.md`, `BLOCKERS.md`, and `CHANGELOG.md`.
- Checked `README.md`, final PRD/TRD headings, current tracker rows around `TSP-019`, `TSP-024`, and `TSP-025`, and `git status --short`.
- Updated process docs to explicitly capture the founder's sequential Architect -> Builder -> Sanity Test handoff loop.

Current understanding:

- Project is a Next.js, TypeScript, Tailwind, Supabase-backed test series and self-study portal.
- Active product/code work is still centered on the exam manifest/admin question bank track.
- `TSP-019` and `TSP-024` are in `Review` pending browser/server-action smoke with a real admin user session.
- `TSP-025` is `In Progress`; implementation exists, but verification is blocked by the broken pnpm install and browser persistence smoke still needs admin auth.

Verification:

- No application verification was run for this orientation/process-doc update.
- Local state already reports pnpm dependency repair as the next required unblocker.

Next recommended step:

- Architect should review dependency repair plus `TSP-025` verification scope, then hand a precise plan to Builder before any code or install repair work.

---

### 2026-05-29 - Session 1 Plan - Architect (Claude Sonnet 4.6)

Scope reviewed:

- Read full tracker (all 158 rows), `AGENT_WORKFLOW.md`, `SESSION_STATE.md`, `HANDOFF.md`, `BLOCKERS.md`, `DECISIONS.md`.
- Read all five admin action files, `middleware.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/env.ts`, `src/lib/utils.ts`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, all migration SQL files.
- Identified 11 tasks buildable now despite active blockers (no admin user, broken pnpm, no AI keys).

Session 1 scope selected:

- **TSP-149** — `.env.example` audit (15 min, zero risk)
- **TSP-090** — Admin role guard (security boundary, foundational for all subsequent admin work)
- **TSP-091** — Admin nav + Phase 1 section overview (depends on TSP-090)

Key design decisions made:

1. `requireAdmin()` for layouts/pages uses `redirect()`. `requireAdminForAction()` for server actions returns a typed result. Two separate exports avoid the "redirect inside catch" problem in action result flows.
2. No-config guard (`hasSupabaseConfig()`) preserved in both — admin shell must remain navigable in local scaffold mode without Supabase credentials.
3. Role check mirrors DB `public.is_admin()` exactly: `app_metadata.user_role` first, `user_metadata.user_role` fallback.
4. `AdminNav` is a Client Component (needs `usePathname`). Layout remains a Server Component — only the nav island is client-rendered.
5. `/admin/questions/import` link added to nav — it was built in TSP-025 but never surfaced in navigation.
6. Admin overview page extended to show all 8 Phase 1/1.5 sections with status badges (Live / Phase 1 / Phase 1.5) so any developer or admin landing on `/admin` has full orientation.

Files the Builder will create or modify:

| Action | Path |
|---|---|
| Create | `src/lib/auth/require-admin.ts` |
| Create | `src/components/admin/admin-nav.tsx` |
| Edit | `src/app/admin/layout.tsx` |
| Edit | `src/app/admin/page.tsx` |
| Edit | `src/app/admin/questions/actions.ts` |
| Edit | `src/app/admin/manifests/actions.ts` |
| Edit | `src/app/admin/questions/import/actions.ts` |
| Edit | `.env.example` |

Risks flagged for Sanity agent to check:

- TSP-090: Confirm the no-config bypass in `requireAdmin()` is intentional and commented — it must never be removed without understanding its purpose.
- TSP-090: Confirm `requireAdminForAction()` is used in ALL three action files — missing one leaves an unguarded write path.
- TSP-091: Confirm `/admin/questions/import` nav order does not break active-link matching for `/admin/questions`.
- TSP-090/091: Confirm `corepack pnpm build` passes — layout is now `async` which affects static analysis.

Verification gate for this session:

- Standard gate: `corepack pnpm typecheck` + `corepack pnpm lint`
- App build gate (required — layout and Client Component changes): `corepack pnpm build`
- If pnpm is still broken: mark rows `Review`, document exact error in BLOCKERS.md, do not mark `Done`.

Next after Session 1:

- Sanity agent reviews TSP-090 (security boundary) and TSP-091.
- Session 2 proceeds to TSP-026 (question review/approval), TSP-027 (lifecycle statuses), TSP-035 (test session schema).

---

### 2026-05-29 - Session 1 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-149`, `TSP-090`, and `TSP-091` from the Architect Session 1 plan.
- Left all three rows in `Review` for Sanity Test instead of `Done`.

Files changed:

- `.env.example`
- `src/lib/auth/require-admin.ts`
- `src/components/admin/admin-nav.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/questions/actions.ts`
- `src/app/admin/manifests/actions.ts`
- `src/app/admin/questions/import/actions.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/BLOCKERS.md`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `DATABASE_URL` and source/purpose comments for all Phase 1 secrets in `.env.example`.
- Added `requireAdmin()` for Server Component layout/page redirects and `requireAdminForAction()` for typed server action authorization errors.
- Admin role detection checks `app_metadata.user_role`, the top-level JWT `user_role` claim, and `user_metadata.user_role` as a compatibility fallback.
- Preserved the no-config bypass for admin layouts so the local scaffold remains navigable without Supabase keys.
- Replaced auth-only checks in all three admin write action files with `requireAdminForAction()`.
- Added a client `AdminNav` with active states and surfaced `/admin/questions/import`.
- Expanded `/admin` overview from two cards to 8 operational sections with Live, Phase 1, and Phase 1.5 badges.

Verification:

- `corepack pnpm install` failed after elevated rerun: `UNKNOWN: unknown error, read` while pnpm read its modules manifest.
- `corepack pnpm typecheck` passed after elevated rerun.
- `corepack pnpm lint` passed after elevated rerun.
- `corepack pnpm test` passed after elevated rerun.
- `corepack pnpm build` passed after elevated rerun.
- Dev server was attempted on `http://127.0.0.1:3000`; the background process exited immediately, `curl.exe -I http://127.0.0.1:3000/admin` could not connect, and direct `node_modules\.bin\next.CMD --version` failed with `The cloud file provider exited unexpectedly`.

Sanity review focus:

- Confirm non-admin users are blocked by `requireAdmin()` on `/admin/*` when Supabase is configured.
- Confirm no-config mode still renders the admin shell.
- Confirm all admin write actions call `requireAdminForAction()`.
- Confirm `/admin/questions/import` active state does not make `/admin/questions` active.
- Confirm `/admin` shows 8 sections: 3 Live, 4 Phase 1, 1 Phase 1.5.

Next recommended step:

- Sanity Test agent should review `TSP-149`, `TSP-090`, and `TSP-091`, then either mark them `Done` with comments or hand back exact findings for a Builder fix pass.

---

### 2026-05-29 - Session 1 Sanity Review - Architect (Claude Sonnet 4.6)

Reviewed all eight changed files against the Session 1 spec and the existing DB security model (`public.is_admin()`, question-bank RLS).

**TSP-149 — PASS.** `.env.example` adds `DATABASE_URL` and source/purpose comments for every secret. Complete. Recommend → `Done`.

**TSP-091 — PASS.** `AdminNav` active-state logic is correct; `/admin/questions/import` (exact) does not falsely activate `/admin/questions` (exact). Overview shows 8 sections (3 Live, 4 Phase 1, 1 Phase 1.5). Recommend → `Done`.
- Minor UX nit (non-blocking, future polish): on the question detail route `/admin/questions/<id>`, no nav item highlights because `Questions` uses `exact: true`. Acceptable for now.

**TSP-090 — ONE BLOCKING FINDING before `Done`. Otherwise solid.**

- **FINDING S1-A (security, blocking for Done):** `getUserRole()` in `src/lib/auth/require-admin.ts` trusts `user_metadata.user_role` as its third fallback. **`user_metadata` is client-writable** via `supabase.auth.updateUser({ data: { user_role: "admin" } })`. Any authenticated user can self-promote and pass both `requireAdmin()` and `requireAdminForAction()`.
  - **Blast radius is limited** (not a data breach): the DB is the real boundary — `public.is_admin()` and the CRUD RPCs read only `app_metadata` / JWT claims, never `user_metadata`. RLS confines a self-promoted user's reads to `status='live'` rows, and every write RPC returns `admin role required`. But the TypeScript guard's whole job is to be the clean first gate; trusting `user_metadata` lets a self-promoted user into admin pages and lets actions begin executing before the DB rejects them.
  - **Root cause is the Architect's Session 1 spec** — I wrote "`user_metadata.user_role` as fallback." The Builder implemented it faithfully. My error, flagged for correction.
  - **Fix (one change, ~2 lines):** in `getUserRole()`, delete the `user.user_metadata?.user_role` branch. Trust only `app_metadata` (from `getUser()`) + the JWT-claim decode. This exactly mirrors `public.is_admin()`.

- **COMMEND:** The Builder added `getJwtUserRole()` (decodes the session access token to check `app_metadata.user_role` and the top-level `user_role` claim) — beyond the spec, and it achieves true parity with `is_admin()`'s top-level `user_role` branch, which my spec missed. Keep it. Token authenticity is established by the parallel `getUser()` call, so decoding the session token for claims is acceptable.

- **MINOR S1-B (non-blocking):** in `questions/import/actions.ts`, dry-run validation runs before the admin check. Harmless — dry-run touches no data and only parses the user's own pasted input, and the page sits behind the layout guard. Leave as-is or move the admin check earlier for consistency; reviewer's choice.

**Action items handed to Builder:**
1. Apply fix S1-A (remove `user_metadata` trust). Re-run `typecheck` + `lint` + `build`.
2. After S1-A, `TSP-149` and `TSP-091` can be marked `Done` now. `TSP-090` can be marked `Done` once S1-A lands — but live browser smoke (non-admin blocked, admin allowed) still requires the admin user and remains the only thing standing between `TSP-019`/`TSP-024`/`TSP-090` and full sign-off.

---

### 2026-05-29 - Session 2 Plan - Architect (Claude Sonnet 4.6)

Founder decisions locked during brainstorming: **(1) all three rows this session**, **(2) lifecycle allows fast-track forward skips.**

**Scope:** TSP-035 + TSP-027 + TSP-026 (+ new audit row TSP-159). Sequence below. One commit per row. This is a large session — strict per-row commits keep the Sanity diff reviewable.

**Gating:** Apply Session-1 fix S1-A first (it touches the same security surface 026 extends). **TSP-035 has zero dependency on Session 1** and can start immediately even if S1-A is still open.

---

#### Order 1 — TSP-035: Test session schema (reaches `Done`)

Pure migration + Drizzle schema from FINAL_TRD §6.4 (`test_templates`, `test_sessions`, `session_questions`, `session_answers`, `session_results`). No admin user needed → this row can reach `Done` (schema + migration applied to pooler + Drizzle-shape unit test).

**Architect decision (must implement) — answer-key isolation:**
- Add `prompt_snapshot jsonb` to `session_questions`: an **answer-stripped** copy of the question content, frozen at session-start.
- The correct answer / explanation is **NEVER** copied into any user-readable row. Scoring (TSP-041) reads the real key from the admin-only `question_versions` server-side at submit.
- Rationale: immune to mid-test edits/retirement, clean RLS (user reads only their own snapshot — no join to the admin-only versions table), single home for the answer key. This is the single most important security property of the test engine. **Add a DECISIONS.md entry** documenting it.

**RLS (owner-only) — required in this migration:**
- `test_templates`: admin all; authenticated read where `is_active`.
- `test_sessions`: owner-only (`user_id = auth.uid()`) select/insert/update; admin all.
- `session_questions`: select where parent session belongs to the user; inserts restricted to security-definer/admin (the session-start RPC lands in TSP-039).
- `session_answers`: owner-only.
- `session_results`: owner-only select; inserts restricted (scoring definer lands in TSP-041).
- Include the TRD §6.4 indexes (`test_sessions_user_status`, `test_sessions_exam_type`, `session_answers_session`, `session_results_user_exam`).

**Scope boundary:** schema ONLY. No start/save/submit APIs — those are TSP-039/040/041.
**Gate:** Standard + Database gate (migration file + RLS documented + Drizzle schema). Add unit test asserting schema shape (mirror the `question-schema.test.ts` pattern).
**Drizzle:** new `src/lib/db/schema/session.ts`; export it from `src/lib/db/schema/index.ts`.

---

#### Order 2 — TSP-027: Lifecycle transition enforcement (lands in `Review`)

The 7 statuses already exist on `questions.status`; **nothing enforces transitions** and `update_admin_question` writes any status blindly. This adds enforcement.

**Transition map (fast-track skips allowed)** — `src/lib/question-bank/question-lifecycle.ts`, pure + Vitest-tested:

```
draft     → validated, reviewed, approved, live, retired
validated → draft, reviewed, approved, live, retired
reviewed  → draft, validated, approved, live, retired
approved  → draft, validated, reviewed, live, retired
live      → draft, flagged, retired
flagged   → live, draft, retired
retired   → draft
```

- Forward skips allowed (`draft→live` one-shot for trusted PYQ seeding); every move audited.
- `flagged` only reachable from `live`. `retired` reachable from any active state; revivable to `draft`.

**Two-layer enforcement:**
1. TS map + `canTransition(from, to)` (unit-tested — matches the project's deterministic-logic-gets-tests convention).
2. New `set_question_status(p_question_id, p_to_status, p_note)` security-definer RPC that mirrors the map, checks `is_admin()`, locks the row, validates the transition, stamps `approved_by`/`approved_at` on any `→approved`, writes a `question_status_events` row (see TSP-159), then updates `status`. `revoke … from public; grant execute … to authenticated` (do NOT repeat the TSP-024 grant bug).

**Refactor:** **remove `status` mutation from `update_admin_question`** — content edits stop changing lifecycle state. Status changes go only through `set_question_status`. Update `questions/actions.ts` accordingly (a dedicated `setQuestionStatusAction`).
**Gate:** Standard + Database. Migration + RLS/grants documented. Vitest for the transition map.

---

#### Order 3 — TSP-026: Review & approval workflow (lands in `Review`)

- `/admin/questions/review` queue filtering `status in ('validated','reviewed','flagged')`, with approve / reject(→draft) / publish(→live) actions calling `setQuestionStatusAction`.
- Show per-question status history from `question_status_events`.
- Single `is_admin()` retained; true creator≠approver segregation deferred until the admin-role-model blocker is resolved (record `approved_by` now so the audit data exists when SoD lands).
- **Acceptance "only approved questions appear in tests"** is already enforced by existing RLS (`questions_read_live_metadata` exposes only `status='live'`). Approve = `→approved`; publish = `→live`. Two intentional steps.
- **Gate:** App build gate. Lands in `Review` (browser admin-session smoke pending admin user), same as TSP-024.

---

#### New row — TSP-159: `question_status_events` audit table

Add the tracker row (Question Bank epic). Folded into the TSP-026/027 migration. Columns: `id, question_id, from_status, to_status, actor uuid, note text, created_at`. RLS: admin read; inserts only via `set_question_status` (security-definer). Powers the review history view now and feeds the TSP-094 audit viewer later.

---

**Open question for founder (not blocking Session 2):** the admin-role model (single `is_admin()` vs reviewer/approver split) is still an open blocker. It gates true segregation of duties in the review workflow. Session 2 builds the audit trail so SoD can be added cleanly later without rework.

---

### 2026-05-30 - Session 2 Builder Handoff - Codex

Scope completed locally:

- Applied Session 1 Sanity finding **S1-A** for `TSP-090`.
- Implemented `TSP-035`, `TSP-027`, `TSP-026`, and `TSP-159`.
- Marked `TSP-149` and `TSP-091` `Done` after prior Sanity PASS.
- Left `TSP-090`, `TSP-035`, `TSP-027`, `TSP-026`, and `TSP-159` in `Review` because live DB/browser gates are not complete.

Files changed:

- `src/lib/auth/require-admin.ts`
- `src/lib/db/schema/index.ts`
- `src/lib/db/schema/question.ts`
- `src/lib/db/schema/session.ts`
- `src/lib/question-bank/question-lifecycle.ts`
- `src/app/admin/questions/actions.ts`
- `src/app/admin/questions/page.tsx`
- `src/app/admin/questions/review/page.tsx`
- `src/app/admin/page.tsx`
- `src/components/admin/admin-nav.tsx`
- `src/components/admin/question-editor.tsx`
- `src/components/admin/question-status-controls.tsx`
- `src/tests/unit/session-schema.test.ts`
- `src/tests/unit/question-lifecycle.test.ts`
- `supabase/migrations/202605300001_test_sessions.sql`
- `supabase/migrations/202605300002_question_lifecycle.sql`
- `scripts/check-rpc-grants.js`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/BLOCKERS.md`
- `docs/process/CHANGELOG.md`
- `docs/process/DECISIONS.md`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Removed the client-writable `user_metadata.user_role` fallback from the TypeScript admin guard; role checks now trust only `app_metadata` and JWT role claims.
- Added test session tables and Drizzle schema. `session_questions.prompt_snapshot` is intentionally answer-stripped and has a DB check against common answer/explanation keys.
- Added lifecycle transition enforcement in TypeScript and Postgres. Content edits no longer change `questions.status`; status changes go through `set_question_status`.
- Added `question_status_events` with admin-read RLS and lifecycle RPC writes.
- Added `/admin/questions/review` with approve, reject-to-draft, publish, restore-live, retire, edit link, and status history.
- Added the review route to admin navigation and admin overview.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/session-schema.test.ts src/tests/unit/question-lifecycle.test.ts src/tests/unit/question-schema.test.ts` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm typecheck` exited 0 after elevated rerun.
- `corepack pnpm lint` exited 0 after elevated rerun.
- `corepack pnpm test` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm build` exited 0 after elevated rerun.
- `corepack pnpm exec tsc --noEmit --pretty false` exited 0 after elevated rerun.
- `node --check scripts\check-rpc-grants.js` exited 0 after elevated rerun.
- Source checks: `rg -n "user_metadata" src` returned no matches; `rg -n "status = p_status" supabase\migrations\202605300002_question_lifecycle.sql src` returned no matches.

Blocked verification:

- `node run-migrations.js` failed before applying Session 2 migrations:

```text
PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found
```

Risks and Sanity focus:

- Review `202605300001_test_sessions.sql` RLS carefully; session-start and scoring security depends on owner-only user reads plus server-side answer isolation.
- Review `202605300002_question_lifecycle.sql` transition parity against `src/lib/question-bank/question-lifecycle.ts`.
- Confirm `update_admin_question` no longer mutates `status` and `retireQuestionAction` now calls `set_question_status`.
- Confirm `/admin/questions/review` behavior around `approved`: the page includes approved questions so they can be published as the second review step.

Next recommended step:

1. Fix the Supabase `DATABASE_URL` from Project Settings transaction pooler, then rerun `node run-migrations.js`.
2. Run `node scripts\check-rpc-grants.js` after migration so `set_question_status` execute grants are verified with the existing CRUD grants.
3. Create or provide an admin user with `app_metadata.user_role = "admin"` and run browser smoke for admin guard and the review queue.
4. Sanity Test agent should review the Session 2 diff and move rows only after DB/browser gates pass.

---

### 2026-05-30 - Session 2 Sanity Review - Architect (Claude Opus 4.8)

Reviewed the full Session 2 diff against the Session 2 plan and the project security model (`public.is_admin()`, question-bank RLS, answer-key isolation). Read both migrations, both schema files, the lifecycle module, `questions/actions.ts`, the review page, the question editor, both unit tests, the DECISIONS entry, and re-read `require-admin.ts`.

**Overall: PASS on code. No blocking findings.** Row statuses are correct. The only things between `Review` and `Done` are the two environmental blockers (DB migration + browser smoke), not code defects.

**S1-A — VERIFIED FIXED.** `require-admin.ts:getUserRole()` now trusts only `app_metadata` + the JWT-claim decode; the `user_metadata` fallback is gone. `rg user_metadata src` is clean. Matches the locked auth rule.

**TSP-035 — PASS.** All five tables match TRD §6.4. Owner-only RLS is correct: `test_sessions`/`session_answers` have owner select/insert/update; `session_questions` and `session_results` deliberately have **no** owner-insert policy, so inserts are restricted to the security-definer/admin path (TSP-039/041) as specced. All four required indexes present. Drizzle schema + index export complete. DECISIONS entry recorded. `session-schema.test.ts` present.
- COMMEND: `prompt_snapshot` has a DB CHECK rejecting top-level answer/explanation keys — stronger than my spec asked for.
- NON-BLOCKING N1: the CHECK only guards **top-level** keys. A nested key (e.g. `prompt_snapshot.content.correct_option`) would pass. The authoritative defense remains the TSP-039 snapshot builder; the CHECK is defense-in-depth. Flag for TSP-039 to strip recursively.
- NON-BLOCKING N2 (cosmetic): Drizzle `session_results_user_exam` index is asc on `created_at`; SQL is `desc`. Migrations are hand-written so this is harmless drift; align if convenient.

**TSP-027 — PASS.** SQL transition map is byte-for-byte identical to the TS map and to my plan. `set_question_status` checks `is_admin()`, validates the enum, takes `FOR UPDATE`, stamps `approved_by/approved_at` on `→approved`, writes the audit row, and is idempotent on same-status (`changed:false`). **Grant hygiene correct** — `revoke all … from public; grant execute … to authenticated` on all three functions; the TSP-024 grant bug is NOT repeated. `update_admin_question` no longer mutates `status`; the edit form makes status read-only (hidden field carrying the current value), so no misleading control. `retire_admin_question` delegates to `set_question_status` and every active state can reach `retired`, so retire never breaks. Unit test covers fast-track skips, flagged/retired restrictions, same-status, and full map coverage.
- NON-BLOCKING N3: `update_admin_question` still accepts a now-vestigial `p_status` param. Harmless (ignored). Drop on a future cleanup pass.

**TSP-159 — PASS.** `question_status_events` has the specced columns, admin-read RLS, no insert policy (definer-only writes), and two sensible indexes.

**TSP-026 — PASS.** Queue filters `validated/reviewed/approved/flagged`, shows per-question status history, and every command maps to a legal transition. The inclusion of `approved` in the queue is a **correct deviation** from my plan (`validated/reviewed/flagged`) — approved questions need a surface for the two-step Publish action; without it there'd be nowhere to publish. Acknowledged and endorsed.

**Action items handed back:**
1. No code fixes required to clear Sanity. (N1–N3 are non-blocking; N1 should be tracked against TSP-039.)
2. **Founder/orchestrator unblock:** replace `DATABASE_URL` with the exact Supabase transaction pooler string (the `tenant/user postgres.iwzerbplanzlzwtiiska not found` error is a connection-string/credential issue only you can resolve), then `node run-migrations.js` + `node scripts\check-rpc-grants.js`.
3. **Admin user** (`app_metadata.user_role = "admin"`) for browser smoke of `/admin`, `/admin/questions`, `/admin/questions/review`, and TSP-090's allow/deny paths.
4. Rows stay in `Review` until 2–3 land; then `TSP-035/027/026/159` → `Done` and `TSP-090` → `Done`.

---

### 2026-05-30 - Session 3 Plan - Architect (Claude Opus 4.8)

**Founder decisions locked:** (1) full take-a-test loop this session — **TSP-039 → TSP-040 → TSP-041**; (2) **minimal selection** (`status='live'` + exam/optional-topic filter); smart selection (036/037/038) deferred until TSP-029/030 land. One commit per row.

**Why this slice:** 039 only depends on the just-delivered TSP-035. It's where the answer-key isolation property is actually *enforced* (currently only the schema half exists). It delivers the first end-to-end product loop.

**Scope boundary — explicitly OUT:** test-taking UI/timer (TSP-043), smart selection (TSP-036/037/038), full marking-rules engine (TSP-051), client autosave recovery (TSP-048). Session 3 is server-side actions + RPCs + pure logic + unit tests only.

---

#### Architectural decisions (must implement)

**A. Snapshot construction is an ALLOWLIST, built server-side under definer privilege.**
- Answer keys live **nested inside `question_versions.content`**: `correct_options`, `correct_integer`, and (match type) the correct `pairs` mapping. The TSP-035 `prompt_snapshot` CHECK only guards *top-level* keys and does **not** list `pairs` — so a blacklist would leak match answers. **Build the snapshot by copying only known-safe fields per question type**, never by stripping known-bad ones.
- A normal user cannot read `question_versions.content` (admin-only). Therefore snapshot building **must** happen inside the security-definer start RPC, not in any client-reachable path.
- Per-type safe allowlist: `{ type, text/stem, options[], images[] }` for mcq/msq; `{ type, text, images }` for integer; for `match`, expose the two columns to be matched **without** the correct pairing; statement/assertion expose `statements[]`/`assertion`+`reason` text only. Anything not on the allowlist is excluded by default.
- Mirror the allowlist in a pure TS `buildPromptSnapshot(content, type)` in `src/lib/test-session/prompt-snapshot.ts`, **unit-tested now** (incl. adversarial inputs that inject `correct_*`/`explanation`/`pairs`-with-answers → assert excluded). The SQL in the RPC mirrors it; add a comment in both that they must stay in sync. The RPC is the security boundary; the TS fn is the testable spec.

**B. Definer RPCs MUST assert ownership manually.** `security definer` bypasses RLS. Both `start_test_session` and `submit_test_session` must explicitly check `auth.uid()` against the session's `user_id` (submit) / set `user_id = auth.uid()` (start). Missing this lets a user score/submit someone else's session. This is the #1 Sanity focus for the session.

**C. Freeze version + marking rule at start.** Persist `question_version_id` on each `session_questions` row (already a column) so mid-test edits/retirement don't change scoring. Snapshot the marking rule (`marksPerCorrect`, `negativeMarkingFraction`) into `test_sessions.metadata` at start, sourced from the persisted exam manifest; if not cleanly available, default UPSC Prelims **2.0 / 0.33** and record which was used. Scoring reads the frozen rule, not live config.

---

#### Order 1 — TSP-039: `start_test_session` (security-definer RPC) → lands in `Review`

- Input: `p_exam_id`, `p_type`, `p_template_id` (nullable), `p_topic_id` (nullable), `p_count` (default 10), `p_duration_minutes` (nullable).
- Insert `test_sessions` with `user_id = auth.uid()`, `status='in_progress'`, `started_at=now()`, `expires_at = now() + duration`, marking rule into `metadata` (decision C).
- **Minimal selection:** `questions` where `status='live'` and `exam_id` matches and (optional `topic_id`) and `exposure_policy = 'practice'`, `order by random()`, `limit p_count`. Capture each `current_version_id`.
- For each, insert `session_questions` with `prompt_snapshot` = allowlist build (decision A), `question_version_id` = frozen version, `sequence`, `selected_by_reason='minimal_live_filter'`.
- Return `{ session_id, expires_at, questions:[{ session_question_id, sequence, prompt_snapshot }] }` — **answer-free**.
- `revoke all from public; grant execute to authenticated`. Wrap in `src/app/test/actions.ts` `startSessionAction` (calls `requireAuth`, then RPC).
- **Gate:** Database gate. Migration + RLS/grants documented. Unit test for `buildPromptSnapshot`.

#### Order 2 — TSP-040: `saveAnswerAction` (owner-only upsert, no RPC) → lands in `Review`

- Plain server action; owner-only `upsert` into `session_answers` on `(session_id, question_id)` — RLS already permits owner insert/update.
- Validate the session belongs to the caller and is `in_progress` (reject otherwise). Update `selected_answer`, `confidence`, `marked_review`, accumulate `time_spent_sec`, bump `revisit_count`, set `last_saved_at`. **Never** compute `is_correct`/`marks_awarded` here — those stay null until submit.
- Idempotent, last-write-wins. **Gate:** Standard.

#### Order 3 — TSP-041: `submit_test_session` (security-definer RPC) → lands in `Review`

- **Assert `auth.uid() = test_sessions.user_id`** (decision B). Idempotent: if already `scored`, return the existing `session_results` row (no double-scoring).
- For each `session_answers` row: read the real key from `question_versions.content` via the frozen `session_questions.question_version_id`; compute `is_correct` and `marks_awarded` using the frozen marking rule (correct → `+marksPerCorrect`; wrong → `-negativeMarkingFraction*marksPerCorrect`; skipped → 0). Write `is_correct`/`marks_awarded` back to `session_answers`.
- Aggregate into `session_results` (score, max_score, accuracy, attempted/correct/incorrect/skipped, duration_sec, `topic_scores` jsonb by topic). Transition `test_sessions` `in_progress → submitted → scored`, set `submitted_at`.
- Pure scoring/aggregation logic in `src/lib/test-session/scoring.ts`, **unit-tested now** (per-type correctness incl. msq exact-match, integer, marks math, skipped handling). The RPC mirrors it.
- `revoke all from public; grant execute to authenticated`. Wrap in `submitSessionAction`. **Gate:** Database gate + scoring unit test.

---

#### Files the Builder will create/modify

| Action | Path |
|---|---|
| Create | `supabase/migrations/202605310001_test_session_engine.sql` (start + submit RPCs, grants) |
| Create | `src/lib/test-session/prompt-snapshot.ts` (+ `.test.ts`) |
| Create | `src/lib/test-session/scoring.ts` (+ `.test.ts`) |
| Create | `src/app/test/actions.ts` (`startSessionAction`, `saveAnswerAction`, `submitSessionAction`) |
| Edit | `trackers/JIRA_TRACKER.csv`, `docs/process/{SESSION_STATE,CHANGELOG,HANDOFF}.md`, `DECISIONS.md` |

#### Sanity focus (flag for reviewer)
1. **Decision B** — both definer RPCs assert `auth.uid()` ownership. A missing check is a cross-user data breach, not a gate nit.
2. `buildPromptSnapshot` is an allowlist; match-type `pairs` correct mapping is **not** present in any snapshot. Adversarial unit tests prove it.
3. Real answer key is read **only** inside `submit_test_session`, never returned by start or autosave.
4. Grant hygiene on both RPCs (no TSP-024 repeat).
5. `question_version_id` frozen at start; scoring uses the frozen version + frozen marking rule.

#### Verification gate
- Standard + Database. Migration file + RLS/grants documented. Unit tests for `prompt-snapshot` and `scoring` must pass (these run **now**, despite the DB block).
- DB application + browser smoke remain blocked on the **DATABASE_URL fix + admin/test user** — all three rows land in `Review`, same pattern as Session 2.

**Open item (non-blocking):** confirm where the persisted manifest stores `marksPerCorrect`/`negativeMarkingFraction` during DB smoke; if not cleanly queryable, the UPSC 2.0/0.33 default stands and TSP-051 will generalize it.

---

### 2026-05-30 - Session 3 Builder Handoff - Codex

Scope completed locally:

- Implemented `TSP-039`, `TSP-040`, and `TSP-041` from the Session 3 Architect plan.
- Opened `TSP-034` Test Session Engine epic as `In Progress`.
- Left Session 3 rows in `Review` because live DB migration/RPC smoke is blocked by the existing Supabase pooler `DATABASE_URL` error.

Files changed:

- `supabase/migrations/202605310001_test_session_engine.sql`
- `src/lib/test-session/prompt-snapshot.ts`
- `src/lib/test-session/scoring.ts`
- `src/tests/unit/prompt-snapshot.test.ts`
- `src/tests/unit/scoring.test.ts`
- `src/app/test/actions.ts`
- `scripts/check-rpc-grants.js`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/BLOCKERS.md`
- `docs/process/CHANGELOG.md`
- `docs/process/DECISIONS.md`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Added a TypeScript prompt snapshot allowlist and matching SQL helper. The start RPC copies only safe fields per question type; match `pairs`, `correct_*`, and explanations are never returned.
- Added `start_test_session` security-definer RPC. It sets `user_id = auth.uid()`, freezes `question_version_id`, snapshots marking metadata, does minimal live/practice exam-topic selection, and returns answer-free prompt snapshots.
- Added `saveAnswerAction`. It validates signed-in ownership, `in_progress` status, expiry, and question membership before upserting `session_answers`; it intentionally keeps `is_correct` and `marks_awarded` null.
- Added a TypeScript scoring helper/test suite and matching SQL answer evaluator. Malformed option arrays are treated as invalid/skipped instead of breaking submit.
- Added `submit_test_session` security-definer RPC. It explicitly asserts `auth.uid() = test_sessions.user_id`, is idempotent for already-scored sessions, reads real keys only through frozen `question_version_id`, writes `is_correct`/`marks_awarded`, aggregates `session_results`, and transitions the session to `scored`.
- Extended `scripts/check-rpc-grants.js` to verify `start_test_session` and `submit_test_session` execute grants.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/prompt-snapshot.test.ts src/tests/unit/scoring.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0 after elevated rerun.
- `corepack pnpm lint` exited 0 after elevated rerun.
- `corepack pnpm test` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm build` exited 0 after elevated rerun.
- `node --check scripts\check-rpc-grants.js` exited 0 after elevated rerun.
- Static checks found the expected ownership and grant lines in `202605310001_test_session_engine.sql`.

Blocked verification:

- `node run-migrations.js` still fails before applying Session 2 or Session 3 migrations:

```text
PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found
```

Sanity review focus:

- Confirm `start_test_session` and `submit_test_session` both use `auth.uid()` correctly. `submit_test_session` must reject sessions not owned by the caller.
- Confirm `build_session_prompt_snapshot` is an allowlist and does not copy match `pairs` or any `correct_*`/explanation fields.
- Confirm `saveAnswerAction` never computes score fields and rejects non-owned, non-in-progress, expired, or non-member questions.
- Confirm `submit_test_session` is idempotent for already-scored sessions and reads answer keys only from frozen `session_questions.question_version_id`.

Next recommended step:

1. Fix Supabase `DATABASE_URL` with the exact transaction pooler string from the current project.
2. Run `node run-migrations.js`, then `node scripts\check-rpc-grants.js`.
3. Smoke start→save→submit with a plain test user after migrations apply.
4. Sanity Test agent reviews Session 3 and keeps rows in `Review` until DB/RPC smoke passes.

---

### 2026-05-31 - Session 3 Sanity Review - Architect (Claude Opus 4.8)

Reviewed the full Session 3 diff against the Session 3 Plan's five security focuses. Read `202605310001_test_session_engine.sql` (all four functions), `prompt-snapshot.ts`, `scoring.ts`, `test/actions.ts`, and the adversarial unit tests.

**Overall: PASS on code. No blocking findings.** All three rows correctly sit in `Review` — the only gap to `Done` is the DATABASE_URL fix + RPC/browser smoke, not code.

**Focus 1 — Definer ownership assertion (the #1 risk): PASS.** `start_test_session` sets `user_id = auth.uid()` and rejects null auth. `submit_test_session` explicitly raises `42501` when `v_session.user_id <> v_user_id` *after* `select … for update`. No cross-user scoring path. This was the highest-risk item and it's correct.

**Focus 2 — Allowlist snapshot, no `pairs` leak: PASS.** `build_session_prompt_snapshot` (SQL) and `buildPromptSnapshot` (TS) are strict per-type allowlists; match exposes `left/right/leftColumn/rightColumn/prompts/choices` but never `pairs`. Every copied array is validated to be a string array. Adversarial tests assert no `correct*`/`explanation`/`pairs` leak, including a nested-injection case. The allowlisted keys also can't collide with the TSP-035 `prompt_snapshot` CHECK.

**Focus 3 — Real key read only at submit: PASS.** `score_session_answer_correct` (which reads `correct_options`/`correct_integer`/`pairs`) is invoked only inside `submit_test_session`. Start and autosave never touch answer-bearing fields; autosave forces `is_correct`/`marks_awarded` to null.

**Focus 4 — Grant hygiene: PASS.** `revoke all from public` on all four functions; `grant execute to authenticated` only on `start`/`submit`. The two helpers stay owner-only (reachable just via the definer RPCs). No TSP-024 repeat.

**Focus 5 — Frozen version + marking rule: PASS.** `session_questions.question_version_id` is pinned to `current_version_id` at start; submit scores via a join on the *frozen* version, not live. Marking rule is frozen into `test_sessions.metadata.markingRule` at start and read back from metadata at submit.
- COMMEND: the open marking-source item is resolved — start reads `exam_manifests.manifest->'marking'` (most recent active version) with UPSC 2.0/0.33/120 defaults, and records the source.

**Non-blocking notes (track, don't block):**
- **N4 (match scoring):** SQL `jsonb` equality vs TS `JSON.stringify` can diverge for match questions if pair-object key order or array order differs. Exact-equality match is a v1 simplification anyway; canonicalize (sort keys/array) when match scoring becomes load-bearing.
- **N5 (revisit_count):** `saveAnswerAction` increments `revisit_count` on every save, so it's really a save counter (first save → 1). Fix to view-based semantics when the test UI/autosave lands (TSP-043/048).
- **N6 (cosmetic):** `start_test_session` calls `build_session_prompt_snapshot` twice per question (insert + return). Compute once into a variable.

**Idempotency / correctness spot-checks:** submit returns the existing result when already `scored` (no double-score); `accuracy = correct/attempted` is consistent across SQL and TS; autosave validates ownership + `in_progress` + expiry + question-belongs-to-session, with RLS as defense-in-depth.

**Note on TSP-034:** Builder set the parent row `Build reusable templates and user test sessions` to `In Progress` to house the session-engine work. Reasonable grouping; it stays `In Progress` until the 039/040/041 children reach `Done`.

**Action items:** none for the Builder to fix to clear Sanity. N4–N6 are tracked for the relevant future rows. Environmental unblock (DATABASE_URL + admin/test user) remains the only path to `Done`.

---

### 2026-05-31 - M0 Live Verification - Architect (Claude Opus 4.8)

**The DB blocker was a paused project, not a bad URI.** The connection string was correct all along; the founder unpaused the project and it connects immediately (`current_user=postgres`). The `tenant/user not found` error is what Supavisor returns for a paused tenant.

Ran the full live verification chain against the pooler:

- `node run-migrations.js` → **all migrations applied**, incl. `202605300001_test_sessions`, `202605300002_question_lifecycle`, `202605310001_test_session_engine`. NOTICEs were idempotent "drop policy if exists" skips.
- `node scripts\check-rpc-grants.js` → all **7 RPCs** `can_execute=true` for `authenticated`, incl. `set_question_status`, `start_test_session`, `submit_test_session`. No grant bug.
- `node scripts\smoke-manifest-import.js` → PASS (UPSC manifest v4; 18 topics / 4 concepts / 2 clusters / 2 cutoffs).
- `node scripts\smoke-question-crud.js` → PASS (create v1 → update v2 → **retire via `set_question_status`** logging `draft→retired changed:true` → cleanup). Confirms the Session 2 lifecycle refactor live.
- **New: `node scripts\smoke-test-session.js`** (added this session) → PASS. Seeds 3 live MCQs, runs `start_test_session` → autosave → `submit_test_session`. Verified live:
  - **`snapshotLeak: none`** — recursive key scan of every returned snapshot found no `correct*`/`answer*`/`explanation*`/`pairs` field. Answer isolation holds against the live DB.
  - **Exact scoring** — 1 correct (+2), 1 wrong (−0.6667×2), 1 skipped → score 0.6666, max 6, accuracy 0.5; marking rule frozen from `exam_manifest` (mpc 2, nmf 0.6667). Resolves the marking-source open item.
  - **Idempotent** re-submit (same `result_id`, unchanged score).
  - Clean teardown (sessions → questions → user order; deletes by id). Note: `create_admin_question` coerces a non-enum `p_source` to `manual`, so identify seed data by `created_by`, not source.

**Rows moved to `Done` (DB/logic gates fully met, no UI dependency):** `TSP-035`, `TSP-039`, `TSP-041`, `TSP-159`, `TSP-027`.

**Still `Review` — pending browser smoke with the two users (no code gap, just UI-path verification):**
- `TSP-019` (manifest import) and `TSP-024` (question CRUD) — RPC-verified live; gate asks for an admin-session browser pass.
- `TSP-090` (admin guard) — needs non-admin-blocked / admin-allowed browser check.
- `TSP-026` (review queue) — needs the queue UI exercised in-browser.
- `TSP-040` (autosave) — engine path verified, but the actual server action + owner-only RLS (a user cannot write to another's session) was not exercised; the smoke inserted as superuser, bypassing RLS. Verify via browser or an authenticated-client integration test.
- `TSP-025` (bulk import) — not yet smoke-tested live.

**To fully close M0, founder still needs to provide:** an admin user (`app_metadata.user_role="admin"`) + a plain test student, then a browser pass of `/admin/questions/review`, the admin guard, and the take-a-test loop.

---

### 2026-05-31 - Session 4 Plan (M1) - Architect (Claude Opus 4.8)

**Milestone:** M1 Playable Test (per `docs/process/ROADMAP.md` — read first). **Scope:** TSP-044 (question renderer) → TSP-043 (test shell + timer). One commit per row, TSP-044 first (it's the testable unit the shell consumes). Remaining M1 rows (TSP-045 navigator grid, 046 confidence, 047 mark-for-review, 048 autosave recovery, 049 tab-switch logging) are **out of scope** — later M1 sessions.

**Goal:** a logged-in student can start a test, see one question at a time with a live countdown, answer, and submit to see a score — in the browser. The engine (start/save/submit) is already live-verified; this puts a face on it.

#### Routing & data flow (decisions)
- Routes live under the existing `(app)` group at **`/tests/...`** — middleware already protects `/tests` (no middleware change needed). The `(app)` layout wraps them with the app header.
- **Launcher** `src/app/(app)/tests/page.tsx` (Server Component): lists active exams; a client `<StartTest>` island calls `startSessionAction` via `useActionState` and on `state.sessionId` does `router.push('/tests/'+sessionId)`. Do **not** modify the verified actions; navigate from the client on success.
- **Shell** `src/app/(app)/tests/[sessionId]/page.tsx` (Server Component): loads the session and its `session_questions` (ordered by `sequence`) with the Supabase **server** client — RLS already restricts to the owner. Guard: if not found / not owned → `notFound()`; if status is `submitted`/`scored` → show the result panel. Passes `{ sessionId, expiresAt, questions:[{sessionQuestionId, questionId, sequence, promptSnapshot}] }` to the client runner. **Never loads answer keys** (they aren't in `session_questions`).

#### TSP-044 — Question renderer (`src/components/test/question-renderer.tsx`, client)
- Input: `promptSnapshot` (answer-free) + current `value` + `onChange`. Renders by `promptSnapshot.type`.
- **Answer shape must match the scorer exactly** (this is the #1 integration risk): mcq → `{ options: [i] }`; msq → `{ options: [i,j,...] }`; integer → `{ integer: n }` (scorer reads `selected.integer ?? selected.value`). Put this mapping in a pure, unit-tested helper `src/lib/test-session/answer-shape.ts` (mirror of `scoring.ts` expectations) so the shape can't silently drift.
- **Scope for S4: mcq, msq, integer** — these are what `scoring.ts` handles cleanly and what seed/PYQ data uses (mcq dominates UPSC Prelims). `statement`/`assertion`/`match` render their prompt read-only with a "answer entry coming soon" note — **no crash**.
  - **Flagged follow-up (architect):** the TSP-039 snapshot allowlist copies `options` only for mcq/msq, so `statement`/`assertion` questions arrive without selectable options. Supporting them needs a small TSP-039 amendment (copy `options` for those types too) + renderer work. Logging as a fast-follow row, not S4.

#### TSP-043 — Test shell + timer (`src/components/test/test-runner.tsx`, client)
- Holds `currentIndex`, an `answers` map, save status, and the submitted result. Renders `<QuestionRenderer>` for the current question + linear **Prev/Next** and "Question X of N" (the rich navigator grid is TSP-045, deferred).
- **Server-authoritative timer (locked decision):** derive `remainingMs` from `expiresAt` (not a client-only counter); tick display every 1s. The client clock is display only — the server is the source of truth (`saveAnswerAction` rejects expired saves; `submit_test_session` scores frozen data). On `remaining ≤ 0` → auto-call `submitSessionAction` and lock inputs.
- **Autosave:** on answer change / Next, call `saveAnswerAction` (sessionId, questionId, `selectedAnswer` JSON, `timeSpentSec` increment) with a subtle "Saving…/Saved" indicator. Confidence + mark-for-review are deferred (don't send them; defaults apply). Full client-side recovery is TSP-048.
- **Submit:** `submitSessionAction` → on success show an **inline result panel** (score, max, accuracy, correct/incorrect/skipped) + a link to `/dashboard`. A dedicated results route is deferred to M4/TSP-053.

#### Gates
- **App build gate** (UI/routing): `corepack pnpm typecheck` + `lint` + **`build`**.
- **Unit test:** `src/lib/test-session/answer-shape.ts` (per-type shape correctness) — runs now, no DB needed.
- **Browser smoke (needs the M0 test student):** login → start → answer mcq/msq/integer → watch timer → submit → see score. Lands in `Review` until that browser pass with the test user is done.

#### Sanity focus (flag for reviewer)
1. Selected-answer JSON shape is byte-identical to what `scoring.ts` expects — a mismatch silently scores everything wrong/skipped. The shared `answer-shape.ts` helper + its test is the guard.
2. Timer is server-authoritative; a tampered client clock cannot extend a session (saves rejected after `expires_at`; submit unaffected).
3. Shell never receives or renders an answer key; renderer never depends on one.
4. Owner guard on `[sessionId]` — opening another user's session is blocked (RLS + clean `notFound()`).
5. statement/assertion/match render without crashing despite deferred answer entry.

#### Files
| Action | Path |
|---|---|
| Create | `src/app/(app)/tests/page.tsx` (launcher) |
| Create | `src/components/test/start-test.tsx` (client launcher island) |
| Create | `src/app/(app)/tests/[sessionId]/page.tsx` (shell loader + guard) |
| Create | `src/components/test/test-runner.tsx` (TSP-043) |
| Create | `src/components/test/question-renderer.tsx` (TSP-044) |
| Create | `src/lib/test-session/answer-shape.ts` (+ `.test.ts`) |
| Edit | `src/app/(app)/layout.tsx` (add a "Tests" nav link) |
| Edit | `trackers/JIRA_TRACKER.csv`, process docs |

**Open question for founder (non-blocking — proceeding assuming yes):** OK to ship the M1 demo supporting **mcq/msq/integer** answer entry first, with statement/assertion/match as a fast-follow? mcq dominates UPSC Prelims, so this still gives a real, takeable test.

---

### 2026-05-31 - Session 4 Builder Handoff - Codex

Scope completed locally:

- Implemented `TSP-044` question renderer and `TSP-043` test shell/timer from the Session 4 M1 plan.
- Opened `TSP-042` Test Taking UI epic as `In Progress`.
- Left `TSP-043` and `TSP-044` in `Review` because browser smoke still needs the M0 plain test student.

Files changed:

- `src/lib/test-session/answer-shape.ts`
- `src/tests/unit/answer-shape.test.ts`
- `src/components/test/question-renderer.tsx`
- `src/components/test/start-test.tsx`
- `src/components/test/test-runner.tsx`
- `src/app/(app)/tests/page.tsx`
- `src/app/(app)/tests/[sessionId]/page.tsx`
- `src/app/(app)/layout.tsx`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/CHANGELOG.md`
- `docs/process/DECISIONS.md`
- `docs/process/BLOCKERS.md`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

Implementation notes:

- Added a shared answer-shape helper so MCQ writes `{options:[i]}`, MSQ writes stable sorted `{options:[i,j]}`, and integer writes `{integer:n}`.
- Added a renderer that consumes only answer-free prompt snapshots. MCQ/MSQ/integer support answer entry; statement/assertion/match render read-only with a deferred-entry note.
- Added `/tests` launcher and `/tests/[sessionId]` shell under the existing protected `(app)` route group.
- The shell loads sessions, session questions, saved answers, and results through the Supabase server client under owner RLS. It never joins `question_versions` or loads answer keys.
- The runner derives countdown from `expires_at` plus server render time, autosaves through `saveAnswerAction`, auto-submits at zero, and shows the `submitSessionAction` result inline.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/answer-shape.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0 after elevated rerun.
- `corepack pnpm lint` exited 0 after elevated rerun.
- `corepack pnpm test` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm build` exited 0 after elevated rerun.
- Dev server attempt: `corepack pnpm dev --hostname 127.0.0.1 --port 3000` exited immediately through the pnpm shim. Running the direct Next binary printed `http://127.0.0.1:3000`, then exited with `UNKNOWN: unknown error, read`, consistent with the existing OneDrive/node_modules hydration blocker.

Pending browser smoke:

- Login as the plain test student.
- Open `/tests`, start a test, answer MCQ/MSQ/integer questions, confirm countdown display, submit, and verify the inline score.
- This pass should cover `TSP-043`, `TSP-044`, and the remaining `TSP-040` browser autosave/RLS gate.

Sanity review focus:

- Confirm selected-answer JSON exactly matches `scoring.ts` expectations.
- Confirm `/tests/[sessionId]` reads only `session_questions.prompt_snapshot`, `test_sessions`, `session_answers`, and `session_results`.
- Confirm the timer cannot extend server acceptance beyond `expires_at`; expired saves should still be rejected server-side.
- Confirm deferred statement/assertion/match snapshots render without crashing.

---

### 2026-05-31 - Session 4 Sanity Review (M1) - Architect (Claude Opus 4.8)

Reviewed all six new/edited files: `answer-shape.ts` (+ test), `question-renderer.tsx`, `test-runner.tsx`, `(app)/tests/page.tsx`, `start-test.tsx`, `(app)/tests/[sessionId]/page.tsx`.

**Overall: PASS on code. No blocking findings.** `TSP-043`/`TSP-044` correctly stay in `Review` — the only gap is the browser pass with the M0 test student.

**Focus 1 — Answer-shape parity (the #1 risk): PASS.** `answer-shape.ts` emits exactly what `scoring.ts`/the SQL scorer read: mcq/msq `{options:[…]}`, integer `{integer:n}`. The renderer builds answers only via `makeMcqAnswer`/`toggleMsqAnswer`/`makeIntegerAnswer`, and `normalizeSelectedAnswer` also accepts the `selected_options`/`value` aliases when re-loading saved answers. Unit test covers all three types + the alias + match→null.

**Focus 2 — Server-authoritative timer: PASS (well done).** `getRemainingMs = expiresMs − (serverNowMs + elapsedMs)` where `serverNow` is stamped by the server component and `elapsedMs` comes from `performance.now()` (monotonic). It never reads the client wall clock, so changing the device clock can't extend the session; the server enforces independently (`saveAnswerAction` rejects expired; submit scores frozen data). Auto-submit on `remaining≤0` is guarded by `submittedRef` against double-fire.

**Focus 3 — No answer-key in the client: PASS.** The shell loads only `prompt_snapshot` + session/answer/result metadata; the renderer's `PromptSnapshot` type has no answer fields. Nothing reads `correct_*`.

**Focus 4 — Owner guard on `[sessionId]`: PASS.** `session.user_id !== user.id → notFound()`, plus RLS. Unauthenticated → friendly panel.

**Focus 5 — statement/assertion/match: PASS.** Their prompt renders read-only (statements list / assertion+reason / two match columns) with a "coming soon" entry; unknown types also fall through to it. No crash. Matches the flagged fast-follow.

**Bonus:** the shell already rehydrates saved answers and a prior result (`initialAnswers`/`initialResult`), so a refresh mid-test resumes — partial early credit toward TSP-048.

**Non-blocking notes (track, don't block):**
- **N7:** `handleAnswerChange` stores `normalizeSelectedAnswer(...)` in state but saves the raw `answer` to the server. Equivalent today (the renderer only ever emits already-normalized values), but saving the normalized value too would remove the chance of future drift.
- **N8:** if `expires_at` were ever null, `getRemainingMs` returns 0 and the auto-submit effect would fire on load. `start_test_session` always sets `expires_at`, so not reachable now — but treating null expiry as "no timer" rather than "expired" would be safer defensively.
- **N5 (still open):** rapid answer changes each call `saveAnswerAction`, inflating `revisit_count` (it's a save counter). Fix when wiring real autosave semantics (TSP-048).

**Action items:** none for the Builder to clear Sanity. N5/N7/N8 are tracked for TSP-045–048. Only the browser smoke with the plain test student remains before `TSP-040/043/044` → `Done`.

---

### 2026-05-31 - Session 5 Plan (M1 continued) - Architect (Claude Opus 4.8)

**Milestone:** M1 Playable Test. **Scope:** TSP-045 (navigator grid) → TSP-046 (confidence) → TSP-047 (mark-for-review). All three land in `Review`; browser smoke with the M0 test student is the gate to `Done`. One commit per row.

**No new migration needed.** `session_answers.confidence` and `session_answers.marked_review` are already live. `saveAnswerAction` already reads both fields from formData. The gap is client-side only: the runner doesn't hold or send them yet.

#### Core architectural decision: unified `QuestionState`

Replace the runner's `answers: Record<string, SelectedAnswer>` map with:

```typescript
type QuestionState = {
  answer: SelectedAnswer;
  confidence: Confidence | null;  // "sure" | "unsure" | "guessed"
  markedReview: boolean;
};
// held as: questionStates: Record<string, QuestionState>
```

Export `Confidence = "sure" | "unsure" | "guessed"` from `src/lib/test-session/answer-shape.ts`.

The session page query gains `confidence, marked_review` columns; `toInitialAnswers` becomes `toInitialQuestionStates`; the runner prop renames `initialAnswers` → `initialQuestionStates`. TypeScript build failure is the guard for a missed rename.

Every `saveQuestionAnswer` call must append confidence and markedReview from the current state. Mark-for-review toggle and confidence change both trigger an immediate save (not deferred to next nav), so state is never lost on refresh.

#### TSP-045 — Question navigator (`src/components/test/question-navigator.tsx`)

```typescript
type QuestionNavigatorProps = {
  disabled?: boolean;
  onJump: (index: number) => void;
  questions: { questionId: string; sequence: number }[];
  currentIndex: number;
  states: Record<string, { answered: boolean; markedReview: boolean }>;
};
```

Status derivation (per cell): `markedReview` → `review`/`review-answered`; answered (not marked) → `answered`; else → `unanswered`. Current index adds a ring on top.

Colors: unanswered = muted border/bg; answered = `bg-primary text-primary-foreground`; review = `bg-amber-100 text-amber-800 border border-amber-300`; review-answered = `bg-amber-400 text-amber-950`; current adds `ring-2 ring-primary ring-offset-1`.

Layout: `grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1` between the header card and the question card. Each cell `h-10 w-10 rounded-md text-xs font-semibold`. Clicking calls `onJump(index)` (which saves first, same pattern as Prev/Next — extract a shared `jumpTo(index)` in the runner).

#### TSP-046 — Confidence control (`src/components/test/confidence-control.tsx`)

```typescript
type ConfidenceControlProps = {
  disabled?: boolean;
  onChange: (value: Confidence | null) => void;
  value: Confidence | null;
};
```

Three inline toggles: **Sure** / **Unsure** / **Guessed**. Clicking the active one clears to null. Placed below `<QuestionRenderer>`, above nav buttons. Confidence change triggers immediate `saveQuestionAnswer`.

#### TSP-047 — Mark for review (inline toggle in TestRunner)

Single button in the question header card. Text: "Mark for review" / "Marked — unmark". Active style: `border border-amber-300 text-amber-700`; inactive: `border border-border text-muted-foreground`. Toggle triggers immediate `saveQuestionAnswer`.

#### Files the Builder will create/modify

| Action | Path |
|--------|------|
| Create | `src/components/test/question-navigator.tsx` (TSP-045) |
| Create | `src/components/test/confidence-control.tsx` (TSP-046) |
| Edit | `src/lib/test-session/answer-shape.ts` — export `Confidence` type |
| Edit | `src/components/test/test-runner.tsx` — QuestionState refactor + all three features |
| Edit | `src/app/(app)/tests/[sessionId]/page.tsx` — select confidence+marked_review; toInitialQuestionStates; rename prop |
| Edit | `trackers/JIRA_TRACKER.csv`, process docs |

#### Sanity focus

1. Every save (nav, submit pre-save, answer-change, confidence-change, mark-toggle) sends confidence + markedReview — a missing one silently overwrites saved state to null.
2. `jumpTo` saves before navigating (no race).
3. Initial rehydration shows correct navigator state immediately on page load.
4. `initialAnswers` → `initialQuestionStates` rename is complete in both page and runner (build catches it).
5. Confidence + mark controls are `disabled` when `locked`.

#### Verification gate

Standard + App build gate: `corepack pnpm typecheck` + `lint` + `build`. No new unit tests (no new deterministic pure logic). Browser smoke: start → answer → mark-for-review → set confidence → see navigator states → navigate → verify rehydration → submit → score.

---

### 2026-05-31 - Session 5 Builder Handoff - Codex

Scope completed locally:

- Implemented `TSP-045`, `TSP-046`, and `TSP-047` from the Session 5 Architect plan.
- Left all three rows in `Review` because browser smoke still needs the M0 plain test student.
- No migration was added; existing `session_answers.confidence` and `session_answers.marked_review` columns are used.

Files changed:

- `src/lib/test-session/answer-shape.ts`
- `src/components/test/question-navigator.tsx`
- `src/components/test/confidence-control.tsx`
- `src/components/test/test-runner.tsx`
- `src/app/(app)/tests/[sessionId]/page.tsx`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/BLOCKERS.md`
- `docs/process/CHANGELOG.md`
- `docs/process/HANDOFF.md`

What changed:

- Exported the `Confidence` type (`sure | unsure | guessed`) from the answer-shape helper.
- Replaced the runner's answer-only map with unified `QuestionState` records: answer, confidence, and marked-review state.
- Added a navigator grid with current, unanswered, answered, review, and review-answered visual states.
- Added a confidence segmented control and a mark-for-review header toggle.
- Every runner save path now submits `selectedAnswer`, `confidence`, and `markedReview`: answer changes, confidence changes, mark toggles, Prev/Next, navigator jumps, and submit pre-save.
- Session resume now selects `confidence` and `marked_review` from `session_answers` and rehydrates them into initial runner state.

Verification:

- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` failed twice with Windows sandbox `spawn setup refresh`, then passed after elevated rerun.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- Dev server attempt: background `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited immediately with code 0; `curl.exe -I http://127.0.0.1:3000/tests` could not connect.
- Dev server attempt: background `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited immediately with code 0; foreground command also exited 0 with no server left listening; `curl.exe -I http://127.0.0.1:3000/tests` could not connect.

Sanity review focus:

- Confirm every save path sends both `confidence` and `markedReview` so saved values are not overwritten to null/false.
- Confirm `jumpTo(index)` is used by Prev, Next, and navigator clicks and saves before changing the current index.
- Confirm confidence and mark-for-review changes save immediately and rehydrate on refresh.
- Confirm navigator status priority: marked+answered, marked-only, answered-only, then unanswered; current ring overlays the status.

Next recommended step:

- Sanity Test agent should review `TSP-045`, `TSP-046`, and `TSP-047`.
- Browser smoke remains: login as plain student → start test → answer → set confidence → mark for review → navigate → refresh/rehydrate → submit → see score.

---

### 2026-05-31 - Session 5 Sanity Review (M1) - Architect (Claude Opus 4.8)

Reviewed all five changed files against the Session 5 plan's five sanity focus items.

**Overall: PASS on code. No blocking findings.** TSP-045/046/047 correctly stay in `Review` — the only gap to `Done` is the browser pass with the M0 test student.

**Focus 1 — Every save sends confidence + markedReview: PASS.** `saveQuestionAnswer` appends both fields on every call. All three call sites (`commitQuestionState`, `jumpTo`, `submit` pre-save) pass the full `QuestionState`. `commitQuestionState` passes the *new* state directly to the save (not re-read from the ref), so rapid answer → confidence → mark sequences never save stale data. `questionStatesRef` is kept in sync on every commit, so `jumpTo` and `submit` always read the latest value.

**Focus 2 — jumpTo saves before navigating: PASS.** `jumpTo` awaits `saveQuestionAnswer`, then `setCurrentIndex`. `move(delta)` delegates to `jumpTo`. Both Prev/Next and the navigator's `onJump` call the same shared function.

**Focus 3 — Initial rehydration: PASS.** Session page query adds `confidence, marked_review`. `toInitialQuestionStates` maps them through `normalizeConfidence` (explicit string validation) and `row.marked_review === true`. Navigator derives from `questionStates` initialized with this data — correct state shown immediately on load.

**Focus 4 — initialAnswers → initialQuestionStates rename: PASS.** Prop declaration, function signature, `useState`, `useRef`, and the page's `<TestRunner>` call are all consistent. Build gate confirmed.

**Focus 5 — Controls disabled when locked: PASS.** Mark-for-review button, `QuestionNavigator`, `ConfidenceControl`, and `QuestionRenderer` all have `disabled={locked || isPending}`.
- **COMMEND:** Builder fixed a pre-existing gap — Prev/Next in Session 4 were only gated on `isPending`, not `locked`. Now `disabled={locked || currentIndex === 0 || isPending}`.

**Non-blocking note:**
- **N9 (cosmetic):** `QuestionState` is exported from the `"use client"` `test-runner.tsx` and imported as `type` by the Server Component page. TypeScript handles type-only imports across the boundary correctly; no runtime issue. Relocate to `answer-shape.ts` on a future cleanup pass.

**Action items:** none for the Builder. N9 tracked for future cleanup. Only the browser smoke remains before TSP-045/046/047 → Done.

---

## Current Recommended Next Task

Session 5 passed Architect Sanity (PASS, no blocking findings). TSP-045/046/047 in `Review`; TSP-042 `In Progress`.

**Founder — one browser session closes 11 rows (M0 + full M1 first slice):**
1. Create admin user (`app_metadata.user_role="admin"`) + plain test student in Supabase Auth.
2. As **admin**: `/admin/questions/review` → verify queue loads, approve/reject works; confirm non-admin is blocked → closes TSP-019/024/025/026/090.
3. As **student**: `/tests` → start → answer MCQ/MSQ/integer → set confidence → mark a question → navigate grid → submit → inline score → closes TSP-040/043/044/045/046/047.

After that: **Session 6 = M1 final slice — TSP-048** (autosave recovery) + **TSP-049** (tab-switch logging), then M1 closes and M2 begins.

---

### 2026-05-31 - Session 6 Plan (M1 final slice) - Architect (Claude Opus 4.8)

**Milestone:** M1 Playable Test — final two rows. **Scope:** TSP-048 (autosave recovery) + TSP-049 (tab-switch logging). Both land in `Review`. One commit per row. No new migration needed.

**Pre-work (folded into TSP-048 commit):** Move `QuestionState` type from `test-runner.tsx` into `src/lib/test-session/answer-shape.ts`. Resolves Sanity N9 (type exported from a client component, imported by a server page).

#### Architectural decisions (all locked per ROADMAP M1)

**A. Zustand backup — conflict rule: server answer wins.**
`session-backup-store.ts` holds `Record<sessionId, { questionStates, savedAt }>` persisted to `localStorage` under key `"tsp-session-backup"` (Zustand v5 + persist middleware). On mount, apply backup via `useEffect` (not during SSR render) after Zustand has hydrated. Merge rule (pure fn `mergeWithBackup`, unit-tested): server state with a non-null answer wins; backup fills in only where server has no answer. Write backup in `commitQuestionState` before the async save — so even a crash mid-flight preserves the latest state. Clear on submit *success* (not on attempt).

**B. Debounce integer saves (800ms); everything else saves immediately.**
`commitQuestionState` gains `mode: "immediate" | "debounced"`. `handleAnswerChange` passes `"debounced"` when question type is `"integer"`, `"immediate"` otherwise. `scheduleDebounced` and `flushDebouncedSave` use a `debouncedSaveRef` that reads from `questionStatesRef.current` at fire time (no stale-closure risk). `jumpTo` and `submit` call `flushDebouncedSave()` first. Timer cleared on unmount.

**C. Fix revisit_count semantics (N5).**
`pendingVisitRef = useRef<Record<string, number>>({})`. First question initialized with 1 on mount. `jumpTo` increments `pendingVisitRef[destQuestion.questionId]` before navigating. `saveQuestionAnswer` reads and resets the pending count, passes it as `revisitIncrement` in formData. `saveAnswerAction` gains `revisitIncrement = integerValue(formData, "revisitIncrement", 1)` (default 1 for backwards compat); upsert uses `existing.revisit_count + revisitIncrement`.

#### TSP-048 — New file: `src/lib/test-session/session-backup-store.ts`
Zustand v5 store with persist. Exports `useSessionBackupStore` (with `setBackup`, `clearBackup`, `getBackup`) and pure `mergeWithBackup(serverStates, backup)` function. Unit test required: server-wins, backup-wins (null answer), backup-wins (missing key), null backup no-op, overlapping non-null server wins.

#### TSP-049 — Tab-switch logging
New `logTabSwitchAction` in `src/app/test/actions.ts`. Reads `test_sessions.metadata`, increments `tabSwitches` key, writes back. Owner + in-progress check; errors dropped silently. In `TestRunner`: `visibilitychange` listener increments local `tabSwitchCount` state and calls `logTabSwitchAction` fire-and-forget (`void`). Display `"{n} tab switch(es)"` in the header status line when count > 0. No warning shown — Phase 1 is logging only.

#### Files the Builder will create or modify
| Action | Path |
|--------|------|
| Edit | `src/lib/test-session/answer-shape.ts` — add `QuestionState` (move from test-runner, resolves N9) |
| Create | `src/lib/test-session/session-backup-store.ts` |
| Create | `src/tests/unit/session-backup.test.ts` |
| Edit | `src/components/test/test-runner.tsx` — backup, debounce, pendingVisitRef, tab-switch |
| Edit | `src/app/(app)/tests/[sessionId]/page.tsx` — update `QuestionState` import source |
| Edit | `src/app/test/actions.ts` — `revisitIncrement` in saveAnswerAction + `logTabSwitchAction` |
| Edit | `trackers/JIRA_TRACKER.csv`, process docs |

#### Verification gate
Standard + App build gate: typecheck + lint + build. Unit test: `corepack pnpm exec vitest run src/tests/unit/session-backup.test.ts` must pass. Browser smoke: type integer → hard-refresh → confirm recovery; switch tabs → confirm count in status line; submit → confirm backup cleared.

#### Sanity focus
1. `setBackup` called before the async save in `commitQuestionState` (crash-safe).
2. `mergeWithBackup` unit test covers all five cases.
3. `flushDebouncedSave()` awaited at the top of `jumpTo` and `submit`.
4. `clearBackup` only in submit success branch.
5. `revisitIncrement` defaults to 1 in `saveAnswerAction`.
6. `logTabSwitchAction` called with `void` — does not block or throw.

---

### 2026-05-31 - Session 6 Builder Handoff - Codex

Scope completed locally:

- Implemented `TSP-048` and `TSP-049` from the Session 6 Architect plan.
- Left both rows in `Review` because browser smoke still needs the M0 plain test student and a runnable dev server.
- No migration was added; existing `test_sessions.metadata`, `test_sessions.tab_switch_count`, and `session_answers.revisit_count` are used.

Files changed:

- `src/lib/test-session/answer-shape.ts`
- `src/lib/test-session/session-backup-store.ts`
- `src/tests/unit/session-backup.test.ts`
- `src/components/test/test-runner.tsx`
- `src/app/(app)/tests/[sessionId]/page.tsx`
- `src/app/test/actions.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/BLOCKERS.md`
- `docs/process/CHANGELOG.md`
- `docs/process/HANDOFF.md`

What changed:

- Moved `QuestionState` into `answer-shape.ts` so the Server Component page no longer imports a type from the client runner.
- Added `useSessionBackupStore` with Zustand persist under `tsp-session-backup`.
- Added `mergeWithBackup(serverStates, backup)` with the locked server-wins rule: server non-null answers win; backup fills null or missing server states.
- Runner writes backup before starting async saves and clears backup only after submit succeeds.
- Integer answer changes use an 800ms debounce; jump and submit flush pending debounced saves before continuing.
- `pendingVisitRef` tracks visits-to-question; saves now pass `revisitIncrement`, and `saveAnswerAction` defaults that field to `1` for backwards compatibility.
- Added `logTabSwitchAction` with owner/in-progress checks. The runner listens for `visibilitychange`, fire-and-forgets the action, and displays local tab-switch count.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/session-backup.test.ts` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` failed twice with Windows sandbox `spawn setup refresh`, then passed after elevated rerun.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.

Sanity review focus:

- Confirm `setBackup` happens before async save starts in `commitQuestionState`.
- Confirm `mergeWithBackup` tests cover server-wins, backup-wins for null server answer, backup-wins for missing key, null backup no-op, and overlapping non-null server wins.
- Confirm `flushDebouncedSave()` is awaited before jump and submit.
- Confirm `clearBackup(sessionId)` only occurs in submit success.
- Confirm `revisitIncrement` defaults to `1` in `saveAnswerAction`, while the runner sends tracked increments.
- Confirm `logTabSwitchAction` is fire-and-forget and does not block the user flow.

Next recommended step:

- Sanity Test agent should review `TSP-048` and `TSP-049`.
- Browser smoke remains: login as plain student → start test → type integer → hard refresh/recover → switch tabs → see count → submit → confirm backup clears.

---

### 2026-05-31 - Session 6 Sanity Review (M1) - Architect (Claude Opus 4.8)

Reviewed all six changed files against the six sanity focus items.

**Overall: PASS on code. No blocking findings.** TSP-048 and TSP-049 correctly stay in `Review` — the only gap is the browser smoke.

**Focus 1 — `setBackup` before async save: PASS.** In `commitQuestionState`, the order is `questionStatesRef.current = nextStates` → `setQuestionStates` → `setBackup(sessionId, nextStates)` → then the async path. Backup is a synchronous localStorage write before any network activity. ✅

**Focus 2 — `mergeWithBackup` unit tests: PASS.** All five cases present and correct: server answer wins, null-answer backup wins, missing-key backup wins, null backup is a no-op, overlapping non-null server wins. ✅

**Focus 3 — `flushDebouncedSave` awaited first in `jumpTo` and `submit`: PASS.** Both functions `await flushDebouncedSave()` as the first async operation inside their `startTransition`. ✅

**Focus 4 — `clearBackup` only on submit success: PASS.** `clearBackup(sessionId)` is inside the success branch, after `nextState.ok`. The failure path returns early, leaving the backup intact. ✅

**Focus 5 — `revisitIncrement` defaults to 1: PASS.** `Math.max(0, integerValue(formData, "revisitIncrement", 1))` — default 1, clamped non-negative. Old callers preserve the original behaviour. ✅

**Focus 6 — `logTabSwitchAction` is fire-and-forget: PASS.** Called as `void logTabSwitchAction(formData).catch(() => undefined)` — rejections swallowed, no await, no blocking. ✅

**Three things beyond spec — all commended:**
- **`hasHydrated` flag + `onRehydrateStorage` callback** — the backup effect waits for confirmed localStorage hydration before applying. Eliminates the SSR/hydration race the plan flagged. Better than the plan's empty-deps `useEffect`.
- **`saveStatus: "pending"` + "Saved locally" label** — accurately signals that the answer is in localStorage but not yet synced to the server. Directly serves the TSP-048 acceptance criteria ("user sees sync failures").
- **Writes to `test_sessions.tab_switch_count`** (the dedicated integer column already in the Session 2 schema) in addition to `metadata.tabSwitches`. Keeps the indexed column in sync; avoids JSONB traversal for future analytics queries. The column exists in the live DB — no migration needed.

**Non-blocking note:**
- **N10 (cosmetic):** The backup effect's deps array includes `getBackup` (a Zustand selector). Zustand store functions are stable references so this is safe; `backupAppliedRef` also guards against double-application if the effect ever re-fires.

**M1 implementation is complete.** All rows from TSP-043 through TSP-049 are in `Review`. Only the browser smoke with the plain test student and admin user closes all 13 in-Review rows.

---

## Current Recommended Next Task

**M1 is implementation-complete.** All Review rows close with one browser session.

**Founder — browser smoke to close M0 + M1 (≈20 minutes):**
1. Create admin user (`app_metadata.user_role="admin"`) + plain test student in Supabase Auth.
2. As **admin**: `/admin/questions/review` → queue loads, approve/reject works, non-admin blocked → closes TSP-019/024/025/026/090.
3. As **student**: `/tests` → start → answer questions → type integer (observe debounce) → set confidence → mark for review → navigate grid → hard-refresh mid-test → confirm answer is recovered → switch tabs → see count in status line → submit → see inline score → closes TSP-040/043/044/045/046/047/048/049.

**Session 7 = M2 first slice — when ready to code next.** Per ROADMAP: TSP-029 (quality tiers) + TSP-030 (exposure policies). These unblock smart selection and are the critical path into M2. Founder decision on admin-role model (single `is_admin()` vs. reviewer/approver segregation of duties) is needed before TSP-028 (flags/quarantine).

---

### 2026-05-31 - Session 7 Plan (M2 first slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M2 Quality & Selection (per `docs/process/ROADMAP.md` — read first). **Scope:** TSP-029 (quality tiers) + TSP-030 (exposure policies). One commit per row, TSP-029 first. Both land in `Review`; browser smoke closes them.

**Why this slice first:** `start_test_session` currently selects any `status='live'` `practice` question at random. No quality gate, no pool separation. These two rows add those guardrails and unblock M2 selection rows (TSP-036/037/038). Both `quality_tier` and `exposure_policy` columns already exist on `questions` with DB CHECK constraints — no schema migration needed. We only add admin RPCs and update the start RPC.

**Pre-read facts:**
- `questions.quality_tier` — `text NOT NULL DEFAULT 'bronze'`, CHECK in `('gold','silver','bronze','quarantine')`. Index on `(quality_tier, exposure_policy)` exists.
- `questions.exposure_policy` — `text NOT NULL DEFAULT 'practice'`, CHECK in `('practice','diagnostic_reserved','benchmark_reserved','hidden')`.
- `question_stats.quality_tier` — same values, same CHECK. Must stay in sync with `questions.quality_tier`.
- `start_test_session` currently hard-codes `exposure_policy = 'practice'` and has **no quality tier filter** (quarantine questions can be selected today).

---

#### TSP-029 — Quality Tiers

**Goal:** Admins can assign a tier; selection always excludes quarantine; selection can require gold/silver minimum.

**Architect decisions (locked):**

1. **Tier ranking:** `gold=4, silver=3, bronze=2, quarantine=1`. Quarantine is always excluded from selection regardless of `p_min_quality_tier`.
2. **Manual assignment only.** Automatic calibration from stats is TSP-098 (M7). This row is admin-set only.
3. **Tier is not a lifecycle event.** No `question_status_events` row. Tier changes independently of status.
4. **Both `questions.quality_tier` and `question_stats.quality_tier` updated together** — upsert `question_stats` if absent.

**New migration: `supabase/migrations/202605310002_quality_tiers.sql`**

New RPC `set_question_quality_tier(p_question_id uuid, p_tier text) returns jsonb`:
- `is_admin()` guard; raise `42501` if not admin.
- Validate `p_tier in ('gold','silver','bronze','quarantine')`; raise `22023` with clear message if invalid. (The DB CHECK would also catch it, but give a readable error first.)
- `select ... for update` on `questions`; update `quality_tier`.
- Upsert `question_stats(question_id, quality_tier)` — insert row with defaults if absent, update tier if present.
- Return `jsonb_build_object('question_id', p_question_id, 'old_tier', v_old_tier, 'new_tier', p_tier, 'changed', v_old_tier <> p_tier)`.
- `revoke all on function ... from public; grant execute ... to authenticated`.

Updated `start_test_session` (`create or replace` in same migration) — add `p_min_quality_tier text default 'bronze'` parameter. Selection gains two new filters:

```sql
and q.quality_tier <> 'quarantine'
and case p_min_quality_tier
      when 'gold'   then q.quality_tier = 'gold'
      when 'silver' then q.quality_tier in ('gold', 'silver')
      else               true
    end
```

`exposure_policy = 'practice'` stays unchanged (TSP-030 replaces it). Add `minQualityTier` to `metadata.selection`. Re-apply `revoke/grant` for `start_test_session` after `create or replace`.

**New file: `src/lib/question-bank/quality-tier.ts`** (pure, no I/O, no DB):

```typescript
export const QUALITY_TIERS = ["gold", "silver", "bronze", "quarantine"] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];
export const QUALITY_TIER_RANK: Record<QualityTier, number> = {
  gold: 4, silver: 3, bronze: 2, quarantine: 1
};
export function isValidQualityTier(value: string): value is QualityTier { ... }
export function meetsMinimumTier(tier: string, minTier: string): boolean {
  // returns false for any invalid/unknown string
}
```

**New file: `src/tests/unit/quality-tier.test.ts`** — required cases:
- gold meets gold, silver, bronze (true × 3)
- silver fails gold (false), meets silver, bronze (true × 2)
- bronze fails gold and silver (false × 2), meets bronze (true)
- quarantine fails all tiers including bronze (false × 3)
- invalid string input → false (both args)

**Edit `src/app/admin/questions/actions.ts`**: Add `setQualityTierAction(formData: FormData)`. Calls `requireAdminForAction`, reads `questionId` + `tier` from formData, validates `isValidQualityTier`, calls `set_question_quality_tier` RPC, returns typed result.

**Edit `src/components/admin/question-editor.tsx`**: On the edit form only (not create), add a quality tier section below the main fields. Show the current tier as a styled badge (gold=yellow-500, silver=slate-400, bronze=orange-400, quarantine=red-500). A `<select>` + "Save tier" button calls `setQualityTierAction`. Disabled while saving.

**Edit `src/app/test/actions.ts`**: `startSessionAction` reads optional `minQualityTier` from formData; validates with `isValidQualityTier` (falls back to `'bronze'` if absent/invalid); passes `p_min_quality_tier` to RPC.

**Gate:** Standard + Database gate. `quality-tier.test.ts` must pass (no DB needed). Migration documented with grants.

---

#### TSP-030 — Exposure Policies

**Goal:** `start_test_session` draws from the correct pool for the session type; admins can set a question's pool.

**Architect decisions (locked):**

1. **Pool mapping:**
   - `practice`, `topic`, `concept_retest`, `custom` → `['practice']`
   - `diagnostic` → `['practice', 'diagnostic_reserved']`
   - `benchmark`, `mock` → `['practice', 'benchmark_reserved']`
   - `hidden` — **never** in any list; admin-access only.
   - Unknown/future types → `['practice']` (safe default).
2. **`diagnostic_reserved` questions can appear in diagnostic sessions** alongside practice questions — they just won't show up in plain practice.
3. **`hidden` questions are never auto-selected.** They exist for admin staging/preview only.

**New migration: `supabase/migrations/202605310003_exposure_policies.sql`**

New RPC `set_question_exposure_policy(p_question_id uuid, p_policy text) returns jsonb`:
- `is_admin()` guard; raise `42501` if not admin.
- Validate `p_policy in ('practice','diagnostic_reserved','benchmark_reserved','hidden')`; raise `22023` if invalid.
- `select ... for update`; update `questions.exposure_policy`.
- Return `{ question_id, old_policy, new_policy, changed }`.
- `revoke all from public; grant execute to authenticated`.

Updated `start_test_session` (`create or replace` in same migration) — replaces `and q.exposure_policy = 'practice'` with:

```sql
and q.exposure_policy = any(
  case p_type
    when 'diagnostic' then array['practice', 'diagnostic_reserved']
    when 'benchmark'  then array['practice', 'benchmark_reserved']
    when 'mock'       then array['practice', 'benchmark_reserved']
    else                   array['practice']
  end
)
```

Add `exposurePolicies` (the actual array used) to `metadata.selection`. Re-apply `revoke/grant` for `start_test_session`.

**New file: `src/lib/question-bank/exposure-policy.ts`** (pure):

```typescript
export const EXPOSURE_POLICIES = [
  "practice", "diagnostic_reserved", "benchmark_reserved", "hidden"
] as const;
export type ExposurePolicy = (typeof EXPOSURE_POLICIES)[number];
export function getEligibleExposurePolicies(sessionType: string): ExposurePolicy[] { ... }
```

**New file: `src/tests/unit/exposure-policy.test.ts`** — required cases:
- `practice` → `['practice']`
- `topic` → `['practice']`
- `concept_retest` → `['practice']`
- `custom` → `['practice']`
- `diagnostic` → `['practice', 'diagnostic_reserved']`
- `benchmark` → `['practice', 'benchmark_reserved']`
- `mock` → `['practice', 'benchmark_reserved']`
- unknown string → `['practice']` (safe default)
- confirm `'hidden'` is NEVER in any returned array

**Edit `src/app/admin/questions/actions.ts`**: Add `setExposurePolicyAction(formData: FormData)`. Same pattern as `setQualityTierAction`.

**Edit `src/components/admin/question-editor.tsx`**: On the edit form only, add exposure policy `<select>` + "Save policy" button calling `setExposurePolicyAction`. Show human-readable labels: Practice / Diagnostic Reserved / Benchmark Reserved / Hidden.

**No change to `startSessionAction`** — pool is derived from session type which is already sent.

**Gate:** Standard + Database gate. `exposure-policy.test.ts` must pass. Migration documented with grants.

---

#### Files the Builder will create or modify

| Action | Path |
|--------|------|
| Create | `supabase/migrations/202605310002_quality_tiers.sql` |
| Create | `src/lib/question-bank/quality-tier.ts` |
| Create | `src/tests/unit/quality-tier.test.ts` |
| Create | `supabase/migrations/202605310003_exposure_policies.sql` |
| Create | `src/lib/question-bank/exposure-policy.ts` |
| Create | `src/tests/unit/exposure-policy.test.ts` |
| Edit | `src/app/admin/questions/actions.ts` — add `setQualityTierAction` (TSP-029) + `setExposurePolicyAction` (TSP-030) |
| Edit | `src/components/admin/question-editor.tsx` — tier + policy selectors on edit form |
| Edit | `src/app/test/actions.ts` — `minQualityTier` param in `startSessionAction` |
| Edit | `trackers/JIRA_TRACKER.csv`, `docs/process/{SESSION_STATE,CHANGELOG,HANDOFF}.md` |

---

#### Sanity focus (flag for reviewer)

1. `set_question_quality_tier` updates **both** `questions.quality_tier` **and** `question_stats.quality_tier` (upsert). Missing the stats update is a silent data inconsistency.
2. `quarantine` is **always** excluded from `start_test_session` — even when `p_min_quality_tier = 'bronze'`. The `quality_tier <> 'quarantine'` filter is unconditional.
3. `hidden` is **never** in any eligible policies array for any session type.
4. Grant hygiene: `revoke all from public; grant execute to authenticated` on both new RPCs. `start_test_session` re-granted after each `create or replace` (two migrations each replace it — both must re-grant).
5. Unit tests cover all 7 session types for `getEligibleExposurePolicies` + unknown fallback, and all tier comparison edges.
6. `setQualityTierAction` and `setExposurePolicyAction` validate inputs in TypeScript before hitting the RPC (clean error, not a DB constraint violation).
7. `startSessionAction` `minQualityTier` falls back to `'bronze'` for any absent/invalid value — never passes an invalid string to the RPC.

---

### 2026-05-31 - Session 7 Builder Handoff - Codex

Scope completed locally:

- Implemented `TSP-029` and `TSP-030` from the Session 7 Architect plan.
- Left both rows in `Review` because browser smoke still needs the admin user.

Files changed:

- `supabase/migrations/202605310002_quality_tiers.sql`
- `supabase/migrations/202605310003_exposure_policies.sql`
- `src/lib/question-bank/quality-tier.ts`
- `src/tests/unit/quality-tier.test.ts`
- `src/lib/question-bank/exposure-policy.ts`
- `src/tests/unit/exposure-policy.test.ts`
- `src/app/admin/questions/actions.ts`
- `src/components/admin/question-editor.tsx`
- `src/app/test/actions.ts`
- `trackers/JIRA_TRACKER.csv`, process docs

What changed:

- Added `set_question_quality_tier` security-definer RPC. Updates both `questions.quality_tier` and `question_stats.quality_tier` (upsert pattern). Returns `{ question_id, old_tier, new_tier, changed }`.
- `start_test_session` gains `p_min_quality_tier` param (default `'bronze'`). SQL validates/normalises the param. Quarantine unconditionally excluded. Min-tier CASE filter applied. `minQualityTier` recorded in `metadata.selection`. Old 6-param signature dropped before creating 7-param version.
- Added `set_question_exposure_policy` security-definer RPC. Updates `questions.exposure_policy`. Returns `{ question_id, old_policy, new_policy, changed }`.
- `start_test_session` replaces hardcoded `exposure_policy='practice'` with type-based `= any(v_exposure_policies)`. `exposurePolicies` array recorded in `metadata.selection`.
- Pure `quality-tier.ts`: `QUALITY_TIER_RANK`, `isValidQualityTier`, `meetsMinimumTier` (quarantine hard-returns false).
- Pure `exposure-policy.ts`: `getEligibleExposurePolicies` for all 7 session types; `hidden` never returned.
- `setQualityTierAction` and `setExposurePolicyAction` in questions/actions.ts. Both TS-validate before RPC call.
- `startSessionAction` reads optional `minQualityTier`; validates via `isValidQualityTier`; falls back to `'bronze'`.
- Question editor (edit mode only): tier badge + selector + "Save tier" form; policy selector + "Save policy" form.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/quality-tier.test.ts src/tests/unit/exposure-policy.test.ts` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` passed after elevated rerun.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- `node run-migrations.js` applied both migrations.
- `node scripts/check-rpc-grants.js` confirmed all 9 tracked RPC grants.
- Dev server exits immediately; browser smoke blocked by OneDrive/node_modules environment issue.

---

### 2026-05-31 - Session 7 Sanity Review (M2) - Architect (Claude Sonnet 4.6)

Reviewed all nine changed files against the six sanity focus items.

**Overall: PASS on code. No blocking findings.** DB gate passed (per Builder). Browser smoke is the only remaining gate.

**Focus 1 — `set_question_quality_tier` updates BOTH tables: PASS.** Migration 002 lines 33–40: updates `questions.quality_tier`, then upserts `question_stats(question_id, quality_tier)`. All other stats columns have defaults; insert path is safe. ✅

**Focus 2 — Quarantine unconditionally excluded: PASS.** `quality_tier <> 'quarantine'` is an unconditional WHERE filter preceding the `CASE v_min_quality_tier` block in both migrations. Even `p_min_quality_tier='quarantine'` cannot select a quarantine question. ✅

**Focus 3 — `hidden` never in any eligible list: PASS.** `getEligibleExposurePolicies` returns only `practice`, `diagnostic_reserved`, or `benchmark_reserved`. Explicit test loops all 9 session types asserting no `'hidden'`. SQL `v_exposure_policies` CASE has no `'hidden'` branch. ✅

**Focus 4 — Grant hygiene: PASS.** Migration 002: `drop function if exists ...(uuid,text,uuid,uuid,int,int)` correctly drops old 6-param signature before creating new 7-param version. Both new RPCs and `start_test_session` revoked and re-granted. Migration 003: `create or replace` on the now-existing 7-param signature; both new RPCs and `start_test_session` re-granted. Clean — no TSP-024 repeat. ✅

**Focus 5 — Unit test coverage: PASS.** `quality-tier.test.ts`: all tier comparisons, quarantine excluded from all (including `meetsMinimumTier("quarantine","quarantine")=false`), invalid strings. `exposure-policy.test.ts`: 9 session types via `it.each` + explicit `hidden`-never-included loop. ✅

**Focus 6 — TS input validation before RPC: PASS.** Both actions validate via helpers before RPC call. `startSessionAction` falls back to `'bronze'` for absent/invalid input — `getString("")` correctly fails `isValidQualityTier`. ✅

**Three beyond-spec commends:**
- SQL also normalises invalid `p_min_quality_tier` to `'bronze'` — defensive against direct RPC calls bypassing TS validation.
- `exposurePolicies` array frozen into `metadata.selection` — future analytics can reconstruct exactly which pool was offered.
- `QualityTierBadge` fallback handles unknown tiers gracefully.

**Non-blocking notes:**
- **N11:** `meetsMinimumTier` TS and SQL CASE implement tier ordering independently — must stay in sync if a new tier is ever added. Add DECISIONS.md note on a cleanup pass.
- **N12 (cosmetic):** `set_question_quality_tier` validates inline and DB CHECK also catches it. Both layers correct.

**M2 first slice is implementation-complete and DB-verified.** TSP-029 and TSP-030 unblock TSP-036/037/038 (smart selection).

---

## Current Recommended Next Task

**M2 first slice (Session 7) is implementation-complete and DB-verified.** TSP-029 and TSP-030 in `Review`.

**Founder — browser smoke to close M0 + M1 + M2 first slice (≈25 min):**
1. Create admin user (`app_metadata.user_role="admin"`) + plain test student in Supabase Auth (if not done yet).
2. As **admin**: `/admin/questions` → open any question in edit → change quality tier → save → confirm badge updates; change exposure policy → save → closes TSP-029/030 admin UI path.
3. As **student**: `/tests` → start → full test flow → submit → score → closes TSP-040/043/044/045/046/047/048/049.
4. As **admin**: `/admin/questions/review` → queue loads, approve/reject, non-admin blocked → closes TSP-019/024/025/026/090.

**Session 8 = M2 continued — when ready to code next.** TSP-028 (flags/quarantine) requires founder decision on admin-role model first. Unblocked alternative if decision is deferred: **TSP-031** (admin search/filter) — no founder decision needed. Architect will read ROADMAP and choose at Session 8 start.

---

### 2026-05-31 - Session 7 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-029` quality tiers and `TSP-030` exposure policies from the Session 7 Architect plan.
- Left both rows in `Review` for Sanity/browser smoke instead of `Done`.

Files changed:

- `supabase/migrations/202605310002_quality_tiers.sql`
- `supabase/migrations/202605310003_exposure_policies.sql`
- `src/lib/question-bank/quality-tier.ts`
- `src/lib/question-bank/exposure-policy.ts`
- `src/tests/unit/quality-tier.test.ts`
- `src/tests/unit/exposure-policy.test.ts`
- `src/app/admin/questions/actions.ts`
- `src/components/admin/question-editor.tsx`
- `src/app/test/actions.ts`
- `scripts/check-rpc-grants.js`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/CHANGELOG.md`
- `docs/process/BLOCKERS.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `set_question_quality_tier`, which updates `questions.quality_tier` and upserts `question_stats.quality_tier` to keep stats in sync.
- Added `set_question_exposure_policy` for admin-managed pool assignment.
- Replaced `start_test_session` twice, once for min quality and once for exposure policy pools; both migrations re-grant `start_test_session`.
- `start_test_session` now accepts `p_min_quality_tier default 'bronze'`, unconditionally excludes `quarantine`, and uses type-based exposure pools where `hidden` is never eligible.
- Added pure helpers/tests for tier comparison and exposure policy eligibility.
- Added edit-mode admin controls for tier and policy, with TypeScript validation before RPC calls.
- Updated `startSessionAction` to validate optional `minQualityTier` and pass the RPC parameter.
- Updated the grant checker to expect 9 RPCs and load local `.env` like the migration runner.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/quality-tier.test.ts src/tests/unit/exposure-policy.test.ts` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` passed after elevated rerun because the sandbox failed to spawn lint.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- `node --check scripts/check-rpc-grants.js` passed.
- `node run-migrations.js` applied all migrations through `202605310003_exposure_policies.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 9 tracked RPCs.

Dev server:

- Attempted `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000`.
- Background run exited immediately with code 0.
- Foreground run also exited 0 with no output and no server left listening.

Git state:

- No commits were created. `git status --short` shows the project tree as untracked alongside pre-existing deleted root docs, so staging row-sized commits would risk capturing unrelated repository state.

Sanity review focus:

- Confirm `set_question_quality_tier` updates both `questions` and `question_stats` with upsert sync.
- Confirm `start_test_session` excludes `quarantine` unconditionally, including at `p_min_quality_tier='bronze'`.
- Confirm `hidden` is never in any eligible exposure policy array.
- Confirm both migrations re-grant `start_test_session` after `create or replace`.
- Confirm admin edit forms do not accidentally bypass TypeScript validation for tier/policy saves.

Next recommended step:

- Sanity Test reviews Session 7 and either marks `TSP-029`/`TSP-030` ready for browser smoke or hands back exact findings.

---

## Current Recommended Next Task

**Session 7 Builder pass completed.** Sanity review should inspect `TSP-029`/`TSP-030` before any further M2 selection work starts.

After Sanity, the next M2 rows are the smart selection slices: `TSP-036` diagnostic selection, `TSP-037` topic practice selection, and `TSP-038` benchmark/mock selection. Browser smoke for M0/M1/M2 Review rows still needs the admin user and plain test student.

---

### 2026-06-01 - Session 8 Plan (M2 continued) - Architect (Claude Sonnet 4.6)

**Milestone:** M2 Quality & Selection (per `docs/process/ROADMAP.md` — read first). **Scope:** TSP-031 (admin search/filter) + TSP-036 (diagnostic question selection). One commit per row, TSP-031 first. Both land in `Review`.

**Why this pair:** TSP-028 blocked on admin-role model founder decision. TSP-031 gives admins search over the growing question bank; TSP-036 is the first smart selection algorithm that puts TSP-029/030 quality tiers and exposure policies to work.

**Key pre-read facts:**
- Admin questions page loads 50 questions by `created_at DESC` with no filters — a direct Supabase client query.
- FTS must join `questions → question_versions` (GIN index is on `question_versions.content->>'text'`). PostgREST `.textSearch()` can't reach joined tables — a security-definer RPC is required.
- `topics.weight_percent` (nullable numeric, level=1 = top-level section) drives diagnostic allocation. `start_test_session` currently uses one random loop for all session types.
- Existing migrations: 001 through 005 (through today). New migrations: `202605310004` and `202605310005`.

---

#### TSP-031 — Admin Questions Search/Filter

**Architect decisions:**
1. Filter state in URL search params — shareable, back-button safe. Server Component re-renders on param change; no client state.
2. Security-definer RPC `search_admin_questions` required for FTS across joined tables.
3. FTS uses `plainto_tsquery('english', p_query)` — safe for multi-word input. Searches `content->>'text' || content->>'stem'` (covers integer questions).
4. FTS filter is **skipped** entirely when `p_query IS NULL OR p_query = ''` — no filter applied, not filtered to empty.
5. Pagination: 50/page via `p_limit`/`p_offset` params. `page` search param on the page (default 1).

**New migration `supabase/migrations/202605310004_admin_search.sql`:**

```sql
create or replace function public.search_admin_questions(
  p_query text default null,
  p_exam_id uuid default null,
  p_topic_id uuid default null,
  p_status text default null,
  p_difficulty text default null,
  p_quality_tier text default null,
  p_exposure_policy text default null,
  p_limit int default 50,
  p_offset int default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,50),1),100);
  v_offset int := greatest(coalesce(p_offset,0),0);
  v_total int;
  v_questions jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  -- count query (same WHERE as data query below)
  -- data query: join questions + question_versions + exams + topics
  -- FTS: skipped when p_query is null or ''
  -- returns { total, questions: [{id,type,difficulty,...,question_text}] }
end; $$;
revoke all on function ... from public;
grant execute on function ... to authenticated;
```

Full implementation: the WHERE clause pattern for every filter is `(p_x is null or q.column = p_x)`; FTS adds `and (p_query is null or p_query = '' or to_tsvector(...) @@ plainto_tsquery('english', p_query))`. `question_text = left(coalesce(content->>'text', content->>'stem', ''), 200)`.

**Edit `src/app/admin/questions/page.tsx`:**
- Read `searchParams`: `q`, `examId`, `topicId`, `status`, `difficulty`, `qualityTier`, `exposurePolicy`, `page`.
- If any filter present, call `search_admin_questions` RPC (offset = (page-1)*50). Otherwise keep existing direct query.
- Pass filter values + total + page to `AdminQuestionFilters` component.
- Show `"X questions"` count and `Previous / Next` page links.

**New `src/components/admin/admin-question-filters.tsx`** (client component — needs `useSearchParams` for active state):
- A `<form method="GET">` that POSTs to the same URL (search param update).
- Fields: text input (`name="q"`), select for exam (`examId`), topic (`topicId`), status, difficulty, quality tier, exposure policy.
- "Search" submit + "Clear filters" `<Link href="/admin/questions">`.
- All selects pre-populated from props (exam list, topic list, static enum lists).

**Edit `scripts/check-rpc-grants.js`:** add `search_admin_questions` to the tracked RPCs list.

**Gate:** Standard + App build gate. No unit tests (SQL filtering logic). `node run-migrations.js` + `node scripts/check-rpc-grants.js` (10 RPCs tracked).

---

#### TSP-036 — Diagnostic Question Selection

**Architect decisions:**
1. **Weighted allocation:** `floor(p_count * weight_percent / 100)` per level-1 topic; remainder distributed 1-extra to highest-weight topics until total = `p_count`.
2. **Status broadened to `IN ('approved','live')` for diagnostic only.** Non-diagnostic branches keep `status='live'`.
3. **Zero-rows fallback:** if `select_diagnostic_questions` returns no rows (no topic weights, or all topics empty), `start_test_session` falls back to the existing random loop with `selected_by_reason='diagnostic_random_fallback'`. Not an error.
4. **Pure TS helper `computeTopicAllocations` is unit-tested.** SQL mirrors it. Same pattern as `scoring.ts` / SQL scorer.
5. **`select_diagnostic_questions` is a private helper** — `revoke all from public`, no grant. Only reachable from within `start_test_session` (security-definer context).

**New file `src/lib/test-session/selection.ts`** (pure, no I/O):
```typescript
export function computeTopicAllocations(
  topics: { topicId: string; weightPercent: number }[],
  count: number
): { topicId: string; alloc: number }[] {
  // floor(count * weightPercent/100) per topic
  // remainder = count - sum(floor_allocs)
  // distribute +1 to top-N topics by weightPercent (tiebreak by original order)
  // returns sorted descending by weightPercent
}
```

**New file `src/tests/unit/selection.test.ts`** — required cases:
- 50/30/20 weights, count=10 → `[{alloc:5},{alloc:3},{alloc:2}]`
- Weights summing to 90 (not 100), count=10 → total allocated = 10 still
- All zeros → empty array
- Single topic 100%, count=7 → `[{alloc:7}]`
- Equal thirds, count=10 → two get 4, one gets 2 (remainder goes to first two by stable order)

**New migration `supabase/migrations/202605310005_diagnostic_selection.sql`:**

New function `public.select_diagnostic_questions(p_exam_id uuid, p_count int, p_min_quality_tier text, p_exposure_policies text[]) returns table(question_id uuid, current_version_id uuid, q_type text, content jsonb)`:
- Plain language sql (not plpgsql, not security definer).
- CTE chain: `topic_allocs` → `remainder_distribution` → `weighted_picks` (with `row_number() over (partition by topic_id order by random())`) → `selected` (where `rn <= alloc`) → `fillup` (random from general pool, excluding already-selected, `limit greatest(0, p_count - (select count(*) from selected))`).
- Final: `select * from selected union all select * from fillup limit p_count`.
- Status: `q.status in ('approved','live')` in both `weighted_picks` and `fillup`.
- Quality and exposure filters mirror `start_test_session` (same CASE block).
- `revoke all on function ... from public;` — NO grant (private helper).

Updated `start_test_session` (`create or replace` in same migration):
```sql
if p_type = 'diagnostic' then
  for v_question in
    select * from public.select_diagnostic_questions(
      p_exam_id, v_count, v_min_quality_tier, v_exposure_policies
    )
  loop
    v_sequence := v_sequence + 1;
    -- same insert block as existing loop
    -- selected_by_reason = 'diagnostic_weighted'
  end loop;
  -- fallback if zero results
  if v_sequence = 0 then
    -- existing random loop with selected_by_reason = 'diagnostic_random_fallback'
  end if;
else
  -- existing random loop (unchanged), selected_by_reason = 'minimal_live_filter'
end if;
```
`metadata.selection.mode` set to `'diagnostic_weighted'`, `'diagnostic_random_fallback'`, or `'minimal_live_filter'` accordingly. Re-apply `revoke/grant` for `start_test_session`.

**Gate:** Standard + Database gate. `selection.test.ts` must pass. `node run-migrations.js` + `node scripts/check-rpc-grants.js`. `select_diagnostic_questions` should NOT appear in grants checker (it's private).

---

#### Files the Builder will create or modify

| Action | Path |
|--------|------|
| Create | `supabase/migrations/202605310004_admin_search.sql` |
| Create | `supabase/migrations/202605310005_diagnostic_selection.sql` |
| Create | `src/lib/test-session/selection.ts` |
| Create | `src/tests/unit/selection.test.ts` |
| Create | `src/components/admin/admin-question-filters.tsx` |
| Edit | `src/app/admin/questions/page.tsx` — search params + RPC call + pagination |
| Edit | `scripts/check-rpc-grants.js` — add `search_admin_questions` |
| Edit | `trackers/JIRA_TRACKER.csv`, process docs |

---

#### Sanity focus (flag for reviewer)

1. `search_admin_questions` raises `42501` for non-admin callers — not silently returns empty.
2. FTS filter is **skipped** (not applied as an empty-match filter) when `p_query` is null or empty string. Confirm with a test query that omitting `q=` still returns all questions.
3. Allocation sum from `select_diagnostic_questions` equals `p_count` exactly — check remainder math.
4. Status broadening (`approved,live`) is **only** in `select_diagnostic_questions` and the fallback diagnostic loop. Non-diagnostic branch in `start_test_session` still uses `status='live'` only.
5. Zero-rows fallback is a graceful fallback, not an exception — `v_sequence = 0` after the diagnostic loop triggers the random fallback, not the `raise exception 'no eligible...'`.
6. `select_diagnostic_questions` has `revoke all from public` with **no** `grant execute` line. It must not appear in `check-rpc-grants.js`.
7. `start_test_session` re-granted after `create or replace` in migration 005.

---

## Current Recommended Next Task

**Session 8 plan ready for Builder.** TSP-031 then TSP-036, one commit each.

Verification: `corepack pnpm exec vitest run src/tests/unit/selection.test.ts`, then standard gate. DB gate: `node run-migrations.js` + `node scripts/check-rpc-grants.js` (10 RPCs: 9 existing + `search_admin_questions`). `select_diagnostic_questions` is private — confirm it is NOT in the grants checker output.

---

### 2026-06-01 - Session 8 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-031` admin search/filter and `TSP-036` diagnostic selection from the Session 8 Architect plan.
- Left both rows in `Review` for Sanity/browser smoke instead of `Done`.

Files changed:

- `supabase/migrations/202605310004_admin_search.sql`
- `supabase/migrations/202605310005_diagnostic_selection.sql`
- `src/components/admin/admin-question-filters.tsx`
- `src/app/admin/questions/page.tsx`
- `src/lib/test-session/selection.ts`
- `src/tests/unit/selection.test.ts`
- `scripts/check-rpc-grants.js`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/CHANGELOG.md`
- `docs/process/BLOCKERS.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `search_admin_questions` as a security-definer admin-only RPC returning paginated `{ total, questions }`.
- FTS uses `plainto_tsquery('english', v_query)` over current question `content->>'text'` plus `content->>'stem'`; `v_query` is `null` for absent/blank input, so FTS is skipped entirely for empty search.
- `/admin/questions` now reads URL search params, renders a GET filter form, calls the search RPC when filters are active, and shows Previous/Next pagination links.
- Added `computeTopicAllocations` with tests for exact weights, under-100 weights, zero weights, single-topic allocation, and stable-order remainder distribution.
- Added private `select_diagnostic_questions` with weighted level-1 topic allocation, random-within-topic row numbering, fillup slots, and `approved/live` status scope.
- Updated `start_test_session` so only diagnostic sessions use weighted selection or `diagnostic_random_fallback`; non-diagnostic selection still uses `status='live'`.
- Added `search_admin_questions` to `scripts/check-rpc-grants.js`; `select_diagnostic_questions` intentionally has `revoke all` and no grant.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/selection.test.ts` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` passed after elevated rerun because the sandbox failed to spawn lint.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- `node --check scripts/check-rpc-grants.js` passed.
- `node run-migrations.js` applied all migrations through `202605310005_diagnostic_selection.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs.
- The grant-checker output did not include `select_diagnostic_questions`.

Dev server:

- Attempted `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000`.
- Background run exited immediately with code 0.
- Foreground run also exited 0 with no output and no server left listening.

Git state:

- No commits were created. `git status --short` still shows the project tree as untracked alongside pre-existing deleted root docs, so staging row-sized commits would risk capturing unrelated repository state.

Sanity review focus:

- Confirm `search_admin_questions` raises `42501` for non-admin callers and does not silently return empty.
- Confirm FTS is skipped for blank/absent `q`, rather than becoming an empty-result filter.
- Confirm `select_diagnostic_questions` remains private: `revoke all` with no authenticated grant and no grant-checker entry.
- Confirm diagnostic status broadening to `approved/live` is only in diagnostic weighted/fallback paths; non-diagnostic `start_test_session` still uses `status='live'`.
- Confirm zero-row diagnostic weighted selection falls back to `diagnostic_random_fallback`.

Next recommended step:

- Sanity Test reviews Session 8 and either marks `TSP-031`/`TSP-036` ready for browser smoke or hands back exact findings.

---

### 2026-06-01 - Session 8 Sanity Review (M2) - Architect (Claude Sonnet 4.6)

Reviewed all six changed files against the six sanity focus items.

**Overall: PASS on code. No blocking findings.** DB gate passed (per Builder). TSP-031 and TSP-036 correctly sit in `Review`.

**Focus 1 — `search_admin_questions` raises `42501` for non-admin: PASS.** First statement after the declare block — `if not public.is_admin() then raise exception ... using errcode = '42501'`. No data accessed before the guard. ✅

**Focus 2 — FTS skipped for blank/absent query: PASS.** `v_query := nullif(btrim(coalesce(p_query, '')), '')` normalises null, empty, and whitespace-only inputs to NULL. WHERE uses `(v_query is null or ...)` — when NULL the condition is vacuously true (no filter applied). Not an empty-match filter. ✅

**Focus 3 — Allocation sum equals `p_count` exactly: PASS.** SQL: `generate_series(1, p_count - allocated)` produces exactly the remainder slots, distributed round-robin by weight rank. TS: while-loop distributes +1 in order. Both verified against the five required test cases (50/30/20 exact, sub-100 remainder, all-zero, single topic, equal thirds). ✅

**Focus 4 — Status broadening is diagnostic-only: PASS.** `select_diagnostic_questions` uses `status in ('approved','live')` in both `weighted_picks` and `fillup`. Diagnostic fallback loop also uses `in ('approved','live')`. Non-diagnostic `else` branch uses `status = 'live'` only — original filter, unchanged. ✅

**Focus 5 — Zero-rows fallback is graceful: PASS.** `v_sequence = 0` after the diagnostic weighted loop triggers the fallback (not an exception). Fallback performs a random `approved+live` query, updates `metadata.selection.mode` to `'diagnostic_random_fallback'`. Only if fallback also yields 0 rows does the final `raise exception` fire. ✅

**Focus 6 — `select_diagnostic_questions` private, no grant: PASS.** `revoke all on function ... from public` with no following `grant execute` line. `start_test_session` re-granted immediately after. ✅

**Four beyond-spec commends:**
- `p_source` filter added to `search_admin_questions` — useful for PYQ vs manual vs AI-generated filtering, consistent with the plan's spirit.
- `hasFilters` fast path — direct Supabase client query when no filters active; RPC only invoked when needed.
- `fillup` CTE guarded by `exists (select 1 from topic_allocs)` — ensures zero-row fallback fires cleanly when no topic weights exist, rather than silently filling with unweighted questions.
- Defensive over-count loop in `computeTopicAllocations` — handles edge case where weights sum > 100; SQL `limit p_count` caps the same.

**Non-blocking notes:**
- **N13:** SQL and TS allocation algorithms are independently implemented — must stay in sync if topic ordering or rounding behaviour changes. Log in DECISIONS.md on cleanup.
- **N14 (cosmetic):** `PaginationControls` receives `filters` and `page` as separate props but `page` is already a field on `filters`. Harmless redundancy.

**M2 second slice is implementation-complete and DB-verified.** TSP-031 and TSP-036 unblock admin content operations and smart diagnostic selection.

---

## Current Recommended Next Task

**Session 8 (M2 second slice) is implementation-complete and DB-verified.** TSP-031 and TSP-036 in `Review`.

**Founder — browser smoke to close M0 + M1 + M2 (≈30 min total, if not done yet):**
1. Admin user + plain test student in Supabase Auth.
2. Admin: `/admin/questions` → use search box and filters → verify filtered results and pagination → closes TSP-031.
3. Admin: open a question → change tier/policy → closes TSP-029/030 admin path.
4. Admin: `/admin/questions/review` → queue loads → closes TSP-019/024/025/026/090.
5. Student: `/tests` → start (type=diagnostic, if available) → full flow → submit → score → closes TSP-040/043/044/045/046/047/048/049/036.

**Session 9 = M2 final selection slice — when ready to code next.** TSP-037 (topic practice selection) + TSP-038 (benchmark/mock selection). Both unblocked. TSP-028 (flags/quarantine) still parked on admin-role model founder decision.

---

### 2026-06-01 - Session 9 Plan (M2 final selection slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M2 Quality & Selection (per `docs/process/ROADMAP.md` — read first). **Scope:** TSP-037 (topic practice selection) + TSP-038 (benchmark/mock selection). One commit per row, TSP-037 first. Both land in `Review`; browser smoke closes them.

**Why this pair:** These are the last two algorithmic selection rows in M2. TSP-037 adds difficulty-balanced, recency-aware topic practice. TSP-038 adds gold-priority benchmark/mock selection with optional fixed-template support. After these land, the M2 selection suite is complete and M3 can begin.

**Key pre-read facts:**
- `questions.difficulty`: `text CHECK in ('easy','medium','hard')`.
- `questions.source`: `text CHECK in ('pyq','ai_generated','manual','vision_ingested')`.
- `questions.topic_id` / `questions.subtopic_id`: already used by `start_test_session` `p_topic_id`.
- `session_questions` stores the user's question history (for recency avoidance).
- `test_templates.selection_mode`: can be `'fixed'`; `config` JSONB may hold `questionIds`.
- Both types use `status='live'` (not the `approved+live` broadening used only for diagnostic).
- The `else` branch in `start_test_session` currently handles topic/benchmark/mock with plain random selection. These rows replace that branch for their respective types.
- New migrations: `202606010001` and `202606010002`.

---

#### TSP-037 — Topic Practice Selection

**Architect decisions (locked):**

1. **Difficulty allocation:** Target 30% easy / 40% medium / 30% hard. `easy = floor(count * 0.3)`, `hard = floor(count * 0.3)`, `medium = count - easy - hard` (absorbs all remainder). If any tier has fewer questions than its target, a fillup CTE adds random questions from the same pool (excluding already-selected) to reach `p_count`. Pure TS helper `computeDifficultyAllocations(count)` codifies this; SQL mirrors it.

2. **Recency avoidance:** Exclude question IDs from the user's last 3 topic/concept_retest sessions on the same exam. Capped at 150 question IDs. Empty result → no exclusion (no NULLs in `session_questions.question_id`, but use `NOT EXISTS` not `NOT IN` for safety). No topic filter on the session lookup — simplest safe rule for Phase 1.

3. **Status:** `'live'` only.

4. **Private helper:** `select_topic_practice_questions(p_user_id, p_exam_id, p_topic_id, p_count, p_min_quality_tier, p_exposure_policies)` — `revoke all from public`, no `grant execute`. Pattern from TSP-036.

5. **`selected_by_reason`:** `'topic_practice_balanced'`.

6. **No mastery/adaptive difficulty** — deferred to M3. Source mix (PYQ vs manual) is also deferred to M3; Phase 1 topic practice is difficulty-balanced + recency-aware only.

**New migration `supabase/migrations/202606010001_topic_practice_selection.sql`:**

```sql
-- Private helper: difficulty-balanced, recency-aware topic practice selection.
-- NOT granted to authenticated — only reachable from start_test_session.
create or replace function public.select_topic_practice_questions(
  p_user_id uuid,
  p_exam_id uuid,
  p_topic_id uuid,           -- null = exam-wide topic practice
  p_count int,
  p_min_quality_tier text,
  p_exposure_policies text[]
) returns table(question_id uuid, current_version_id uuid, q_type text, content jsonb)
language sql
security definer
set search_path = public
as $$
  with
  recent_sessions as (
    select id
    from public.test_sessions
    where user_id = p_user_id
      and exam_id = p_exam_id
      and type in ('topic', 'concept_retest')
    order by started_at desc
    limit 3
  ),
  recently_seen as (
    select sq.question_id
    from public.session_questions sq
    where sq.session_id in (select id from recent_sessions)
    limit 150
  ),
  eligible as (
    select
      q.id as question_id,
      q.current_version_id,
      q.type as q_type,
      qv.content,
      q.difficulty
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where q.exam_id = p_exam_id
      and q.status = 'live'
      and q.exposure_policy = any(p_exposure_policies)
      and q.quality_tier <> 'quarantine'
      and case p_min_quality_tier
            when 'gold'   then q.quality_tier = 'gold'
            when 'silver' then q.quality_tier in ('gold', 'silver')
            else true
          end
      and (p_topic_id is null
           or q.topic_id = p_topic_id
           or q.subtopic_id = p_topic_id)
      and not exists (
        select 1 from recently_seen rs where rs.question_id = q.id
      )
  ),
  easy_picks as (
    select question_id, current_version_id, q_type, content
    from eligible
    where difficulty = 'easy'
    order by random()
    limit greatest(0, floor(p_count * 0.3)::int)
  ),
  medium_picks as (
    select question_id, current_version_id, q_type, content
    from eligible
    where difficulty = 'medium'
    order by random()
    limit greatest(0, p_count - 2 * floor(p_count * 0.3)::int)
  ),
  hard_picks as (
    select question_id, current_version_id, q_type, content
    from eligible
    where difficulty = 'hard'
    order by random()
    limit greatest(0, floor(p_count * 0.3)::int)
  ),
  balanced as (
    select question_id, current_version_id, q_type, content from easy_picks
    union all
    select question_id, current_version_id, q_type, content from medium_picks
    union all
    select question_id, current_version_id, q_type, content from hard_picks
  ),
  fillup as (
    select question_id, current_version_id, q_type, content
    from eligible
    where not exists (
      select 1 from balanced b where b.question_id = eligible.question_id
    )
    order by random()
    limit greatest(0, p_count - (select count(*) from balanced)::int)
  )
  select question_id, current_version_id, q_type, content from balanced
  union all
  select question_id, current_version_id, q_type, content from fillup
  limit p_count;
$$;

revoke all on function public.select_topic_practice_questions(uuid, uuid, uuid, int, text, text[]) from public;
```

Updated `start_test_session` in the same migration — split the `else` branch for `p_type = 'topic'`.

**Critical ordering constraint (fixes metadata desync):** The `INSERT INTO test_sessions` already runs BEFORE the if/elsif chain and writes `metadata.selection.mode = v_selection_mode`. The existing initial CASE only sets `'diagnostic_weighted'` or `'minimal_live_filter'`. To avoid storing `'minimal_live_filter'` in metadata for topic sessions, the `v_selection_mode` assignment for `'topic'` **must be added to the initial CASE before the INSERT**, not inside the branch:

```sql
-- In the declare block + pre-INSERT CASE (replace the existing 2-way CASE):
v_selection_mode := case p_type
  when 'diagnostic' then 'diagnostic_weighted'
  when 'topic'      then 'topic_practice_balanced'
  -- benchmark/mock determined later (handled in migration 002)
  else 'minimal_live_filter'
end;
-- INSERT happens after this, so metadata.selection.mode is already correct for topic.
```

Then in the if/elsif chain, add:
```sql
elsif p_type = 'topic' then
  -- v_selection_mode already set to 'topic_practice_balanced' above — do NOT re-assign
  for v_question in
    select * from public.select_topic_practice_questions(
      v_user_id, p_exam_id, p_topic_id,
      v_count, v_min_quality_tier, v_exposure_policies
    )
  loop
    v_sequence := v_sequence + 1;
    insert into session_questions (..., selected_by_reason)
    values (..., 'topic_practice_balanced');
    ...
  end loop;
else
  -- existing random loop unchanged for concept_retest, sectional, custom
  ...
end if;
```

Re-apply `revoke all from public; grant execute to authenticated` on `start_test_session` after `create or replace`.

**New file `src/lib/test-session/selection.ts`** — add to existing file:

```typescript
export type DifficultyAllocation = {
  easy: number;
  hard: number;
  medium: number;
};

export function computeDifficultyAllocations(count: number): DifficultyAllocation {
  if (!Number.isInteger(count) || count <= 0) {
    return { easy: 0, hard: 0, medium: 0 };
  }
  const easy = Math.floor(count * 0.3);
  const hard = Math.floor(count * 0.3);
  const medium = count - easy - hard;
  return { easy, hard, medium };
}
```

**New tests in `src/tests/unit/selection.test.ts`** — add after existing `computeTopicAllocations` tests:

Required cases for `computeDifficultyAllocations`:
- count=10 → `{easy:3, medium:4, hard:3}`, sum=10
- count=7 → `{easy:2, medium:3, hard:2}`, sum=7
- count=3 → `{easy:0, medium:3, hard:0}`, sum=3
- count=1 → `{easy:0, medium:1, hard:0}`, sum=1
- count=0 → `{easy:0, medium:0, hard:0}`
- sum always equals count for counts 1–20 (loop test)

**Gate:** Standard + Database gate. Updated `selection.test.ts` must pass. `node run-migrations.js` + `node scripts/check-rpc-grants.js` (10 RPCs unchanged — `select_topic_practice_questions` is private and must NOT appear).

---

#### TSP-038 — Benchmark/Mock Selection

**Architect decisions (locked):**

1. **Gold priority:** ORDER BY `CASE quality_tier WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END, random()`. Ensures gold questions are preferred without excluding silver/bronze when the pool is small. No complex CTE — single-pass priority sort.

2. **Status:** `'live'` only (benchmark/mock — stricter than diagnostic which allows `approved`).

3. **Fixed template:** If `p_template_id IS NOT NULL` and the template's `config->>'selectionMode' = 'fixed'` and `config->'questionIds'` is a JSON array, extract those question IDs and pass them as `p_fixed_question_ids text[]` to `select_benchmark_questions`. The helper enforces `q.exam_id = p_exam_id` on the fixed IDs — questions from another exam cannot load. Still applies quality/status filters so a stale template cannot surface quarantined or non-live questions.

4. **Private helper:** `select_benchmark_questions(p_exam_id, p_count, p_min_quality_tier, p_exposure_policies, p_fixed_question_ids)` — `revoke all from public`, no `grant execute`.

5. **`selected_by_reason`:** `'benchmark_gold_priority'` or `'benchmark_fixed_template'`.

**New migration `supabase/migrations/202606010002_benchmark_selection.sql`:**

```sql
-- Private helper: gold-priority or fixed-template benchmark/mock selection.
create or replace function public.select_benchmark_questions(
  p_exam_id uuid,
  p_count int,
  p_min_quality_tier text,
  p_exposure_policies text[],
  p_fixed_question_ids text[] default null
) returns table(question_id uuid, current_version_id uuid, q_type text, content jsonb)
language sql
security definer
set search_path = public
as $$
  with
  fixed_picks as (
    select q.id as question_id, q.current_version_id, q.type as q_type, qv.content
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where p_fixed_question_ids is not null
      and q.id = any(p_fixed_question_ids::uuid[])
      and q.exam_id = p_exam_id         -- security: same exam only
      and q.status = 'live'
      and q.exposure_policy = any(p_exposure_policies)
      and q.quality_tier <> 'quarantine'
    order by random()
    limit p_count
  ),
  priority_picks as (
    select q.id as question_id, q.current_version_id, q.type as q_type, qv.content
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where p_fixed_question_ids is null
      and q.exam_id = p_exam_id
      and q.status = 'live'
      and q.exposure_policy = any(p_exposure_policies)
      and q.quality_tier <> 'quarantine'
      and case p_min_quality_tier
            when 'gold'   then q.quality_tier = 'gold'
            when 'silver' then q.quality_tier in ('gold', 'silver')
            else true
          end
    order by
      case q.quality_tier when 'gold' then 1 when 'silver' then 2 else 3 end,
      random()
    limit p_count
  )
  select * from fixed_picks
  union all
  select * from priority_picks
  limit p_count;
$$;

revoke all on function public.select_benchmark_questions(uuid, int, text, text[], text[]) from public;
```

Updated `start_test_session` in the same migration — add `benchmark/mock` branch.

**Critical ordering constraint (same metadata desync fix as TSP-037):** For benchmark/mock, `v_selection_mode` depends on whether the template is fixed. This requires resolving `v_fixed_qids` **before** the `INSERT INTO test_sessions`. The entire pre-INSERT block must be:

```sql
-- Declare at top of function (add to existing declare block):
--   v_fixed_qids text[] := null;

-- ── Pre-INSERT: resolve fixed template + determine final v_selection_mode ──

-- For benchmark/mock: read template config to determine fixed vs gold-priority
if p_type in ('benchmark', 'mock') and p_template_id is not null then
  select
    case
      when (config ->> 'selectionMode') = 'fixed'
           and jsonb_typeof(config -> 'questionIds') = 'array'
      then array(
        select value::text
        from jsonb_array_elements_text(config -> 'questionIds')
      )
      else null
    end
  into v_fixed_qids
  from public.test_templates
  where id = p_template_id;
end if;

-- Now expand the CASE to cover all types (replaces the existing 2-way CASE
-- introduced in migration 001 — this migration 002 replaces start_test_session again):
v_selection_mode := case p_type
  when 'diagnostic' then 'diagnostic_weighted'
  when 'topic'      then 'topic_practice_balanced'
  when 'benchmark'  then case when v_fixed_qids is not null
                              then 'benchmark_fixed_template'
                              else 'benchmark_gold_priority' end
  when 'mock'       then case when v_fixed_qids is not null
                              then 'benchmark_fixed_template'
                              else 'benchmark_gold_priority' end
  else 'minimal_live_filter'
end;

-- INSERT happens after this — metadata.selection.mode is already correct.
insert into public.test_sessions (...) values (...);
```

Then in the if/elsif chain, add (do NOT re-assign `v_selection_mode` here — it is already correct):
```sql
elsif p_type in ('benchmark', 'mock') then
  -- v_selection_mode already set above — do NOT re-assign
  for v_question in
    select * from public.select_benchmark_questions(
      p_exam_id, v_count, v_min_quality_tier, v_exposure_policies, v_fixed_qids
    )
  loop
    v_sequence := v_sequence + 1;
    insert into public.session_questions (..., selected_by_reason)
    values (..., v_selection_mode);
    ...
  end loop;
else
  -- existing random loop unchanged for concept_retest, sectional, custom
  ...
end if;
```

Re-apply `revoke all from public; grant execute to authenticated` on `start_test_session` after `create or replace`.

**Note on migration chain:** Migration 002 replaces `start_test_session` again (third time after migrations 004/005). Both `revoke` and `grant` must appear in migration 002 for the final signature. The Builder must drop the old 7-param signature if the declare block grows (adding `v_fixed_qids` does not change the external signature — param count stays at 7).

**No new TS helpers for TSP-038** — the gold-priority logic is purely in SQL. No unit tests needed (no deterministic pure logic to separate out; the SQL gold ordering is straightforwardly verified by reading the migration).

**Gate:** Standard + Database gate. `node run-migrations.js` + `node scripts/check-rpc-grants.js` (10 RPCs unchanged — both new private helpers must NOT appear).

---

#### Files the Builder will create or modify

| Action | Path |
|--------|------|
| Create | `supabase/migrations/202606010001_topic_practice_selection.sql` |
| Create | `supabase/migrations/202606010002_benchmark_selection.sql` |
| Edit | `src/lib/test-session/selection.ts` — add `computeDifficultyAllocations` + `DifficultyAllocation` type |
| Edit | `src/tests/unit/selection.test.ts` — add difficulty allocation test cases |
| Edit | `trackers/JIRA_TRACKER.csv`, `docs/process/{SESSION_STATE,CHANGELOG,HANDOFF}.md` |

No UI changes this session — the selection algorithms are backend only. The `/tests` launcher currently hardcodes `type="diagnostic"`. Exposing topic and benchmark session types in the UI is a fast-follow task after M2 closes.

---

#### Sanity focus (flag for reviewer)

1. **`select_topic_practice_questions` is private** — `revoke all from public`, no `grant execute` line. Must NOT appear in `check-rpc-grants.js` output.
2. **Difficulty allocation sums to `p_count` exactly** — `medium = count - easy - hard` is the invariant. Verify the SQL `medium_picks LIMIT` formula (`p_count - 2 * floor(p_count * 0.3)`) matches the TS `computeDifficultyAllocations` for at least count=10, 7, 3, 1.
3. **Recency exclusion uses `NOT EXISTS`** (not `NOT IN`) — safe against NULL edge cases even though question_id is NOT NULL in practice.
4. **`select_benchmark_questions` is private** — same check as item 1.
5. **Gold-priority CASE rank is correct**: `gold=1 < silver=2 < else=3` — ascending ORDER BY means gold first.
6. **Fixed template enforces `exam_id`** — the `q.exam_id = p_exam_id` filter in `fixed_picks` prevents a template with cross-exam question IDs from loading them. Sanity should confirm this line is present.
7. **`start_test_session` re-granted** after `create or replace` in BOTH migrations (001 and 002).
8. **`else` branch unchanged** — `concept_retest`, `sectional`, `custom` still reach the existing random loop. Confirm the if/elsif/else chain is exhaustive and correct.
9. **(Critical) `v_selection_mode` set BEFORE `INSERT INTO test_sessions`** — confirm migration 001 adds `'topic'` to the pre-INSERT CASE, and migration 002 expands it to cover `'benchmark'`/`'mock'` (after resolving `v_fixed_qids`). A post-INSERT assignment would silently store `'minimal_live_filter'` in `metadata.selection.mode` and create a permanent desync with `session_questions.selected_by_reason`.

---

## Current Recommended Next Task

**Session 9 plan ready for Builder.** TSP-037 then TSP-038, one commit each.

Verification: `corepack pnpm exec vitest run src/tests/unit/selection.test.ts`, then standard gate. DB gate: `node run-migrations.js` + `node scripts/check-rpc-grants.js` (10 RPCs: unchanged count — both new helpers are private). Confirm `select_topic_practice_questions` and `select_benchmark_questions` are NOT in grants checker output.

---

### 2026-06-01 - Session 9 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-037` topic practice selection and `TSP-038` benchmark/mock selection from the Session 9 Architect plan.
- Left both rows in `Review` for Sanity/browser smoke instead of `Done`.

Files changed:

- `supabase/migrations/202606010001_topic_practice_selection.sql`
- `supabase/migrations/202606010002_benchmark_selection.sql`
- `src/lib/test-session/selection.ts`
- `src/tests/unit/selection.test.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/CHANGELOG.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `computeDifficultyAllocations` with unit tests for the 30/40/30 topic-practice split and sum invariant.
- Added private `select_topic_practice_questions` with live-only filtering, quality/exposure filtering, optional topic/subtopic scope, and recency exclusion from the user's last 3 topic/concept-retest sessions.
- Updated `start_test_session` so topic sessions set `topic_practice_balanced` before `test_sessions` insert and write matching `session_questions.selected_by_reason`.
- Added private `select_benchmark_questions` with fixed-template selection and gold-priority benchmark/mock selection.
- Updated `start_test_session` so benchmark/mock sessions resolve fixed template question IDs before `test_sessions` insert and set either `benchmark_fixed_template` or `benchmark_gold_priority` in metadata and selected-question rows.
- Kept `concept_retest`, `sectional`, and `custom` on the existing live-only generic random branch.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/selection.test.ts` passed.
- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` passed after elevated rerun because the sandbox failed to spawn lint.
- `corepack pnpm test` passed.
- `corepack pnpm build` passed.
- `node --check scripts/check-rpc-grants.js` passed.
- `node run-migrations.js` applied all migrations through `202606010002_benchmark_selection.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked public RPCs.
- The grant-checker output did not include `select_topic_practice_questions` or `select_benchmark_questions`.

Dev server:

- Not started; Session 9 is backend selection logic only, with no UI route or component changes.

Git state:

- No commits were created. `git status --short` still shows the project tree as untracked alongside pre-existing deleted root docs, so staging row-sized commits would risk capturing unrelated repository state.

Sanity review focus:

- Confirm `select_topic_practice_questions` and `select_benchmark_questions` remain private: `revoke all` with no authenticated grant and no grant-checker entry.
- Confirm topic difficulty allocation matches TS for count 10, 7, 3, and 1: medium absorbs the remainder.
- Confirm recency exclusion uses `not exists`, and only the last 3 same-exam topic/concept-retest sessions are considered.
- Confirm benchmark fixed-template selection includes `q.exam_id = p_exam_id`, `q.status = 'live'`, allowed exposure policy, and non-quarantine filtering.
- Confirm benchmark gold priority sorts `gold`, then `silver`, then the remaining eligible tiers.
- Confirm `v_selection_mode` is resolved before `insert into public.test_sessions` in both new migration replacements.
- Confirm the generic else branch still handles `concept_retest`, `sectional`, and `custom`.

Next recommended step:

- Sanity Test reviews Session 9 and either marks `TSP-037`/`TSP-038` ready for browser smoke or hands back exact findings.

---

### 2026-06-01 - Session 9 Sanity Review (M2) - Architect (Claude Sonnet 4.6)

Reviewed all four changed files (`202606010001_topic_practice_selection.sql`, `202606010002_benchmark_selection.sql`, `selection.ts`, `selection.test.ts`) against all nine sanity focus items.

**Overall: PASS on code. No blocking findings.** TSP-037 and TSP-038 correctly sit in `Review` — the only gap to `Done` is browser/student smoke.

**Focus 1 — `select_topic_practice_questions` is private: PASS.** Migration 001 line 458: `revoke all on function ... from public`. No `grant execute` follows for this function. Grant checker confirmed absent from output per Builder. ✅

**Focus 2 — Difficulty allocation sums to `p_count` exactly: PASS.** SQL: `easy = floor(p_count*0.3)`, `hard = floor(p_count*0.3)`, `medium = p_count - 2*floor(p_count*0.3)`. Algebraic identity confirms sum = p_count. TS: identical formula. Verified for count=10→{3,4,3}, 7→{2,3,2}, 3→{0,3,0}, 1→{0,1,0}. Unit test's loop (counts 1–20) provides exhaustive coverage. ✅

**Focus 3 — Recency exclusion uses `NOT EXISTS`: PASS.** Migration 001 lines 59–63: `and not exists (select 1 from recently_seen rs where rs.question_id = q.id)`. No `NOT IN`. ✅

**Focus 4 — `select_benchmark_questions` is private: PASS.** Migration 002 line 473: `revoke all on function ... from public`. No `grant execute` for this function. ✅

**Focus 5 — Gold-priority CASE rank correct: PASS.** Migration 002 lines 55–57: `case q.quality_tier when 'gold' then 1 when 'silver' then 2 else 3 end, random()`. Ascending ORDER BY means gold first, then silver, then bronze. ✅

**Focus 6 — Fixed template enforces `exam_id`: PASS.** Migration 002 line 30: `and q.exam_id = p_exam_id` present in `fixed_picks`. Defense-in-depth: template validation at lines 121–128 also enforces `exam_id = p_exam_id` before `v_fixed_qids` is populated. ✅

**Focus 7 — `start_test_session` re-granted in both migrations: PASS.** Migration 001 lines 459–461: `revoke all ... from public; grant execute ... to authenticated`. Migration 002 lines 474–476: same. ✅

**Focus 8 — `else` branch unchanged: PASS.** Migration 002 if/elsif/else chain: `diagnostic` → `topic` → `in ('benchmark','mock')` → `else`. `concept_retest`, `sectional`, `custom` all fall through to `else` with `'minimal_live_filter'` (set in the pre-INSERT CASE). ✅

**Focus 9 — `v_selection_mode` set BEFORE `INSERT INTO test_sessions`: PASS.** This was the critical bug fixed during planning. Migration 001: `v_selection_mode` CASE at lines 166–170 adds `when 'topic' then 'topic_practice_balanced'` before the INSERT at line 215. Migration 002: `v_fixed_qids` resolved at lines 131–145, then `v_selection_mode` CASE (now covering benchmark/mock) at lines 147–159, then INSERT at line 190. Confirmed line ordering: 142 (`v_fixed_qids`) → 147 (`v_selection_mode`) → 190 (`INSERT`). No post-INSERT mode assignment for any new type. ✅

**Three beyond-spec commends:**
- **`coalesce(started_at, created_at)`** in `recent_sessions` ORDER BY (migration 001 line 27) — handles sessions where `started_at` is NULL, making the ordering robust for all session states.
- **`coalesce(p_exposure_policies, array['practice'])`** in `eligible` and benchmark CTEs — defensive NULL handling on the exposure policies parameter.
- **Dual selection_mode check** in template resolution (migration 002 line 134): `selection_mode = 'fixed' or config ->> 'selectionMode' = 'fixed'` checks both the `test_templates.selection_mode` column and the JSON config field. More robust than the plan's spec which only specified the JSONB field.

**Non-blocking notes:**
- **N15:** `fixed_picks` in `select_benchmark_questions` does not apply `p_min_quality_tier` — only `quality_tier <> 'quarantine'` is enforced. If a fixed template contains silver questions but the caller requests `p_min_quality_tier='gold'`, those silver questions still appear. Intentional behavior (fixed templates override tier filtering), but worth documenting in DECISIONS.md on a cleanup pass.
- **N16 (cosmetic):** Migration 001's `v_selection_mode` initial CASE still falls through to `'minimal_live_filter'` for benchmark/mock. This is correct because migration 002 immediately replaces `start_test_session` with the full version — both migrations are applied atomically in sequence.

**M2 selection suite is complete.** All three selection algorithms (diagnostic weighted, topic practice balanced, benchmark gold-priority) are live and DB-verified. TSP-037 and TSP-038 in `Review`, awaiting browser/student smoke.

---

## Current Recommended Next Task

**Session 10 Builder pass completed.** TSP-051, TSP-052, and TSP-128 are in `Review` after local verification — TypeScript-only, no migration.

**Verification gate:** `corepack pnpm exec vitest run src/tests/unit/marking-rules.test.ts`, then standard gate (`typecheck + lint + test + build`) passed. No DB gate this session.

---

### 2026-06-01 - Session 10 Plan (M3 first slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M3 Scoring & Learning Model — first TypeScript layer slice.

**Scope:** TSP-051 (marking rules engine) + TSP-052 (answer evaluation by type) + TSP-128 (scoring unit tests). All three land in `Review`; no browser smoke gate — these are pure TypeScript modules verified by unit tests.

**Why now:** M2 remaining rows (TSP-032/033 Phase 1.5, TSP-028 parked on founder decision) are deferred. The existing `submit_test_session` SQL handles authoritative scoring, but the TypeScript layer is incomplete: `statement` and `assertion` types fall through implicitly, match evaluation is order-sensitive, and there is no `buildMarkingRuleFromManifest` bridge from exam manifest data. This session builds the proper TypeScript scoring module as specified in the TRD (`src/lib/scoring/`).

**What already exists (do NOT break):**
- `src/lib/test-session/scoring.ts` — basic `MarkingRule`, `evaluateAnswer`, `scoreAnswer`, `scoreSession`; imported only by `src/tests/unit/scoring.test.ts`. Keep this file unchanged for backward compat. New module is additive.
- SQL `score_session_answer_correct` — authoritative for production. MCQ/MSQ use sorted array comparison (order-independent). Match uses `p_selected_answer -> 'pairs' = p_content -> 'pairs'` (order-sensitive — known gap N17).

---

#### Architecture decisions

1. **New directory `src/lib/scoring/`** — TRD target structure; three new files, no edits to existing files.
2. **`MarkingRule.noNegativeForTypes?: string[]`** — optional per-type override. If a type appears in this list, wrong answers return `0` instead of negative marks. Defaults to `undefined` (all types attract negative marking). Useful for exams that exempt integer or match types from negative marking.
3. **`buildMarkingRuleFromManifest(marking: unknown): MarkingRule`** — reads `marksPerCorrect` and `negativeMarkingFraction` from an exam manifest marking object. Validates using regex `/^[0-9]+(\.[0-9]+)?$/` — matching the SQL regex exactly (`'^[0-9]+(\.[0-9]+)?$'`). Accepts both `number` and `string` representations. Returns `DEFAULT_MARKING_RULE` on any invalid or missing input.
4. **`evaluateAnswer` for `statement` and `assertion`** — explicit branch, not a fallthrough. Both types use `correct_options` (same logic as MCQ). Explicit branch avoids future confusion if content schema diverges.
5. **`evaluateAnswer` for `match`** — **order-independent**: sort both pairs arrays by `JSON.stringify(pair)` before comparing. This diverges from the SQL which uses direct JSONB equality (order-sensitive). The TypeScript side is the correct behavior; SQL alignment is noted as N17 and deferred.
6. **`evaluateAnswer` for `msq`** — explicit all-or-nothing: `sorted(correct_options)` must equal `sorted(selected_options)` exactly. Partial selection is `false`.
7. **`DEFAULT_MARKING_RULE`** in the new module must equal `{marksPerCorrect:2, negativeMarkingFraction:0.33}` — no regression from the existing module.

---

#### Files the Builder will create

| Action | Path |
|--------|------|
| Create | `src/lib/scoring/marking-rules.ts` |
| Create | `src/lib/scoring/answer-eval.ts` |
| Create | `src/lib/scoring/score-session.ts` |
| Create | `src/tests/unit/marking-rules.test.ts` |
| Edit | `trackers/JIRA_TRACKER.csv`, `docs/process/{SESSION_STATE,CHANGELOG,HANDOFF}.md` |

No SQL migrations. No changes to `src/lib/test-session/scoring.ts` or `src/tests/unit/scoring.test.ts`.

---

#### Exact API

**`src/lib/scoring/marking-rules.ts`**

```typescript
export type MarkingRule = {
  marksPerCorrect: number;
  negativeMarkingFraction: number;
  noNegativeForTypes?: string[];
};

export type AnswerEvaluation = {
  attempted: boolean;
  isCorrect: boolean | null;
  marksAwarded: number;
};

export const DEFAULT_MARKING_RULE: MarkingRule = {
  marksPerCorrect: 2,
  negativeMarkingFraction: 0.33,
};

// Returns AnswerEvaluation from a pre-computed isCorrect boolean (or null for skipped).
// Checks noNegativeForTypes before applying negative marks.
export function applyMarkingRule(
  type: string,
  isCorrect: boolean | null,
  rule?: MarkingRule
): AnswerEvaluation;

// Reads marksPerCorrect, negativeMarkingFraction, and noNegativeForTypes from an
// exam manifest marking block.
// Same regex as SQL: /^[0-9]+(\.[0-9]+)?$/ (NOTE: dot must be escaped — /\.[0-9]+/)
// Falls back to DEFAULT_MARKING_RULE for any invalid/missing numeric fields.
// noNegativeForTypes is optional; only set on the result if present and a valid string[].
export function buildMarkingRuleFromManifest(marking: unknown): MarkingRule;
```

**`src/lib/scoring/answer-eval.ts`**

```typescript
// Evaluates correctness for all 6 question types:
//   mcq         — single-choice: correct_options must have length=1; if selected has
//                 length>1 return null (malformed, treat as unattempted not penalised);
//                 if correct_options length!=1 return false (content integrity error)
//   msq         — all-or-nothing; sorted selected.options must equal sorted correct_options
//   integer     — numeric equality; accepts string or number in both content + answer
//   statement   — same single-choice logic as mcq (uses correct_options)
//   assertion   — same single-choice logic as mcq (uses correct_options)
//   match       — order-independent: sort both pairs arrays by JSON.stringify before comparing
// Returns null (skipped) if:
//   - selectedAnswer is null/empty
//   - content does not have the expected field for the type
//   - selected value cannot be parsed to valid type
//   - mcq/statement/assertion receives selectedOptions.length > 1 (malformed, no penalty)
export function evaluateAnswer(
  type: string,
  content: unknown,
  selectedAnswer: unknown
): boolean | null;
```

**`src/lib/scoring/score-session.ts`**

```typescript
import { evaluateAnswer } from "./answer-eval";
import { applyMarkingRule, MarkingRule, AnswerEvaluation, DEFAULT_MARKING_RULE } from "./marking-rules";

export type ScoredQuestionInput = {
  questionId: string;
  topicId?: string | null;
  type: string;
  content: unknown;
  selectedAnswer: unknown;
};

export type SessionScoreSummary = {
  score: number;
  maxScore: number;
  accuracy: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  topicScores: Record<string, {
    score: number; maxScore: number;
    attempted: number; correct: number; incorrect: number; skipped: number;
  }>;
};

// Combines evaluateAnswer + applyMarkingRule for a single question.
export function scoreQuestion(
  type: string,
  content: unknown,
  selectedAnswer: unknown,
  rule?: MarkingRule
): AnswerEvaluation;

// Aggregates a full session using scoreQuestion per row, groups by topicId.
export function scoreSession(
  questions: ScoredQuestionInput[],
  rule?: MarkingRule
): SessionScoreSummary;
```

---

#### Required test cases for `marking-rules.test.ts` (TSP-128)

**`evaluateAnswer` — all 6 types × correct/wrong/skipped:**

| type | scenario | expected |
|------|----------|----------|
| mcq | correct option | `true` |
| mcq | wrong option | `false` |
| mcq | null answer | `null` |
| msq | all correct options (order reversed) | `true` |
| msq | partial options only | `false` |
| msq | null answer | `null` |
| integer | matching integer (string representation) | `true` |
| integer | wrong value | `false` |
| integer | null answer | `null` |
| statement | correct option (same as mcq) | `true` |
| statement | wrong option | `false` |
| assertion | correct option | `true` |
| assertion | null answer | `null` |
| match | pairs in reversed order vs content | `true` (order-independent) |
| match | wrong pairs | `false` |
| match | no pairs field in answer | `null` |

**`applyMarkingRule`:**
- correct answer → `marksAwarded = marksPerCorrect` ✅
- wrong answer → `marksAwarded = -(negativeMarkingFraction * marksPerCorrect)` ✅
- skipped (null) → `{attempted:false, isCorrect:null, marksAwarded:0}` ✅
- wrong answer with type in `noNegativeForTypes` → `marksAwarded = 0` ✅

**`buildMarkingRuleFromManifest`:**
- valid object `{marksPerCorrect:"3", negativeMarkingFraction:"0.25"}` → applies both values ✅
- valid object with numbers (not strings) → applies both values ✅
- null, undefined, non-object → returns `DEFAULT_MARKING_RULE` ✅
- object with invalid string values (e.g., `"abc"`) → falls back to `DEFAULT_MARKING_RULE` ✅
- object with `noNegativeForTypes: ["integer"]` → result includes `noNegativeForTypes:["integer"]` ✅
- object with `noNegativeForTypes: [1, "integer"]` (mixed array) → field is ignored (not a valid string[]) ✅
- object with `noNegativeForTypes: null` → field is ignored ✅

**`scoreSession`:**
- 3-question session (correct MCQ + wrong integer + skipped MSQ): score, accuracy, topic breakdown verified ✅

---

#### Sanity focus items (11)

1. All 6 question types have explicit `evaluateAnswer` test cases — not just MCQ and integer.
2. Match comparison is order-independent — test: answer `{pairs:[["B","2"],["A","1"]]}` vs content `{pairs:[["A","1"],["B","2"]]}` must return `true`.
3. MSQ all-or-nothing — `correct_options:[1,3]` + selected `{options:[1]}` (partial) returns `false`.
4. `noNegativeForTypes` — wrong answer on a type in this list returns `marksAwarded:0`, not negative marks.
5. `buildMarkingRuleFromManifest` validates with regex matching SQL (`/^[0-9]+(\.[0-9]+)?$/`); **the dot must be escaped** (`\.`). Negative numbers or letters fall back to default.
6. `buildMarkingRuleFromManifest` handles both `number` and `string` `marksPerCorrect` values (JSON manifests may arrive as either).
7. `DEFAULT_MARKING_RULE` in the new module = `{marksPerCorrect:2, negativeMarkingFraction:0.33}` — no regression.
8. Skipped answer (null) returns `{attempted:false, isCorrect:null, marksAwarded:0}` for **all 6 types** — no type can return negative marks for a skip.
9. New files do NOT import from `@/lib/test-session/scoring` — no circular dependency between old and new scoring modules.
10. **`buildMarkingRuleFromManifest` parses `noNegativeForTypes`** — if present and a valid `string[]`, it is included in the returned rule. Mixed arrays (e.g. `[1, "integer"]`) or non-array values are silently ignored, not an error.
11. **MCQ/statement/assertion single-choice malformed selection returns `null`, not `false`** — `selectedOptions.length > 1` is treated as unattempted (no penalty). `correctOptions.length !== 1` returns `false` (content integrity error). Test both edges explicitly.

**Non-blocking note N17 (document, don't fix):** SQL `score_session_answer_correct` uses `p_selected_answer -> 'pairs' = p_content -> 'pairs'` for match — JSONB array equality is order-sensitive in Postgres. TypeScript new impl is order-independent. These diverge. SQL should be fixed in a future session (add a sort-and-compare approach, e.g., using `jsonb_agg(... order by ...)` on unnested pairs).

---

### 2026-06-01 - Session 10 Builder Handoff - Codex

Scope completed locally:

- Implemented `TSP-051`, `TSP-052`, and `TSP-128` from the revised Session 10 Architect plan.
- Kept the existing `src/lib/test-session/scoring.ts` and `src/tests/unit/scoring.test.ts` unchanged for backward compatibility.
- No SQL migrations, grant changes, or browser routes were added.

Files changed:

- `src/lib/scoring/marking-rules.ts`
- `src/lib/scoring/answer-eval.ts`
- `src/lib/scoring/score-session.ts`
- `src/tests/unit/marking-rules.test.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/CHANGELOG.md`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Added the new TRD-target `src/lib/scoring/` layer with marking rules, answer evaluation, and session aggregation split across the planned files.
- `buildMarkingRuleFromManifest` accepts numeric strings and numbers using `/^[0-9]+(\.[0-9]+)?$/`, rejects invalid/negative numeric inputs to the default rule, and includes `noNegativeForTypes` only when it is a valid `string[]`.
- `applyMarkingRule` returns zero for skipped answers and suppresses negative marks for wrong answers when the question type is listed in `noNegativeForTypes`.
- `evaluateAnswer` now has explicit branches for all six supported types: `mcq`, `msq`, `integer`, `statement`, `assertion`, and `match`.
- `match` evaluation is order-independent by sorting pair arrays with `JSON.stringify(pair)` before comparison.
- `mcq`/`statement`/`assertion` malformed multi-option selections return `null` so they are treated as unattempted, while malformed content with multiple correct options returns `false`.
- Added unit coverage for all revised Session 10 sanity focus items, including all six type skips, `noNegativeForTypes`, manifest parsing, MSQ all-or-nothing, order-independent match, and session/topic aggregation.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/marking-rules.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.

Dev server:

- Not started; Session 10 is a TypeScript scoring module/test slice with no UI route or component changes.

Git state:

- No commits were created. `git status --short` still shows the project tree as untracked alongside pre-existing deleted root docs, so staging row-sized commits would risk capturing unrelated repository state.

Sanity review focus:

- Confirm new files do not import from `@/lib/test-session/scoring`.
- Confirm all six question types have explicit tests and `null` skips produce `{attempted:false,isCorrect:null,marksAwarded:0}`.
- Confirm match comparison is order-independent.
- Confirm MSQ partial selection is wrong, not partial credit.
- Confirm `noNegativeForTypes` both parses from valid manifest input and suppresses negative marks.
- Confirm the manifest number regex escapes the decimal dot and rejects negative/letter/scientific-style strings.
- Confirm malformed single-choice selected answers with multiple options return `null`, while multiple correct options in content return `false`.

Next recommended step:

- Sanity Test reviews Session 10 and either marks `TSP-051`/`TSP-052`/`TSP-128` ready for `Done` or hands back exact findings.

---

### 2026-06-01 - Session 10 Sanity Review (M3) - Architect (Claude Sonnet 4.6)

Reviewed all four new files (`marking-rules.ts`, `answer-eval.ts`, `score-session.ts`, `marking-rules.test.ts`) against all 11 sanity focus items.

**Overall: PASS on code. No blocking findings.** TSP-051/052/128 are pure TypeScript with full unit-test coverage and no DB gate — these rows can move to `Done` immediately upon Sanity pass.

**Focus 1 — All 6 types have explicit test cases: PASS.** `marking-rules.test.ts` has dedicated `it()` blocks for mcq (lines 16–22), msq (lines 24–28), integer (lines 30–34), statement (lines 36–42), assertion (lines 44–50), match (lines 52–68). The loop test at lines 70–87 additionally covers all 6 types with null answers via `scoreQuestion`. ✅

**Focus 2 — Match is order-independent: PASS.** `evaluateMatch` uses `sortByJson` (sorts array elements by `JSON.stringify`) then `arraysEqual` with `stableJson` normalize. Test line 53–60: `{pairs:[["B","2"],["A","1"]]}` vs `{pairs:[["A","1"],["B","2"]]}` → `true`. Early length check (line 95–97) provides fast-fail before sort. ✅

**Focus 3 — MSQ all-or-nothing: PASS.** `evaluateMsq` uses `arraysEqual(sortNumbers(selectedOptions), sortNumbers(correctOptions))`. Test line 26: `correct:[1,3]` + `selected:{options:[1]}` → `false`. Order-reversed correct match tested at line 25. ✅

**Focus 4 — `noNegativeForTypes` suppresses negative marks: PASS.** `applyMarkingRule` checks `rule.noNegativeForTypes?.includes(type)` (line 41); if true, `marksAwarded: 0` instead of negative. Test lines 114–124: wrong `integer` with `noNegativeForTypes:["integer"]` → `{marksAwarded:0}`. ✅

**Focus 5 — Regex dot is escaped: PASS.** Line 18: `const MANIFEST_NUMBER_PATTERN = /^[0-9]+(\.[0-9]+)?$/` — `\.` is escaped. Test confirms `"-3"` (line 161–163) and `"0x1"` (line 165–169) both fall back to `DEFAULT_MARKING_RULE`. ✅

**Focus 6 — Accepts both number and string representations: PASS.** `parseManifestNumber` has explicit `typeof value === "number"` and `typeof value === "string"` branches. Test lines 138–145: `{marksPerCorrect:4, negativeMarkingFraction:0.5}` (numbers) applies correctly. String test at lines 127–136. ✅

**Focus 7 — DEFAULT_MARKING_RULE unchanged: PASS.** Lines 13–16: `{marksPerCorrect:2, negativeMarkingFraction:0.33}`. Test at lines 91–96 asserts exact match. No `noNegativeForTypes` field on the default. ✅

**Focus 8 — Skipped returns `{attempted:false, isCorrect:null, marksAwarded:0}` for all 6 types: PASS.** Loop test at lines 70–87 calls `scoreQuestion(type, content, null, markingRule)` for every type and asserts the exact shape. The `applyMarkingRule` null branch (lines 25–31) is the single return path — no type can override it. ✅

**Focus 9 — No import from `@/lib/test-session/scoring`: PASS.** Grep confirmed zero matches in `src/lib/scoring/`. `score-session.ts` only imports from `./answer-eval` and `./marking-rules`. ✅

**Focus 10 — `buildMarkingRuleFromManifest` parses `noNegativeForTypes`: PASS.** `isStringArray` type predicate (lines 99–101) + conditional assignment (lines 69–71). Tests: valid `["integer"]` included (lines 174–182); mixed array `[1,"integer"]` ignored (lines 185–194); `null` ignored (lines 196–205). ✅

**Focus 11 — MCQ/statement/assertion single-choice edge cases: PASS.** `evaluateSingleChoice` (lines 21–45): `selectedOptions.length > 1` → `null` (line 36–38); `correctOptions.length !== 1` → `false` (lines 40–42). Tests confirm both: multi-select answer → `null` (lines 20, 40, 48); multi-correct content → `false` (lines 21, 41, 49). ✅

**Four beyond-spec commends:**
- **`parseManifestNumber` also regex-validates numeric inputs** — converts number to string and tests against the pattern, catching negative numbers like `-3.0` even when passed as a JS number. This is more defensive than the SQL (which only applies the regex to string JSON values).
- **`evaluateMatch` early length comparison** before sort-and-compare — O(1) fast-fail when pair counts differ, avoids the O(n log n) sort entirely in the common mismatch case.
- **Generic `arraysEqual<T>` with normalize callback** — used with `stableJson` for match pairs and with identity for number arrays. DRY without sacrificing clarity.
- **`scoreSession` sets `maxScore` once at initialization** — the old `test-session/scoring.ts` redundantly reassigned `summary.maxScore` inside the question loop. New version is clean.

**Non-blocking notes:**
- **N18 (cosmetic):** `evaluateMatch` with `question.pairs = []` and `selected.pairs = []` returns `true` (both empty, lengths equal, `arraysEqual([], [])` = `true`). Harmless in practice — zero-pair match questions will never reach the DB.
- **N17 (carried forward):** SQL `score_session_answer_correct` match comparison is still order-sensitive. TypeScript new impl is order-independent. Alignment deferred to a future session.

**TSP-051, TSP-052, TSP-128 → Done.** No browser smoke gate for pure TypeScript modules. The M3 scoring TypeScript layer is complete and fully unit-tested.

---

## Current Recommended Next Task

**Session 11 Sanity PASS. TSP-053 and TSP-054 are Done.** Next session: TSP-055 — mastery update job. Requires creating `mastery_records` table (does not exist yet) and an UPDATE path from `session_results` to update topic/concept mastery after submit. Architect must read ROADMAP.md and FINAL_TRD Section 12.1 before planning.

---

### 2026-06-01 - Session 11 Plan (M3 second slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M3 Scoring & Learning Model — result aggregates + strategy metrics.

**Scope:** TSP-053 (compute result aggregates: concept_scores, difficulty_scores, source_scores) + TSP-054 (compute strategy metrics). Both land in `Review`; DB gate required.

**What already exists:**
- `session_results` table (created in `202605300001_test_sessions.sql`) with: `score`, `max_score`, `accuracy`, `attempted`, `correct`, `incorrect`, `skipped`, `duration_sec`, `topic_scores`, `concept_scores`, `strategy_metrics` — but no `difficulty_scores` or `source_scores` columns.
- `submit_test_session` (in `202605310001_test_session_engine.sql`) currently: loops through session_questions, scores each answer, accumulates `topic_scores`, inserts into `session_results`. Does NOT compute concept_scores, difficulty_scores, source_scores, or strategy_metrics — these columns are null after every submit.
- `question_concepts (question_id, concept_id, relevance)` — exists, populated as questions are tagged.
- `questions.difficulty` is NOT NULL CHECK `('easy','medium','hard')`.
- `questions.source` is NOT NULL CHECK `('pyq','ai_generated','manual','vision_ingested')`.
- `session_answers.confidence`, `.time_spent_sec`, `.revisit_count`, `.marks_awarded`, `.is_correct` — populated by submit loop (is_correct/marks_awarded written in the loop; confidence/time/revisit_count written by the autosave path before submit).
- `mastery_records` table does NOT exist yet — TSP-055 creates it (Session 12).

---

#### Architecture decisions

1. **Add `difficulty_scores` and `source_scores` columns** via `ALTER TABLE public.session_results ADD COLUMN IF NOT EXISTS … jsonb`. Two new nullable JSONB columns, additive and re-runnable. Better than packing them into `strategy_metrics` (wrong semantics) or `concept_scores` (wrong key space).
2. **Expand the submit loop SELECT** to include `q.difficulty`, `q.source` — both NOT NULL, no COALESCE needed. Accumulate `v_difficulty_scores` and `v_source_scores` inside the loop using the same `jsonb_set` pattern as `v_topic_scores`.
3. **concept_scores computed POST-loop** via a separate aggregate query on `question_concepts` + updated `session_answers`. After the loop sets `is_correct` and `marks_awarded` on every session_answer, the concept aggregate can read those updated values in the same transaction.
4. **strategy_metrics computed POST-loop** via a single aggregate SELECT on `session_answers` (same timing — loop must complete first). Includes: `negativeMarksLost`, `highConfidenceWrong`, `correctGuessed`, `totalRevisits`, `timeOnWrongSec`, `timeOnSkippedSec`.
5. **ON CONFLICT DO UPDATE** must include all four new fields. Omitting any one means a re-submitted session loses that data.
6. **TypeScript `computeStrategyMetrics`** — pure function mirroring the SQL logic, useful for client-side preview and unit-testable without a DB.

---

#### Files the Builder will create or modify

| Action | Path |
|--------|------|
| Create | `supabase/migrations/202606010003_result_aggregates.sql` |
| Create | `src/lib/scoring/result-types.ts` |
| Create | `src/lib/scoring/strategy-metrics.ts` |
| Create | `src/tests/unit/strategy-metrics.test.ts` |
| Edit | `src/lib/db/schema/session.ts` — add `difficultyScores` and `sourceScores` to `sessionResults` |
| Edit | `trackers/JIRA_TRACKER.csv`, `docs/process/{SESSION_STATE,CHANGELOG,HANDOFF}.md` |

No changes to `src/lib/test-session/scoring.ts`, `src/lib/scoring/marking-rules.ts`, or `src/lib/scoring/answer-eval.ts`.

**Drizzle schema edit (`src/lib/db/schema/session.ts`):**

The `sessionResults` table definition currently has `conceptScores` and `strategyMetrics` but is missing the two new columns. Add them immediately after `topicScores` and before `conceptScores` so the order matches the migration:

```typescript
// In sessionResults pgTable definition, after topicScores line:
topicScores: jsonb("topic_scores").notNull(),
difficultyScores: jsonb("difficulty_scores"),   // add
sourceScores: jsonb("source_scores"),            // add
conceptScores: jsonb("concept_scores"),
strategyMetrics: jsonb("strategy_metrics"),
```

These are nullable JSONB columns — no `.notNull()`, no default. Matches the `ADD COLUMN IF NOT EXISTS … jsonb` in the migration.

---

#### Migration structure (`202606010003_result_aggregates.sql`)

```sql
-- Step 1: Extend session_results schema (additive, safe)
alter table public.session_results
  add column if not exists difficulty_scores jsonb,
  add column if not exists source_scores jsonb;

-- Step 2: Replace submit_test_session with expanded aggregation
create or replace function public.submit_test_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- (existing declares unchanged)
  v_difficulty_scores jsonb := '{}'::jsonb;   -- new
  v_source_scores jsonb := '{}'::jsonb;        -- new
  v_concept_scores jsonb;                      -- new (computed post-loop)
  v_strategy_metrics jsonb;                    -- new (computed post-loop)
  v_difficulty_key text;                       -- new
  v_source_key text;                           -- new
  v_difficulty_current jsonb;                  -- new
  v_source_current jsonb;                      -- new
begin
  -- (existing auth/ownership/idempotency checks unchanged)

  -- Expand the FOR loop SELECT to include q.difficulty and q.source:
  for v_row in
    select
      sq.question_id,
      q.topic_id,
      q.type,
      q.difficulty,    -- new
      q.source,        -- new
      qv.content,
      sa.id as answer_id,
      sa.selected_answer
    from public.session_questions sq
    join public.questions q on q.id = sq.question_id
    join public.question_versions qv on qv.id = sq.question_version_id
    left join public.session_answers sa
      on sa.session_id = sq.session_id and sa.question_id = sq.question_id
    where sq.session_id = p_session_id
    order by sq.sequence
  loop
    -- (existing scoring logic unchanged)

    -- Accumulate difficulty_scores (same jsonb_set pattern as topic_scores):
    v_difficulty_key := coalesce(v_row.difficulty, 'unknown');
    v_difficulty_current := coalesce(
      v_difficulty_scores -> v_difficulty_key,
      jsonb_build_object('score',0,'maxScore',0,'attempted',0,'correct',0,'incorrect',0,'skipped',0)
    );
    v_difficulty_scores := jsonb_set(
      v_difficulty_scores, array[v_difficulty_key],
      jsonb_build_object(
        'score',     (v_difficulty_current->>'score')::numeric + v_marks_awarded,
        'maxScore',  (v_difficulty_current->>'maxScore')::numeric + v_marks_per_correct,
        'attempted', (v_difficulty_current->>'attempted')::int + case when v_is_correct is null then 0 else 1 end,
        'correct',   (v_difficulty_current->>'correct')::int + case when v_is_correct then 1 else 0 end,
        'incorrect', (v_difficulty_current->>'incorrect')::int + case when v_is_correct = false then 1 else 0 end,
        'skipped',   (v_difficulty_current->>'skipped')::int + case when v_is_correct is null then 1 else 0 end
      ), true
    );

    -- Accumulate source_scores (same pattern):
    v_source_key := coalesce(v_row.source, 'unknown');
    -- ... same jsonb_set pattern as difficulty_scores ...
  end loop;

  -- ── Post-loop: concept_scores ────────────────────────────────────────────
  select jsonb_object_agg(
    qc.concept_id::text,
    jsonb_build_object(
      'score',     coalesce(sum(sa.marks_awarded), 0),
      'maxScore',  count(*) * v_marks_per_correct,
      'attempted', count(*) filter (where sa.is_correct is not null),
      'correct',   count(*) filter (where sa.is_correct = true),
      'incorrect', count(*) filter (where sa.is_correct = false),
      'skipped',   count(*) filter (where sa.is_correct is null)
    )
  )
  into v_concept_scores
  from public.session_questions sq
  join public.question_concepts qc on qc.question_id = sq.question_id
  left join public.session_answers sa
    on sa.session_id = sq.session_id and sa.question_id = sq.question_id
  where sq.session_id = p_session_id
  group by qc.concept_id;   -- NOTE: the GROUP BY is inside the jsonb_object_agg CTE

  -- ── Post-loop: strategy_metrics ─────────────────────────────────────────
  select jsonb_build_object(
    'negativeMarksLost',  coalesce(sum(case when is_correct = false then abs(marks_awarded) else 0 end), 0),
    'highConfidenceWrong', count(*) filter (where confidence = 'sure' and is_correct = false),
    'correctGuessed',      count(*) filter (where confidence = 'guessed' and is_correct = true),
    'totalRevisits',       coalesce(sum(revisit_count), 0),
    'timeOnWrongSec',      coalesce(sum(case when is_correct = false then time_spent_sec else 0 end), 0),
    'timeOnSkippedSec',    coalesce(sum(case when is_correct is null then time_spent_sec else 0 end), 0)
  )
  into v_strategy_metrics
  from public.session_answers
  where session_id = p_session_id;

  -- ── Insert / upsert session_results ─────────────────────────────────────
  insert into public.session_results (
    session_id, user_id, exam_id,
    score, max_score, accuracy,
    attempted, correct, incorrect, skipped,
    duration_sec, topic_scores,
    difficulty_scores, source_scores,  -- new
    concept_scores, strategy_metrics   -- new
  ) values (
    ...,
    v_difficulty_scores, v_source_scores,
    v_concept_scores, v_strategy_metrics
  )
  on conflict (session_id) do update set
    ...,
    difficulty_scores = excluded.difficulty_scores,  -- new
    source_scores = excluded.source_scores,          -- new
    concept_scores = excluded.concept_scores,        -- new
    strategy_metrics = excluded.strategy_metrics;    -- new

  -- (existing status update and return unchanged)
end;
$$;

revoke all on function public.submit_test_session(uuid) from public;
grant execute on function public.submit_test_session(uuid) to authenticated;
```

**Builder note on concept_scores SQL:** The `jsonb_object_agg` with a `GROUP BY` inside needs a CTE form. The correct pattern is:
```sql
with concept_agg as (
  select
    qc.concept_id::text as concept_key,
    coalesce(sum(sa.marks_awarded), 0) as score,
    count(*) * v_marks_per_correct as max_score,
    count(*) filter (where sa.is_correct is not null) as attempted,
    count(*) filter (where sa.is_correct = true) as correct_count,
    count(*) filter (where sa.is_correct = false) as incorrect_count,
    count(*) filter (where sa.is_correct is null) as skipped_count
  from public.session_questions sq
  join public.question_concepts qc on qc.question_id = sq.question_id
  left join public.session_answers sa
    on sa.session_id = sq.session_id and sa.question_id = sq.question_id
  where sq.session_id = p_session_id
  group by qc.concept_id
)
select jsonb_object_agg(
  concept_key,
  jsonb_build_object('score', score, 'maxScore', max_score,
    'attempted', attempted, 'correct', correct_count,
    'incorrect', incorrect_count, 'skipped', skipped_count)
)
into v_concept_scores
from concept_agg;
-- v_concept_scores is null if no concept links exist — that is fine (column is nullable)
```

---

#### TypeScript types (`src/lib/scoring/result-types.ts`)

```typescript
export type TopicScore = {
  score: number;
  maxScore: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
};

export type DifficultyScores = {
  easy?: TopicScore;
  medium?: TopicScore;
  hard?: TopicScore;
};

export type SourceScores = {
  pyq?: TopicScore;
  ai_generated?: TopicScore;
  manual?: TopicScore;
  vision_ingested?: TopicScore;
};

export type ConceptScores = Record<string, TopicScore>; // conceptId → score

export type StrategyMetrics = {
  negativeMarksLost: number;
  highConfidenceWrong: number;
  correctGuessed: number;
  totalRevisits: number;
  timeOnWrongSec: number;
  timeOnSkippedSec: number;
};

export type SessionResultSummary = {
  resultId: string;
  sessionId: string;
  score: number;
  maxScore: number;
  accuracy: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  durationSec: number;
  topicScores: Record<string, TopicScore>;
  difficultyScores?: DifficultyScores;
  sourceScores?: SourceScores;
  conceptScores?: ConceptScores;
  strategyMetrics?: StrategyMetrics;
};
```

---

#### Pure TypeScript function (`src/lib/scoring/strategy-metrics.ts`)

```typescript
import type { StrategyMetrics } from "./result-types";

export type ScoredAnswerInput = {
  isCorrect: boolean | null;
  marksAwarded: number;
  confidence: "sure" | "unsure" | "guessed" | null;
  timeSpentSec: number;
  revisitCount: number;
};

export function computeStrategyMetrics(answers: ScoredAnswerInput[]): StrategyMetrics {
  // Mirrors the SQL aggregate query exactly.
  // Skipped (isCorrect=null) contributes 0 to negativeMarksLost.
  // Returns all-zero defaults for empty input.
}
```

---

#### Required test cases (`src/tests/unit/strategy-metrics.test.ts`)

- All zeroes for empty input array ✅
- `negativeMarksLost`: 2 wrong answers (marks -0.66 each) → `1.32` ✅
- Skipped (isCorrect=null) does NOT contribute to `negativeMarksLost` ✅
- `highConfidenceWrong`: confidence='sure' + isCorrect=false → counted; confidence='sure' + isCorrect=true → not counted ✅
- `correctGuessed`: confidence='guessed' + isCorrect=true → counted ✅
- `totalRevisits`: sum of all revisit_count values ✅
- `timeOnWrongSec`: sum of time_spent_sec only for isCorrect=false rows ✅
- `timeOnSkippedSec`: sum of time_spent_sec only for isCorrect=null rows ✅
- Mixed session (correct sure, wrong unsure, skipped, wrong sure-high-confidence): all fields verified together ✅

---

#### Sanity focus items (11)

1. `ALTER TABLE` uses `ADD COLUMN IF NOT EXISTS` — migration is re-runnable on an already-altered DB.
2. Loop SELECT adds `q.difficulty` and `q.source` — both NOT NULL in schema, no null risk; no COALESCE needed (but defensive COALESCE to 'unknown' is acceptable).
3. concept_scores CTE runs POST-loop — session_answers already have `is_correct` and `marks_awarded` set by the loop's UPDATE before this query executes.
4. strategy_metrics SELECT runs POST-loop — same ordering guarantee as item 3.
5. `submit_test_session` re-granted after `create or replace` — same signature `(uuid)`.
6. `computeStrategyMetrics` TypeScript: skipped (isCorrect=null) returns zero `marksAwarded` → does NOT inflate `negativeMarksLost`.
7. `computeStrategyMetrics` returns all-zero defaults for empty input (no division-by-zero, no NaN).
8. concept_scores null-safe: if no `question_concepts` rows link to session's questions, `v_concept_scores` is null; `concept_scores` column is nullable — INSERT succeeds.
9. ON CONFLICT DO UPDATE sets `difficulty_scores`, `source_scores`, `concept_scores`, `strategy_metrics` — all four new fields must appear in the SET clause.
10. `result-types.ts` and `strategy-metrics.ts` do NOT import from `@/lib/test-session/scoring` — no circular dependency.
11. **Drizzle schema sync** — `src/lib/db/schema/session.ts` `sessionResults` table has `difficultyScores: jsonb("difficulty_scores")` and `sourceScores: jsonb("source_scores")` added. `conceptScores` and `strategyMetrics` already existed; only these two are new. Verify the column order matches the migration.

---

### 2026-06-01 - Session 11 Plan Review - Observing Agent (Gemini CLI)

**Review scope:** Session 11 architect plan in HANDOFF.md.

**Finding: Critical omission (incorporated into plan above)**

- `src/lib/db/schema/session.ts` `sessionResults` table was missing `difficultyScores` and `sourceScores` Drizzle column definitions. Without this edit the migration adds the columns at the DB level but TypeScript/Drizzle type inference stays stale. Plan updated: file edit added as item 5 in the files table; sanity focus item 11 added.
- Note: `conceptScores` and `strategyMetrics` already existed in the Drizzle schema (lines 171-172) -- the observing agent's suggestion to add those was partially stale, but the two new columns were a genuine gap.

**Finding: SQL aggregation analysis (no action required)**

- Post-loop concept CTE is correct: separate aggregate after loop writes `is_correct`/`marks_awarded`; LEFT JOIN correctly treats unattempted questions as skipped.
- Zero-session fallback: `strategy_metrics` aggregate returns all-zero row for blank submit, not NULL -- protects client deserialisation.

**Finding: Parity guidance (already handled in plan)**

- SQL JSONB key casing (`negativeMarksLost`, `highConfidenceWrong`, etc.) matches TypeScript `StrategyMetrics` type exactly. Skipped (isCorrect=null) correctly excluded from `negativeMarksLost` (sanity item 6).

---

### 2026-06-01 - Session 11 Builder Handoff - Codex

Scope completed locally and live:

- Implemented `TSP-053` and `TSP-054` from the Session 11 Architect plan, including the observing-agent Drizzle schema correction.
- Opened `TSP-050` as the M3 scoring parent epic.
- Left both rows in `Review` pending Sanity review. No browser smoke gate applies to this slice.

Files changed:

- `supabase/migrations/202606010003_result_aggregates.sql`
- `src/lib/db/schema/session.ts`
- `src/lib/scoring/result-types.ts`
- `src/lib/scoring/strategy-metrics.ts`
- `src/tests/unit/strategy-metrics.test.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/CHANGELOG.md`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Added additive nullable JSONB columns `session_results.difficulty_scores` and `session_results.source_scores`.
- Replaced `submit_test_session(uuid)` with an expanded version that preserves existing auth ownership checks, idempotency, marking-rule parsing, scoring, result upsert, status transition, return shape, and grant hygiene.
- Added `q.difficulty` and `q.source` to the submit loop and accumulated `difficulty_scores` and `source_scores` using the same bucket shape as `topic_scores`.
- Added post-loop `concept_scores` via a CTE over `question_concepts` after `session_answers.is_correct` and `marks_awarded` are written.
- Added post-loop `strategy_metrics` with JSON keys `negativeMarksLost`, `highConfidenceWrong`, `correctGuessed`, `totalRevisits`, `timeOnWrongSec`, and `timeOnSkippedSec`.
- Added Drizzle schema fields `difficultyScores` and `sourceScores` in `sessionResults` immediately after `topicScores`.
- Added TypeScript result types and pure `computeStrategyMetrics` with unit coverage.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/strategy-metrics.test.ts` exited 0.
- `node --check scripts/check-rpc-grants.js` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node run-migrations.js` applied all migrations through `202606010003_result_aggregates.sql` after elevated rerun because the sandbox failed to spawn the migration runner.
- `node scripts/check-rpc-grants.js` exited 0 after migration and verified all 10 tracked public RPC grants.
- Existing live test-session smoke passed after loading `DATABASE_URL` from `.env`: start, answer save, submit, answer-key isolation, scoring, and idempotent resubmit all passed.

Dev server:

- Not started; Session 11 is a backend SQL/type/test slice with no UI route or component changes.

Git state:

- No commits were created. `git status --short` still shows the project tree as untracked alongside pre-existing deleted root docs, so staging row-sized commits would risk capturing unrelated repository state.

Sanity review focus:

- Confirm `ALTER TABLE` uses `ADD COLUMN IF NOT EXISTS`.
- Confirm `submit_test_session` re-grants execute to `authenticated` after `create or replace`.
- Confirm `concept_scores` and `strategy_metrics` are computed after the answer-scoring loop writes `session_answers.is_correct` and `marks_awarded`.
- Confirm `ON CONFLICT DO UPDATE` sets all four aggregate fields: `difficulty_scores`, `source_scores`, `concept_scores`, and `strategy_metrics`.
- Confirm `concept_scores` can be null when no concept links exist.
- Confirm `strategy_metrics.negativeMarksLost` ignores skipped answers.
- Confirm `computeStrategyMetrics([])` returns all zeroes.
- Confirm new scoring files do not import from `@/lib/test-session/scoring`.
- Confirm `src/lib/db/schema/session.ts` includes `difficultyScores` and `sourceScores` in the expected position.

Next recommended step:

- Sanity Test reviews Session 11 and either marks `TSP-053`/`TSP-054` ready for `Done` or hands back exact findings.

---

### 2026-06-01 - Session 11 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-053 + TSP-054. Files reviewed: `supabase/migrations/202606010003_result_aggregates.sql`, `src/lib/db/schema/session.ts`, `src/lib/scoring/result-types.ts`, `src/lib/scoring/strategy-metrics.ts`, `src/tests/unit/strategy-metrics.test.ts`.

**Verdict: PASS (11/11)**

| # | Focus item | Result |
|---|-----------|--------|
| 1 | `ALTER TABLE` uses `ADD COLUMN IF NOT EXISTS` | ✅ Lines 1-3 of migration |
| 2 | Loop SELECT gains `q.difficulty` + `q.source`; both NOT NULL | ✅ Lines 109-110; defensive `coalesce(...,'unknown')` harmless |
| 3 | concept_scores CTE runs post-loop (after `is_correct`/`marks_awarded` written) | ✅ Line 234, after `end loop;` at line 228 |
| 4 | strategy_metrics SELECT runs post-loop | ✅ Line 265 |
| 5 | `submit_test_session` re-granted after `create or replace` | ✅ Lines 349-350 |
| 6 | TypeScript: skipped (`isCorrect===null`) excluded from `negativeMarksLost` | ✅ `isCorrect === false` guard; SQL `CASE WHEN is_correct = false` mirrors it |
| 7 | `computeStrategyMetrics([])` returns all-zero defaults | ✅ `reduce` initial value + dedicated test |
| 8 | `concept_scores` nullable when no concept links exist | ✅ Column declared without `NOT NULL` in migration and Drizzle schema |
| 9 | ON CONFLICT DO UPDATE sets all 4 new fields | ✅ Lines 323-326 |
| 10 | No import from `@/lib/test-session/scoring` in new scoring files | ✅ `result-types.ts` has zero imports; `strategy-metrics.ts` imports only `./result-types` |
| 11 | Drizzle schema `difficultyScores`/`sourceScores` added in correct order | ✅ Lines 170-171 of session.ts; order matches migration |

**Additional notes (non-blocking):**
- `v_max_score = 0` guard raises for empty sessions — safe addition, consistent with submit semantics.
- SQL uses `abs(coalesce(marks_awarded, 0))` for nullable DB `marks_awarded`; TypeScript uses `Math.abs` on non-nullable `ScoredAnswerInput.marksAwarded` — both correct for their respective contexts.
- Mixed-session test uses `toEqual` with `negativeMarksLost: 1.32` — floating-point addition of `0.66 + 0.66` evaluates to `1.32` exactly in V8; individual test uses `toBeCloseTo` as belt-and-suspenders. Both pass.

**Tracker:** TSP-053 → Done, TSP-054 → Done.

---

### 2026-06-01 - Session 12 Plan (M3 third slice) - Architect (Claude Sonnet 4.6)

**Milestone advanced:** M3 — Scoring & Learning Model  
**Ticket:** TSP-055 — Implement mastery update job  
**Depends on:** TSP-053 (Done) — session_results.topic_scores and concept_scores exist and are populated post-submit.

---

#### Context

`mastery_records` does not exist in the live DB. TSP-055 is the first M3 learning model row — it creates the table and wires mastery updates into the post-submit path. TSP-056 (readiness score) and TSP-057 (forgetting-curve decay) depend on this table.

FINAL_TRD Section 12.1 mandates a **conservative weighted update** combining old mastery, latest accuracy, difficulty weight, confidence weight, benchmark weight, and recency weight. The formula must not overreact to a single bad session but must penalise high-confidence-wrong answers (misconception signal) strongly.

This is a **backend-only** session. No UI routes. One commit per file.

---

#### Architectural decisions locked for this session

**A. Mastery score range: 0–100.** Percentage-based, intuitive for the dashboard.

**B. Conservative blend formula: 60% old + 40% new.** Prevents wild swings. `newMastery = oldMastery * 0.6 + weightedSignal * 0.4`. On the very first attempt (no prior row) initialize from accuracy × confidence adjustment (floor ~70%).

**C. Session type weight multiplier.** Benchmark and mock sessions carry 1.5× weight; all other types carry 1.0×. This reflects TRD §12.1: "Benchmark sessions have stronger measurement weight than adaptive practice."

**D. Confidence signal weighting per answer.**  
- Correct + sure → full positive signal.  
- Correct + guessed → 0.5× signal (guessing doesn't prove mastery).  
- Wrong + sure → negative signal × 1.5 (misconception penalty; TRD §12.1: "Wrong + sure reduces mastery strongly").  
- Wrong + unsure → negative signal × 0.5.  
- Skipped → excluded from confidence aggregate.

**E. High-confidence-wrong misconception trigger.** If topic accuracy < 50% AND aggregated confidence signal > 80%, apply an additional floor-pull: `penalised = oldMastery - min(oldMastery, 1.5 * (oldMastery - topicAccuracy * 100))`. Clamped to 0–100.

**F. Stability factor.** Starts at 1.0. Increases by 0.1 (capped 2.0) when the session is a "success" (accuracy > oldMastery × 0.8). Resets to 1.0 on failure. Stored on the mastery_records row so the Session 13 forgetting-curve decay job can use it.

**G. Confidence level (metadata, not the mastery score itself).**  
- `low`: < 3 total attempts.  
- `medium`: 3–9 total attempts.  
- `high`: ≥ 10 total attempts.

**H. Unique constraint:** `(user_id, exam_id, topic_id, concept_id)`. Because the schema's CHECK enforces exactly one of `topic_id`/`concept_id` per row, this means one row per user-exam-topic and one per user-exam-concept. Upsert pattern: INSERT on first attempt, UPDATE on subsequent.

**I. Job enqueue hook (out of scope for this session — noted for Builder).** The ideal trigger is an `insert into jobs` at the end of `submit_test_session`. That touches the Session 11 RPC. For this session, Builder should implement the job handler function and the mastery computation layer; wire the enqueue hook in a follow-up or treat it as an optional bonus within the same PR if trivial. The Sanity reviewer must check whether the enqueue was wired or explicitly deferred.

---

#### Files to create or modify

| Action | Path |
|--------|------|
| Create | `supabase/migrations/202606010004_mastery_records.sql` |
| Create | `src/lib/scoring/mastery-types.ts` |
| Create | `src/lib/scoring/compute-mastery.ts` |
| Create | `src/lib/jobs/handlers/update-mastery.ts` |
| Create | `src/lib/db/schema/learning.ts` |
| Create | `src/tests/unit/compute-mastery.test.ts` |
| Edit | `src/lib/db/schema/index.ts` (export `learning` schema) |
| Edit | `trackers/JIRA_TRACKER.csv`, `docs/process/SESSION_STATE.md`, `docs/process/HANDOFF.md` |

Full plan with annotated code for each file is at `docs/SESSIONS/SESSION_12_PLAN.md`.

---

#### Migration contract (`202606010004_mastery_records.sql`)

```sql
create table if not exists mastery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  concept_id uuid references concepts(id) on delete cascade,
  mastery_score numeric not null default 0,
  confidence_level text not null default 'low'
    check (confidence_level in ('low', 'medium', 'high')),
  baseline_score numeric,
  stability_factor numeric not null default 1.0,
  questions_attempted int not null default 0,
  questions_correct int not null default 0,
  last_tested_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  ),
  unique (user_id, exam_id, topic_id, concept_id)
);
-- + indexes: mastery_user_exam, mastery_topic_query, mastery_concept_query, mastery_last_tested
-- + RLS: alter table mastery_records enable row level security
-- + policy mastery_own_rows: for all using (auth.uid() = user_id)
-- + grant select, insert, update on mastery_records to authenticated
```

**No `revoke all from public` needed here** — mastery_records is a user-owned table (RLS enforced), not a security-definer RPC. Grant is to `authenticated`, not `public`.

---

#### Computation signature

```typescript
function computeTopicMastery(
  oldMastery: number | null,         // null on first attempt
  topicAccuracy: number,             // 0–1 from topic_scores bucket
  sessionType: SessionType,          // 'benchmark' | 'mock' → 1.5x; others → 1.0x
  confidenceInTopic: number,         // 0–1 aggregated from per-answer confidence signals
  difficultyInTopic: number,         // 0–1 (easy=0.33, medium=0.67, hard=1.0)
  questionsAttempted: number,        // this session
  questionsCorrect: number,          // this session
  oldQuestionsAttempted?: number,    // from existing mastery_records row
  oldQuestionsCorrect?: number
): { masteryScore: number; confidenceLevel: ConfidenceLevel; stabilityFactor: number }
```

Pure function. No DB calls. Fully unit-testable.

---

#### Verification gate

- Standard: `corepack pnpm typecheck` + `corepack pnpm lint` + `corepack pnpm test` (includes new unit tests).
- Database gate: Migration applies with `node run-migrations.js`; `mastery_records` table exists; RLS and indexes present.
- Unit test gate: All compute-mastery tests pass (empty/first/blend/misconception/benchmark/stability/confidence-level cases).
- No dev server needed — backend-only slice.

---

#### Sanity review focus (flag for reviewer)

1. **CHECK constraint**: migration enforces exactly one of `topic_id`/`concept_id` is non-null per row. Verify the SQL CHECK matches this exactly.
2. **UNIQUE constraint**: `(user_id, exam_id, topic_id, concept_id)` — upsert pattern must use this. A NULL in either column participates in the unique index differently in PostgreSQL (NULLs are not equal); confirm the unique index handles this correctly (may need `where topic_id is not null` and `where concept_id is not null` partial indexes instead).
3. **Misconception penalty**: high-confidence-wrong penalty (`topicAccuracy < 0.5 && confidence > 0.8`) must reduce mastery materially. Unit test must confirm.
4. **First-attempt initialization**: `oldMastery === null` branch must set `confidence_level = 'low'`, `stability_factor = 1.0`, and `baseline_score = topicAccuracy * 100`.
5. **No circular imports**: `mastery-types.ts` → no imports from scoring; `compute-mastery.ts` → imports only `mastery-types`; `update-mastery.ts` → imports from compute-mastery and db schema.
6. **Drizzle schema column order**: `learning.ts` columns must match migration column order exactly (same discipline as Session 11 TSP-035).
7. **RLS policy covers all operations**: INSERT from job handler (running as `authenticated` user via service role or JWT) must pass RLS.
8. **Job enqueue wire-up**: confirm whether Builder wired the enqueue hook into `submit_test_session` or explicitly deferred it; document either way.

---

#### Next session (Session 13 — TSP-056)

Readiness score and confidence: weighted average of mastery_records topic scores by exam manifest weights, adjusted by recency and benchmark coverage. Requires `mastery_records` to be populated (this session). Architect must read FINAL_TRD Section 12.3 before planning.

---

**Current Recommended Next Task:** Builder implements TSP-055 against this plan. Session 12 plan is at `docs/SESSIONS/SESSION_12_PLAN.md`.

---

### 2026-06-02 - Session 12 Completion Plan - Architect (Claude Sonnet 4.6)

**Ticket:** TSP-055 — Mastery update job (completion pass)
**Milestone:** M3 — Scoring & Learning Model

---

#### What was already built by prior partial Builder pass

All pure/infrastructure pieces are in place. Do NOT re-create these:

| File | Status |
|---|---|
| `supabase/migrations/202606010004_mastery_records.sql` | Created — not yet applied to live DB |
| `src/lib/scoring/mastery-types.ts` | Done |
| `src/lib/scoring/compute-mastery.ts` | Done — formula + helpers |
| `src/lib/jobs/handlers/update-mastery.ts` | Done — repository-pattern job handler |
| `src/lib/db/schema/learning.ts` | Done — Drizzle schema |
| `src/lib/db/schema/index.ts` | Done — exports `learning` |
| `src/tests/unit/compute-mastery.test.ts` | Done — 8 passing unit tests |

---

#### What the Builder must complete

Three remaining pieces close the loop: a concrete Supabase adapter, the `submitSessionAction` wire-up, and a DB smoke script.

---

##### Piece 1 — Supabase repository adapter

**Create** `src/lib/jobs/handlers/update-mastery-supabase.ts`

Implement `MasteryUpdateRepository` (from `update-mastery.ts`) using the Supabase JS client. This is the only place that touches the database for mastery.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExistingMasteryRecord,
  MasteryJobSource,
  MasteryLookupKey,
  MasteryRecordUpsert,
  MasteryUpdateRepository
} from "@/lib/jobs/handlers/update-mastery";

export function createSupabaseMasteryRepository(supabase: SupabaseClient): MasteryUpdateRepository {
  return {
    loadMasterySource,
    findMasteryRecord,
    upsertMasteryRecord
  };

  async function loadMasterySource(resultId: string): Promise<MasteryJobSource | null> { ... }
  async function findMasteryRecord(key: MasteryLookupKey): Promise<ExistingMasteryRecord | null> { ... }
  async function upsertMasteryRecord(record: MasteryRecordUpsert): Promise<void> { ... }
}
```

**`loadMasterySource` — five sequential Supabase queries (no joined RPC needed):**

1. Load `session_results` by `id = resultId`:  
   select `session_id`, `exam_id`, `user_id`, `topic_scores`, `concept_scores`. Return `null` if not found.

2. Load `test_sessions` by `id = session_id`:  
   select `type` (maps to `SessionType`). Return `null` if not found.

3. Load `session_answers` by `session_id`:  
   select `question_id`, `is_correct`, `confidence`, `marks_awarded`, `time_spent_sec`, `revisit_count`.

4. Load `session_questions` joined to `questions` by `session_id`:  
   select `question_id`, `questions.topic_id`, `questions.difficulty`.
   Build `Map<string, string>` for `questionTopics` and `Map<string, QuestionDifficulty>` for `questionDifficulties`.

5. Load `question_concepts` for all `question_id`s in the session:  
   select `question_id`, `concept_id`.
   Build `Map<string, string[]>` for `questionConcepts`.

Combine into `MasteryJobSource`:
```typescript
return {
  resultId,
  userId: result.user_id,
  examId: result.exam_id,
  sessionId: result.session_id,
  sessionType: session.type as SessionType,
  topicScores: (result.topic_scores as Record<string, ScoreBucket>) ?? {},
  conceptScores: (result.concept_scores as Record<string, ScoreBucket>) ?? null,
  sessionAnswers: /* mapped from query 3 */,
  questionDifficulties: /* Map from query 4 */,
  questionTopics: /* Map from query 4 */,
  questionConcepts: /* Map from query 5 */,
  testedAt: new Date()
};
```

**`findMasteryRecord`:**
```sql
SELECT id, mastery_score, questions_attempted, questions_correct, stability_factor
FROM mastery_records
WHERE user_id = $1 AND exam_id = $2
  AND (topic_id = $3 OR ($3 IS NULL AND topic_id IS NULL))
  AND (concept_id = $4 OR ($4 IS NULL AND concept_id IS NULL))
LIMIT 1
```
Via Supabase JS: `.eq('user_id', key.userId).eq('exam_id', key.examId)` plus conditional `.eq('topic_id', key.topicId)` or `.is('topic_id', null)` depending on which is set.

**`upsertMasteryRecord`:**
```typescript
await supabase.from('mastery_records').upsert(
  {
    id: record.id,              // undefined on insert → server generates uuid
    user_id: record.userId,
    exam_id: record.examId,
    topic_id: record.topicId ?? null,
    concept_id: record.conceptId ?? null,
    mastery_score: record.masteryScore,
    confidence_level: record.confidenceLevel,
    baseline_score: record.baselineScore,
    stability_factor: record.stabilityFactor,
    questions_attempted: record.questionsAttempted,
    questions_correct: record.questionsCorrect,
    last_tested_at: record.lastTestedAt.toISOString(),
    updated_at: record.updatedAt.toISOString()
  },
  {
    onConflict: record.topicId
      ? 'user_id,exam_id,topic_id'
      : 'user_id,exam_id,concept_id'
  }
);
```

**Important:** The `mastery_records` table grants `select, insert, update` to `authenticated` with owner-level RLS — no security-definer RPC needed. The Supabase JS client runs as the signed-in user, so RLS passes naturally.

---

##### Piece 2 — Wire up in `submitSessionAction`

**Edit** `src/app/test/actions.ts`

After the `submit_test_session` RPC call succeeds and `result.resultId` is present, run the mastery update. **Mastery failure must NOT fail the submit response** — it is a post-processing step. Wrap in try/catch and log.

```typescript
// After: const result = toSubmitSessionResult(data);
if (result.resultId) {
  try {
    const masteryRepo = createSupabaseMasteryRepository(supabase);
    await updateMasteryJob(result.resultId, masteryRepo);
  } catch (masteryError) {
    // Non-fatal: submit already scored; log and continue
    console.error("[mastery] update failed for result", result.resultId, masteryError);
  }
}
```

Add the import:
```typescript
import { updateMasteryJob } from "@/lib/jobs/handlers/update-mastery";
import { createSupabaseMasteryRepository } from "@/lib/jobs/handlers/update-mastery-supabase";
```

**Why non-fatal:** the student's score is already written to `session_results`. A mastery update failure silently delays the learning model by one session — far better than crashing the submit response.

---

##### Piece 3 — DB smoke script

**Create** `scripts/smoke-mastery-update.js`

Pattern: mirror `smoke-test-session.js` but extend the verify step.

```javascript
// 1. Seed 3+ live MCQ questions across 2 topics
// 2. start_test_session → get session_id
// 3. For each question: saveAnswerAction with mixed confidence (sure/unsure/guessed)
//    — ensure at least one correct+sure and one wrong+sure to exercise misconception penalty
// 4. submit_test_session
// 5. SELECT from mastery_records WHERE user_id = $1 AND exam_id = $2
//    — assert at least 2 rows (one per topic)
//    — assert mastery_score is between 0 and 100
//    — assert confidence_level is 'low' (first attempt < 3 questions per topic)
//    — assert questions_attempted > 0, questions_correct <= questions_attempted
// 6. Submit the same session again (idempotency: mastery_records rows should not change)
// 7. Cleanup: delete sessions, questions, mastery_records by test user
console.log("smoke-mastery-update: PASS");
```

**Key idempotency assertion (step 6):** Because `submitSessionAction` calls mastery update after every `submit_test_session`, but `submit_test_session` itself is idempotent (returns early if already `scored`), mastery update will NOT re-run on a second submit (the RPC returns before returning a new `resultId`). The smoke must verify mastery rows remain unchanged on a duplicate submit call.

---

#### Migration status

`202606010004_mastery_records.sql` exists locally but has **not been applied to the live DB**.

After building Pieces 1–3:

```powershell
node run-migrations.js
```

Expected: migration `202606010004_mastery_records.sql` applies cleanly. No new RPCs in this migration — grant checker is unchanged.

Then run:

```powershell
node scripts/smoke-mastery-update.js
```

---

#### Files to create or modify

| Action | Path |
|---|---|
| Create | `src/lib/jobs/handlers/update-mastery-supabase.ts` |
| Edit | `src/app/test/actions.ts` (import + wire-up) |
| Create | `scripts/smoke-mastery-update.js` |
| Edit | `trackers/JIRA_TRACKER.csv` (TSP-055 → Done after gates pass) |
| Edit | `docs/process/SESSION_STATE.md`, `docs/process/CHANGELOG.md`, `docs/process/HANDOFF.md` |

---

#### Verification gate

- Unit: `corepack pnpm exec vitest run src/tests/unit/compute-mastery.test.ts` — already passes; must still pass after this session.
- Standard: `corepack pnpm typecheck` + `corepack pnpm lint` + `corepack pnpm test` + `corepack pnpm build`.
- Database: `node run-migrations.js` applies `202606010004`; `node scripts/smoke-mastery-update.js` asserts mastery rows inserted with correct shape and idempotency.
- No browser smoke gate for this session — mastery is invisible to the student until the M4 dashboard row.

---

#### Sanity review focus (critical items for reviewer)

1. **Mastery does NOT fail submit.** Verify that a thrown error inside `updateMasteryJob` is caught and logged without affecting the `SubmitSessionActionState` returned to the UI.

2. **Idempotency of mastery update.** The second submit call to `submit_test_session` returns early (status already `scored`) before mastery update is triggered — confirm `result.resultId` is still returned from the already-scored branch and that mastery is NOT double-applied. (Check `submit_test_session` return shape for the `scored` early-return branch.)

3. **`onConflict` column correctness.** Supabase upsert `onConflict` must reference the correct partial unique index columns. Topic rows use `(user_id, exam_id, topic_id)`; concept rows use `(user_id, exam_id, concept_id)`. A wrong conflict column silently inserts duplicates instead of updating.

4. **RLS ownership.** `createSupabaseMasteryRepository` is called with the authenticated Supabase client inside `submitSessionAction` (after `requireAuth` passes). Mastery rows are written as `user_id = auth.uid()` — RLS `with check` must pass. Verify the upsert includes `user_id: auth.userId` matching the session owner.

5. **Null `topic_id` / `concept_id` handling in `findMasteryRecord`.** PostgreSQL treats `NULL != NULL` in equality comparisons. A query `WHERE topic_id = NULL` returns zero rows; must use `IS NULL`. Verify the Supabase JS query uses `.is('topic_id', null)` not `.eq('topic_id', null)` when the key has no topic.

6. **`sessionType` cast.** `test_sessions.type` is a text column. The adapter casts it to `SessionType`. If the DB contains a type not in the union (e.g. `'retest'`), `computeTopicMastery` falls through to weight `1.0` — acceptable. Verify no `unknown` type silently skips mastery.

7. **`baseline_score` set only on first insert.** When `record.id` is `undefined` (first insert), `baseline_score` should be `accuracy * 100`. When it is an update (`record.id` defined), `baseline_score` is passed from the existing row via `oldMasteryScore === null ? accuracy * 100 : oldMasteryScore` — verify the handler logic in `update-mastery.ts` line 160 passes the correct value to the upsert.

---

#### Next session (Session 13 — TSP-056)

Readiness score: weighted average of `mastery_records` topic scores by exam manifest `topic_weights`, adjusted for recency and benchmark coverage. Requires `mastery_records` to be populated (this session). Architect must read FINAL_TRD §12.3 before planning.

---

---

### 2026-06-02 - Session 13 Plan (M3 fourth slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M3 — Scoring & Learning Model
**Ticket:** TSP-056 — Implement readiness score and confidence
**Depends on:** TSP-055 Done — `mastery_records` populated post-submit.

---

#### Context

TRD §12.3 defines readiness as:

```
weighted average of topic/concept mastery by exam weights
adjusted by recency, benchmark performance, and confidence
```

This is a **pure computation layer** — no new DB table, no migration. TSP-056 delivers the formula and the server-side query function that assembles inputs from the live DB. The M4 dashboard (TSP-076/078) consumes it. TSP-057 (forgetting-curve decay, nightly job) is out of scope this session — we surface stale topics here but do not decay stored mastery.

This is a backend-only session. No UI routes. Two files of logic + one query helper + unit tests.

---

#### Architectural decisions locked for this session

**A. Readiness is computed on demand, not stored.** No new table. The M4 dashboard API calls the query helper each time. The TRD's `session_results.readiness_delta` column is reserved for a future per-session snapshot (M4 integration, not this session).

**B. Topic weights source.** Use `topics.weight_percent` (already in the DB schema). All topics with a non-null `weight_percent` participate — both root and subtopics. If `weight_percent` values don't sum to 100, normalize them (divide each by the actual sum) rather than error. Topics with null `weight_percent` are ignored in the weighted average. Uncovered topics (no mastery record but have a weight) contribute **mastery = 0** — they correctly drag the score down.

**C. Readiness score range: 0–100.** Consistent with `mastery_score`.

**D. Formula — four factors:**

```typescript
readinessScore = weightedMasterySum * benchmarkFactor * recencyFactor
// clamped to [0, 100], rounded to 2dp
```

1. **`weightedMasterySum`** (0–100): sum over all weighted topics of `(normalizedWeight × mastery_score)`. Topics with no mastery record contribute 0.

2. **`benchmarkFactor`** (0.9 or 1.0): `1.0` if the user has ≥1 `benchmark` or `mock` session for this exam in `test_sessions`; `0.9` otherwise. TRD §12.1: "Benchmark sessions have stronger measurement weight."

3. **`recencyFactor`** (0.80–1.0): for every mastery record with `last_tested_at` older than 14 days, deduct 2% (floor 80%). Formula: `max(0.80, 1.0 - staleCount × 0.02)`. TSP-057 will apply the full exponential decay to stored `mastery_score` nightly; this factor is a soft display-time penalty only.

4. **`coveragePercent`** (0–1): fraction of total normalized weight covered by topics with `questions_attempted > 0`. Returned alongside the score for the dashboard — not a multiplier.

**E. Readiness confidence level (separate from per-topic `confidence_level`):**

```typescript
function deriveReadinessConfidence(coverage, hasBenchmark, avgTopicConfidence):
  'low' | 'medium' | 'high'
```
- `low`: `coverage < 0.30` OR `avgTopicConfidence === 'low'`
- `high`: `coverage >= 0.70` AND `hasBenchmark` AND `avgTopicConfidence !== 'low'`
- `medium`: everything else

`avgTopicConfidence` maps `low=0, medium=1, high=2`; average across all topic mastery records with attempts; rounds down.

**F. Stale topics list.** Return `staleTopicIds: string[]` — topic IDs where `last_tested_at < now - 14 days`. Used by the dashboard "Retention may have dropped" warning (TRD §12.2).

**G. First-session user (zero mastery records).** Return `{ score: 0, confidenceLevel: 'low', coveragePercent: 0, staleTopicIds: [], hasBenchmark: false, breakdown: {} }`. Never throw — null mastery is a valid state.

**H. Benchmark check query.** One extra Supabase query against `test_sessions` filtered by `user_id`, `exam_id`, `type IN ('benchmark', 'mock')`, `status = 'scored'`, `LIMIT 1`. If the query errors, default `hasBenchmark = false` (non-fatal).

---

#### Files to create

| Action | Path |
|---|---|
| Create | `src/lib/scoring/readiness.ts` — pure formula + types (no DB) |
| Create | `src/tests/unit/readiness.test.ts` — unit tests (full formula coverage, no DB) |
| Create | `src/lib/scoring/readiness-query.ts` — server-side Supabase query + compute assembly |
| Edit | `trackers/JIRA_TRACKER.csv` (TSP-056 → In Progress → Done after gates pass) |
| Edit | `docs/process/SESSION_STATE.md`, `docs/process/CHANGELOG.md`, `docs/process/HANDOFF.md` |

**Do NOT create** any UI page, API route, or migration. Do NOT modify `submitSessionAction` — readiness is fetched on demand.

---

#### `src/lib/scoring/readiness.ts` — full spec

```typescript
export type ReadinessTopicWeight = {
  topicId: string;
  weightPercent: number; // from topics.weight_percent; >0
};

export type MasteryRecordForReadiness = {
  topicId: string | null;
  masteryScore: number;        // 0–100 numeric
  confidenceLevel: 'low' | 'medium' | 'high';
  questionsAttempted: number;
  lastTestedAt: Date | null;
};

export type ReadinessInput = {
  masteryRecords: MasteryRecordForReadiness[];  // topic-level only (concept rows ignored here)
  topicWeights: ReadinessTopicWeight[];
  hasBenchmarkSession: boolean;
  nowMs?: number; // injectable for unit tests; defaults to Date.now()
};

export type TopicBreakdown = {
  masteryScore: number;   // 0–100, or 0 if uncovered
  weight: number;         // normalized weight 0–1
  contribution: number;   // masteryScore × weight (raw contribution to weighted sum)
  covered: boolean;       // questions_attempted > 0
  stale: boolean;         // last_tested_at older than STALE_THRESHOLD_DAYS
};

export type ReadinessScore = {
  score: number;                    // 0–100
  confidenceLevel: 'low' | 'medium' | 'high';
  coveragePercent: number;          // 0–1 fraction of weighted topics with attempts
  staleTopicIds: string[];          // topic IDs last tested >14 days ago
  hasBenchmarkSession: boolean;
  breakdown: Record<string, TopicBreakdown>; // keyed by topicId
};

export const STALE_THRESHOLD_DAYS = 14;
export const BENCHMARK_FACTOR_WITH = 1.0;
export const BENCHMARK_FACTOR_WITHOUT = 0.9;
export const RECENCY_DEDUCTION_PER_STALE = 0.02;
export const RECENCY_FLOOR = 0.80;

export function computeReadinessScore(input: ReadinessInput): ReadinessScore {
  // Export the constants above so unit tests can use them without magic numbers
  const now = input.nowMs ?? Date.now();
  const { masteryRecords, topicWeights, hasBenchmarkSession } = input;

  // Step 1 — normalize weights (guard zero-sum)
  const totalWeight = topicWeights.reduce((s, t) => s + t.weightPercent, 0);
  if (topicWeights.length === 0 || totalWeight === 0) {
    return zeroReadiness(hasBenchmarkSession);
  }
  const normalizedWeights = topicWeights.map(t => ({
    topicId: t.topicId,
    weight: t.weightPercent / totalWeight
  }));

  // Step 2 — index mastery records by topicId (topic-level only)
  const masteryByTopic = new Map<string, MasteryRecordForReadiness>();
  for (const record of masteryRecords) {
    if (record.topicId) masteryByTopic.set(record.topicId, record);
  }

  // Step 3 — build breakdown and compute weighted sum
  let weightedSum = 0;
  let coveredWeight = 0;
  const staleTopicIds: string[] = [];
  const breakdown: Record<string, TopicBreakdown> = {};

  for (const { topicId, weight } of normalizedWeights) {
    const record = masteryByTopic.get(topicId);
    const masteryScore = record ? toNumber(record.masteryScore) : 0;
    const covered = (record?.questionsAttempted ?? 0) > 0;
    const stale = isStale(record?.lastTestedAt ?? null, now);

    if (stale && record?.topicId) staleTopicIds.push(record.topicId);
    if (covered) coveredWeight += weight;

    weightedSum += masteryScore * weight;
    breakdown[topicId] = {
      masteryScore,
      weight,
      contribution: masteryScore * weight,
      covered,
      stale
    };
  }

  const coveragePercent = coveredWeight; // already normalized

  // Step 4 — benchmark factor
  const benchmarkFactor = hasBenchmarkSession
    ? BENCHMARK_FACTOR_WITH
    : BENCHMARK_FACTOR_WITHOUT;

  // Step 5 — recency factor (soft penalty, floor 0.80)
  const recencyFactor = Math.max(
    RECENCY_FLOOR,
    1.0 - staleTopicIds.length * RECENCY_DEDUCTION_PER_STALE
  );

  // Step 6 — final score
  const rawScore = weightedSum * benchmarkFactor * recencyFactor;
  const score = roundScore(rawScore);

  // Step 7 — readiness confidence
  const avgTopicConfidence = averageConfidenceLevel(
    Array.from(masteryByTopic.values())
      .filter(r => (r.questionsAttempted ?? 0) > 0)
      .map(r => r.confidenceLevel)
  );
  const confidenceLevel = deriveReadinessConfidence(
    coveragePercent,
    hasBenchmarkSession,
    avgTopicConfidence
  );

  return {
    score,
    confidenceLevel,
    coveragePercent,
    staleTopicIds,
    hasBenchmarkSession,
    breakdown
  };
}

function deriveReadinessConfidence(
  coverage: number,
  hasBenchmark: boolean,
  avgTopicConfidence: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' {
  if (coverage < 0.30 || avgTopicConfidence === 'low') return 'low';
  if (coverage >= 0.70 && hasBenchmark && avgTopicConfidence !== 'low') return 'high';
  return 'medium';
}

function averageConfidenceLevel(
  levels: ('low' | 'medium' | 'high')[]
): 'low' | 'medium' | 'high' {
  if (levels.length === 0) return 'low';
  const numericMap = { low: 0, medium: 1, high: 2 };
  const avg = levels.reduce((s, l) => s + numericMap[l], 0) / levels.length;
  if (avg < 0.5) return 'low';
  if (avg < 1.5) return 'medium';
  return 'high';
}

function isStale(lastTestedAt: Date | null, nowMs: number): boolean {
  if (!lastTestedAt) return false;
  const days = (nowMs - lastTestedAt.getTime()) / (1000 * 60 * 60 * 24);
  return days > STALE_THRESHOLD_DAYS;
}

function zeroReadiness(hasBenchmarkSession: boolean): ReadinessScore {
  return {
    score: 0,
    confidenceLevel: 'low',
    coveragePercent: 0,
    staleTopicIds: [],
    hasBenchmarkSession,
    breakdown: {}
  };
}

function roundScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
```

---

#### `src/lib/scoring/readiness-query.ts` — full spec

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeReadinessScore,
  type MasteryRecordForReadiness,
  type ReadinessScore,
  type ReadinessTopicWeight
} from "@/lib/scoring/readiness";

export async function fetchReadinessScore(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<ReadinessScore> {
  // Query 1 — topic-level mastery records for this user+exam
  const { data: masteryRows, error: masteryError } = await supabase
    .from("mastery_records")
    .select("topic_id,mastery_score,confidence_level,questions_attempted,last_tested_at")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .not("topic_id", "is", null);  // topic-level only

  if (masteryError) {
    console.error("[readiness] mastery query failed", masteryError.message);
    return computeReadinessScore({ masteryRecords: [], topicWeights: [], hasBenchmarkSession: false });
  }

  // Query 2 — topic weights for this exam
  const { data: topicRows, error: topicError } = await supabase
    .from("topics")
    .select("id,weight_percent")
    .eq("exam_id", examId)
    .not("weight_percent", "is", null);

  if (topicError) {
    console.error("[readiness] topic weight query failed", topicError.message);
    return computeReadinessScore({ masteryRecords: [], topicWeights: [], hasBenchmarkSession: false });
  }

  // Query 3 — check for any scored benchmark/mock session for this user+exam
  const { data: benchmarkRows, error: benchmarkError } = await supabase
    .from("test_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "scored")
    .in("type", ["benchmark", "mock"])
    .limit(1);

  const hasBenchmarkSession = !benchmarkError && (benchmarkRows?.length ?? 0) > 0;

  // Map to formula types
  const masteryRecords: MasteryRecordForReadiness[] = (masteryRows ?? []).map(r => ({
    topicId: r.topic_id as string,
    masteryScore: Number(r.mastery_score ?? 0),
    confidenceLevel: toConfidenceLevel(r.confidence_level),
    questionsAttempted: Number(r.questions_attempted ?? 0),
    lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at) : null
  }));

  const topicWeights: ReadinessTopicWeight[] = (topicRows ?? [])
    .filter(t => Number(t.weight_percent) > 0)
    .map(t => ({
      topicId: t.id as string,
      weightPercent: Number(t.weight_percent)
    }));

  return computeReadinessScore({ masteryRecords, topicWeights, hasBenchmarkSession });
}

function toConfidenceLevel(value: string | null): 'low' | 'medium' | 'high' {
  return value === 'medium' || value === 'high' ? value : 'low';
}
```

---

#### Unit tests required (`src/tests/unit/readiness.test.ts`)

Cover these cases — no DB calls, all inputs are inline:

1. **Zero records + zero weights → score 0, confidence low, coverage 0**
2. **Single topic, full mastery, with benchmark → score ≈ 100 × 1.0 × 1.0**
3. **Single topic, full mastery, no benchmark → score ≈ 100 × 0.9 × 1.0**
4. **Two topics, one covered 80% one uncovered → coverage 0.5, score = weight₁ × 80**
5. **Stale topic (last_tested_at = 20 days ago) → staleTopicIds populated, recency deduction applied**
6. **10 stale topics → recency factor floored at 0.80 (not 0.60)**
7. **Coverage < 0.30 → confidenceLevel 'low' regardless of benchmark**
8. **Coverage ≥ 0.70 + benchmark + avg confidence 'medium' → confidenceLevel 'high'**
9. **Coverage 0.50 + no benchmark → confidenceLevel 'medium'**
10. **Un-normalized weights (don't sum to 100) → normalized correctly**
11. **Topic with no mastery record contributes mastery = 0 to weighted sum**
12. **Numeric mastery_score as string ('75.5') → parsed correctly**

---

#### Verification gate

- Unit: `corepack pnpm exec vitest run src/tests/unit/readiness.test.ts`
- Standard: `corepack pnpm typecheck` + `corepack pnpm lint` + `corepack pnpm test` + `corepack pnpm build`
- No migration, no DB smoke script, no browser smoke — this is a pure computation + query helper session.

---

#### Sanity review focus (flag for reviewer)

1. **Uncovered topic → mastery 0.** A topic in `topicWeights` with no matching `mastery_records` row must contribute `masteryScore = 0` to the weighted sum, not be skipped. Verify the loop iterates `normalizedWeights` (not `masteryByTopic`) and falls back to 0.
2. **Weight normalization guards zero-sum.** `totalWeight === 0` or `topicWeights.length === 0` returns `zeroReadiness` immediately. No division-by-zero.
3. **Recency floor.** 10 stale topics × 0.02 = 0.20 deduction → factor 0.80, not 0.60. `Math.max(RECENCY_FLOOR, ...)` enforces this.
4. **Benchmark factor only from scored sessions.** Query filters `status = 'scored'` — in-progress or expired sessions do not count.
5. **Query failures are non-fatal.** All three queries degrade gracefully: errors are logged, function returns zero-readiness rather than throwing. Never propagate DB errors to the caller.
6. **Concept rows excluded from query.** `readiness-query.ts` filters `.not("topic_id", "is", null)` — concept-level mastery rows are excluded from topic-weight readiness. Concept readiness is a future row.
7. **`nowMs` is injectable.** All stale-topic logic uses `input.nowMs ?? Date.now()` — unit tests must be able to inject a fixed timestamp to assert staleness deterministically.
8. **No circular imports.** `readiness.ts` must not import from `compute-mastery.ts`, `update-mastery.ts`, or any job handler. It imports nothing from this project — pure functions + types only.

---

#### Open item for founder (non-blocking)

**TSP-160 (S12-A):** The partial unique index `onConflict` fix for the Supabase JS mastery upsert UPDATE path should be addressed before M4 makes readiness visible to students. Recommend: a new migration `202606020001_mastery_unique_constraints.sql` that adds named non-partial unique constraints. This is a one-line fix but needs a migration slot.

---

#### Next session (Session 14 — TSP-057)

Forgetting-curve decay: nightly job that reads mastery_records with `last_tested_at` older than a threshold and applies `decayedMastery = storedMastery × exp(-daysSince / (14 × stabilityFactor))`. Requires a jobs table (TSP-116) or can run as a Postgres cron/pg_cron call. Architect must decide between Supabase Edge Function cron and pg_cron before planning.

---

### 2026-06-02 - Session 13 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-056` from the Session 13 Architect plan.
- All three files created; tracker and process docs not updated in this pass (handled by Architect Sanity below).

Files changed:

- `src/lib/scoring/readiness.ts`
- `src/lib/scoring/readiness-query.ts`
- `src/tests/unit/readiness.test.ts`

What changed:

- Added pure `computeReadinessScore` with injectable `nowMs`, exported constants, and `zeroReadiness` fallback.
- Added `fetchReadinessScore` Supabase query helper with three non-fatal queries (mastery records, topic weights, benchmark session check).
- Added 12 unit test cases covering zero input, benchmark factor, uncovered topics, stale topics, recency floor, confidence levels, weight normalization, string mastery parsing, and the Supabase mock path.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/readiness.test.ts` — passed.
- `corepack pnpm typecheck` — passed after elevated rerun.
- `corepack pnpm lint` — passed after elevated rerun.
- `corepack pnpm test` — passed after elevated rerun.
- `corepack pnpm build` — passed after elevated rerun.
- No migration or DB smoke gate applies to this slice.

---

### 2026-06-02 - Session 13 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-056 — `readiness.ts`, `readiness-query.ts`, `readiness.test.ts`

**Overall: PASS. TSP-056 → Done.**

**Focus 1 — Uncovered topic contributes mastery 0: PASS.** Loop at line 75 iterates `normalizedWeights` (not `masteryByTopic`). Missing record → `masteryScore = 0`, `covered = false`. The test at line 196 confirms `topic-b` (no record) has `contribution = 0`.

**Focus 2 — Zero-sum guard: PASS.** Line 53: `!Number.isFinite(totalWeight) || totalWeight <= 0` → `zeroReadiness`. Handles both empty array and all-zero weights.

**Focus 3 — Recency floor: PASS.** Line 101: `Math.max(RECENCY_FLOOR, 1.0 - staleCount × 0.02)`. Test case (10 stale topics) asserts `score = 80`, not 60.

**Focus 4 — Benchmark from scored sessions only: PASS.** `readiness-query.ts` line 66: `.eq("status", "scored").in("type", ["benchmark", "mock"])`. In-progress sessions excluded.

**Focus 5 — Query failures non-fatal: PASS.** All three queries have error guards; outer `try/catch` at line 31 catches unexpected errors. **Non-blocking S13-A:** on `benchmarkError`, the function discards already-fetched mastery/topic data and returns zero-readiness (lines 72-79). Spec intended `hasBenchmarkSession = false` with other data preserved. Over-pessimistic but safe. Fix in a future cleanup pass.

**Focus 6 — Concept rows excluded: PASS.** Line 37: `.not("topic_id", "is", null)`.

**Focus 7 — `nowMs` injectable: PASS.** All unit tests use `NOW = Date.UTC(2026, 5, 2, 12, 0, 0, 0)`. No wall-clock dependency.

**Focus 8 — No circular imports: PASS.** `readiness.ts` has zero project imports. `readiness-query.ts` imports only from `@/lib/scoring/readiness` and `@supabase/supabase-js`.

**All 12 spec cases covered.**

**Track S13-A** for a future cleanup pass. Does not block Done or M4 work.

**Next session:** TSP-057 (forgetting-curve decay nightly job) OR pivot to M4 dashboard (TSP-076 overview API). TSP-076 depends on TSP-056 (Done) and TSP-062 (retest queue, not yet built). Recommend discussing with founder whether to complete M3 decay first or start M4 dashboard in parallel.

---

### 2026-06-02 - Session 14 Plan (M4 first slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M4 Dashboard & Retention  
**Tickets:** TSP-059 (mistake notebook schema), TSP-060 (create mistake items on submit)  
**Prerequisites complete:** TSP-053 result aggregates (Done), TSP-055 mastery update (Done), TSP-056 readiness score (Done)

---

#### Overview

Session 14 builds the M4 mistake notebook foundation. Two tickets, one commit each.

**TSP-059** creates the database schema for `mistake_items` and `retest_queue`. Schema-only — no application logic.

**TSP-060** adds a TypeScript job (`createMistakeItemsJob`) that classifies each scored answer into a mistake type and persists a row to `mistake_items`. Wired into `submitSessionAction` non-fatally, same pattern as mastery. Pure classification function extracted so it has unit tests.

After Session 14 the closed loop is: submit → score → mastery update → mistake notebook update. Session 15 (TSP-062) adds the retest scheduler that populates `retest_queue` from mistake_items. Session 16 (TSP-076) builds the dashboard API that reads both.

**Skip `fsrs_cards`** — that is TSP-064 (Phase 1.5). Create `retest_queue` schema here because TSP-062 (Session 15) depends on it, and TSP-076 (Session 16) depends on TSP-062.

---

#### TSP-059: Mistake Notebook Schema

**Migration file:** `supabase/migrations/202606020001_mistake_notebook.sql`

---

##### Table 1: `mistake_items`

One row per qualifying answer per session. The unique constraint on `(user_id, session_id, question_id)` makes idempotent upsert safe.

```sql
-- TSP-059: mistake notebook and retest queue schema.
-- mistake_items: one classified mistake row per question per session.
-- retest_queue: scheduler state for concept/topic retests (populated by TSP-062).

create table if not exists public.mistake_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  mistake_type text not null check (mistake_type in (
    'conceptual_gap','time_pressure','silly_mistake','not_attempted',
    'overconfidence','lucky_guess','bookmarked'
  )),
  confidence text check (confidence in ('sure','unsure','guessed')),
  status text not null default 'unresolved' check (status in (
    'unresolved','scheduled','reviewed','resolved','ignored'
  )),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, session_id, question_id)
);
```

**Design notes vs TRD:**
- `session_id` is `NOT NULL` — always known at creation time.
- `status` is `NOT NULL DEFAULT 'unresolved'` — TRD had nullable.
- `UNIQUE (user_id, session_id, question_id)` added — not in TRD but required for idempotent upsert.
- `topic_id` and `concept_id` use `ON DELETE SET NULL` so mistakes survive topic/concept restructuring.

---

##### Table 2: `retest_queue`

One row per (user, topic/concept) that needs spaced-repetition scheduling. XOR check mirrors `mastery_records` pattern.

```sql
create table if not exists public.retest_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  due_at timestamptz not null,
  scheduler text not null default 'simple' check (scheduler in ('simple','sm2','fsrs')),
  scheduler_state jsonb,
  priority numeric not null default 0,
  status text not null default 'due' check (status in (
    'due','scheduled','completed','snoozed','cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  )
);
```

---

##### Indexes

```sql
-- mistake_items
create index if not exists mistake_user_status
  on public.mistake_items (user_id, status);

create index if not exists mistake_user_exam
  on public.mistake_items (user_id, exam_id);

create index if not exists mistake_session
  on public.mistake_items (session_id);

-- retest_queue
create index if not exists retest_due
  on public.retest_queue (status, due_at);

create index if not exists retest_user_exam
  on public.retest_queue (user_id, exam_id, status);
```

---

##### RLS: `mistake_items`

```sql
alter table public.mistake_items enable row level security;

drop policy if exists mistake_items_owner_select on public.mistake_items;
create policy mistake_items_owner_select on public.mistake_items
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists mistake_items_owner_insert on public.mistake_items;
create policy mistake_items_owner_insert on public.mistake_items
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists mistake_items_owner_update on public.mistake_items;
create policy mistake_items_owner_update on public.mistake_items
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.mistake_items to authenticated;
```

---

##### RLS: `retest_queue`

```sql
alter table public.retest_queue enable row level security;

drop policy if exists retest_queue_owner_select on public.retest_queue;
create policy retest_queue_owner_select on public.retest_queue
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists retest_queue_owner_insert on public.retest_queue;
create policy retest_queue_owner_insert on public.retest_queue
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists retest_queue_owner_update on public.retest_queue;
create policy retest_queue_owner_update on public.retest_queue
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.retest_queue to authenticated;
```

---

##### TSP-059 verification gate

```powershell
node run-migrations.js
```

Expected: migration `202606020001_mistake_notebook.sql` applies cleanly. No `check-rpc-grants.js` update needed (no new RPCs).

---

#### TSP-060: Create Mistake Items After Submit

**New files:**
- `src/lib/jobs/handlers/create-mistake-items.ts`
- `src/tests/unit/mistake-classification.test.ts`
- `scripts/smoke-mistake-items.js`

**Modified file:**
- `src/app/test/actions.ts`

---

##### Mistake classification rules

One `mistake_items` row per qualifying answer. Priority order (first match wins):

| Priority | Condition | `mistake_type` |
|---|---|---|
| 1 | `is_correct = false AND confidence = 'sure'` | `overconfidence` |
| 2 | `is_correct = false` (any other confidence) | `conceptual_gap` |
| 3 | `is_correct IS NULL` (skipped — no selected answer) | `not_attempted` |
| 4 | `is_correct = true AND confidence = 'guessed'` | `lucky_guess` |
| 5 | `is_correct = true AND marked_review = true` | `bookmarked` |
| — | `is_correct = true AND marked_review = false` | no row |

Rules applied in order: overconfidence check before conceptual_gap check; `is_correct = null` means no selected answer (the RPC sets null when skipped); `lucky_guess` only fires on a correct-but-guessed answer; `bookmarked` only fires on a correct, non-guessed, manually flagged answer.

---

##### `src/lib/jobs/handlers/create-mistake-items.ts` — full TypeScript spec

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type MistakeType =
  | "conceptual_gap"
  | "overconfidence"
  | "not_attempted"
  | "lucky_guess"
  | "bookmarked";

export type MistakeClassificationInput = {
  isCorrect: boolean | null;
  confidence: "sure" | "unsure" | "guessed" | null;
  markedReview: boolean;
};

/**
 * Pure classifier. Returns null when the answer does not qualify as a mistake.
 * Priority: overconfidence > conceptual_gap > not_attempted > lucky_guess > bookmarked.
 */
export function classifyMistake(answer: MistakeClassificationInput): MistakeType | null {
  if (answer.isCorrect === false && answer.confidence === "sure") return "overconfidence";
  if (answer.isCorrect === false) return "conceptual_gap";
  if (answer.isCorrect === null) return "not_attempted";
  if (answer.isCorrect === true && answer.confidence === "guessed") return "lucky_guess";
  if (answer.isCorrect === true && answer.markedReview) return "bookmarked";
  return null;
}

type ResultRow = { session_id: string; user_id: string; exam_id: string };
type AnswerRow = {
  question_id: string;
  is_correct: boolean | null;
  confidence: "sure" | "unsure" | "guessed" | null;
  marked_review: boolean;
};
type QuestionRow = { id: string; topic_id: string | null };
type ConceptRow = { question_id: string; concept_id: string; relevance: number };

/**
 * Loads scored session answers, classifies each, and upserts mistake_items rows.
 * Non-fatal: caller must wrap in try/catch.
 * Idempotent: unique constraint (user_id, session_id, question_id) + ignoreDuplicates.
 */
export async function createMistakeItemsJob(
  resultId: string,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Session context
  const { data: resultRow, error: resultError } = await supabase
    .from("session_results")
    .select("session_id,user_id,exam_id")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError || !resultRow) {
    throw new Error(
      `[mistake] session_results lookup failed for ${resultId}: ${resultError?.message ?? "not found"}`
    );
  }

  const { session_id: sessionId, user_id: userId, exam_id: examId } = resultRow as ResultRow;

  // 2. Scored answers (is_correct is set by submit_test_session RPC)
  const { data: answerRows, error: answerError } = await supabase
    .from("session_answers")
    .select("question_id,is_correct,confidence,marked_review")
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (answerError) {
    throw new Error(`[mistake] session_answers lookup failed: ${answerError.message}`);
  }

  const answers = (answerRows ?? []) as AnswerRow[];
  if (answers.length === 0) return;

  const questionIds = answers.map((a) => a.question_id);

  // 3. Topic per question (from questions.topic_id)
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id,topic_id")
    .in("id", questionIds);

  const topicByQuestion = new Map<string, string | null>();
  for (const q of (questionRows ?? []) as QuestionRow[]) {
    topicByQuestion.set(q.id, q.topic_id);
  }

  // 4. Primary concept per question (highest relevance first)
  const { data: conceptRows } = await supabase
    .from("question_concepts")
    .select("question_id,concept_id,relevance")
    .in("question_id", questionIds)
    .order("relevance", { ascending: false });

  const primaryConcept = new Map<string, string>();
  for (const row of (conceptRows ?? []) as ConceptRow[]) {
    if (!primaryConcept.has(row.question_id)) {
      primaryConcept.set(row.question_id, row.concept_id);
    }
  }

  // 5. Classify and build insert rows
  const insertRows = [];
  for (const answer of answers) {
    const mistakeType = classifyMistake({
      isCorrect: answer.is_correct,
      confidence: answer.confidence,
      markedReview: answer.marked_review,
    });
    if (!mistakeType) continue;

    insertRows.push({
      user_id: userId,
      exam_id: examId,
      question_id: answer.question_id,
      session_id: sessionId,
      topic_id: topicByQuestion.get(answer.question_id) ?? null,
      concept_id: primaryConcept.get(answer.question_id) ?? null,
      mistake_type: mistakeType,
      confidence: answer.confidence ?? null,
      status: "unresolved",
    });
  }

  if (insertRows.length === 0) return;

  // 6. Upsert — unique(user_id, session_id, question_id) + ignoreDuplicates = idempotent
  const { error: insertError } = await supabase
    .from("mistake_items")
    .upsert(insertRows, { onConflict: "user_id,session_id,question_id", ignoreDuplicates: true });

  if (insertError) {
    throw new Error(`[mistake] upsert failed: ${insertError.message}`);
  }
}
```

**RLS note:** `questions` RLS allows authenticated reads only for `status = 'live'`. Questions in a just-submitted session are live. If a question was retired between session start and submit, `topicByQuestion` entry is absent and `topic_id` is stored as null — acceptable.

---

##### Wire-up in `src/app/test/actions.ts`

Add import at top:

```typescript
import { createMistakeItemsJob } from "@/lib/jobs/handlers/create-mistake-items";
```

In `submitSessionAction`, after the existing mastery try/catch block, add a second non-fatal block:

```typescript
if (result.resultId && !wasAlreadyScored) {
  try {
    await updateMasteryJob(result.resultId, createSupabaseMasteryRepository(supabase));
  } catch (masteryError) {
    console.error("[mastery] update failed for result", result.resultId, masteryError);
  }
  try {
    await createMistakeItemsJob(result.resultId, supabase);
  } catch (mistakeError) {
    console.error("[mistake] create failed for result", result.resultId, mistakeError);
  }
}
```

Mastery runs first (higher priority signal). Both are non-fatal and guarded by `!wasAlreadyScored`.

---

##### `src/tests/unit/mistake-classification.test.ts` — required test cases

Use `describe("classifyMistake", ...)` with `it(...)` per case. All test pure `classifyMistake` — no Supabase mock needed.

| # | isCorrect | confidence | markedReview | Expected |
|---|---|---|---|---|
| 1 | `false` | `"sure"` | `false` | `"overconfidence"` |
| 2 | `false` | `"unsure"` | `false` | `"conceptual_gap"` |
| 3 | `false` | `null` | `false` | `"conceptual_gap"` |
| 4 | `false` | `"guessed"` | `false` | `"conceptual_gap"` (wrong takes priority over guessed) |
| 5 | `false` | `"sure"` | `true` | `"overconfidence"` (wrong+sure beats marked_review) |
| 6 | `null` | `null` | `false` | `"not_attempted"` |
| 7 | `null` | `"guessed"` | `false` | `"not_attempted"` (null is_correct beats confidence) |
| 8 | `true` | `"guessed"` | `false` | `"lucky_guess"` |
| 9 | `true` | `null` | `true` | `"bookmarked"` |
| 10 | `true` | `"sure"` | `true` | `"bookmarked"` |
| 11 | `true` | `"sure"` | `false` | `null` (correct, not guessed, not bookmarked → no mistake) |
| 12 | `true` | `"unsure"` | `false` | `null` (correct, not guessed, not bookmarked → no mistake) |

---

##### `scripts/smoke-mistake-items.js` — structure

Follow the same pattern as `scripts/smoke-mastery-update.js`:

- Uses `postgres` client with `DATABASE_URL` directly.
- Self-contained JS implementation of the job logic (no TypeScript import).
- Seed data: 4 questions (mcq, UPSC exam, one per scenario).
- Fixed diagnostic session (not benchmark — simpler, no template needed).

**Seed scenario → classification mapping:**

| Q# | Answer saved | Confidence | `marked_review` | Expected `mistake_type` |
|---|---|---|---|---|
| Q1 | wrong option | `"sure"` | `false` | `"overconfidence"` |
| Q2 | wrong option | `"unsure"` | `false` | `"conceptual_gap"` |
| Q3 | no answer (skip) | `null` | `false` | `"not_attempted"` |
| Q4 | correct option | `"guessed"` | `false` | `"lucky_guess"` |

**Post-job assertions:**

1. `mistake_items` count for session = 4.
2. One row per expected `mistake_type`.
3. `topic_id` is non-null for each row (questions have `topic_id`).
4. `user_id` matches the seeded user.
5. `status = 'unresolved'` for all rows.

**Idempotency test:**

Call `createMistakeItemsJob` logic a second time with the same `result_id`. Assert row count is still 4 (not 8). The `ignoreDuplicates: true` + unique constraint makes this safe.

**JS job implementation in the smoke script:**

The smoke script must reimplement `createMistakeItemsJob` using raw SQL, not the TypeScript module. Use the same five-step pattern (result lookup → answers → topics → concepts → classify + insert). For the insert, use:

```sql
insert into public.mistake_items (
  user_id, exam_id, question_id, session_id,
  topic_id, concept_id, mistake_type, confidence, status
)
values (...)
on conflict (user_id, session_id, question_id) do nothing
```

**Diagnostic session note:** For a diagnostic session, use `start_test_session(examId, 'diagnostic', null, null, 4, null, 'bronze')`. No template needed. Seed the questions to be the only available live questions in a throwaway `topic_id` scope — or alternatively reuse the fixed-question approach from `smoke-mastery-update.js` but with a diagnostic session type.

Actually the simpler approach: use UPSC Prelims existing topics and seed 4 questions there (same as mastery smoke), start a diagnostic session, manually set the session answers via direct insert, then run the submit RPC and the job.

**Cleanup:** Delete `mistake_items` for the user, the `test_sessions` row, any seeded questions/concepts, and the `auth.users` row. Same cleanup pattern as mastery smoke.

---

##### TSP-060 verification gates

```powershell
corepack pnpm exec vitest run src/tests/unit/mistake-classification.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
node scripts/smoke-mistake-items.js
```

All must exit 0 before marking TSP-060 Done.

---

#### Tracker and process doc updates (Builder)

After both tickets pass gates:

1. `trackers/JIRA_TRACKER.csv` — TSP-059: `Backlog → Done`, Owner = Builder, Builder Remarks = "mistake_items + retest_queue migration with RLS and indexes".
2. `trackers/JIRA_TRACKER.csv` — TSP-060: `Backlog → Done`, Owner = Builder, Builder Remarks = "classifyMistake + createMistakeItemsJob + 12-case unit tests + smoke".
3. `docs/process/SESSION_STATE.md` — add Session 14 completed note, update Next Recommended Work.
4. Append Builder Handoff section to `docs/process/HANDOFF.md`.
5. One commit per ticket (`git commit -m "TSP-059: mistake notebook schema"` and `git commit -m "TSP-060: create mistake items on submit"`).

---

#### Known issues to track

**S14-A (non-blocking):** `question_concepts` RLS allows reads only for `status = 'live'` questions. If a question is retired between session start and submit, `concept_id` will be null in the mistake row. Acceptable for MVP; fix if it becomes a data quality issue.

**S14-B (defer to TSP-062):** `retest_queue` table is created here but never populated by Session 14 code. TSP-062 (Session 15) adds the scheduler that creates retest queue rows from mistake_items.

---

### 2026-06-02 - Session 14 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-059` mistake notebook schema.
- Implemented `TSP-060` mistake item creation after submit.
- Committed `TSP-059` separately as `39a1955` (`TSP-059: mistake notebook schema`).

Files changed:

- `supabase/migrations/202606020001_mistake_notebook.sql`
- `src/lib/jobs/handlers/create-mistake-items.ts`
- `src/tests/unit/mistake-classification.test.ts`
- `scripts/smoke-mistake-items.js`
- `src/app/test/actions.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/CHANGELOG.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `mistake_items` with `unique (user_id, session_id, question_id)`, owner RLS policies, authenticated grants, and the required query indexes.
- Added `retest_queue` with topic/concept XOR, owner RLS policies, authenticated grants, due/status indexes, and an `updated_at` trigger.
- Added pure `classifyMistake` with the locked priority order: overconfidence, conceptual_gap, not_attempted, lucky_guess, bookmarked.
- Added `createMistakeItemsJob`, which loads result context, scored answers, question topics, primary concepts, classifies qualifying answers, and upserts with `ignoreDuplicates: true`.
- Wired `submitSessionAction` to run mistake item creation after mastery, guarded by `!wasAlreadyScored` and wrapped in a non-fatal try/catch.
- Added a self-contained raw-SQL smoke script. It uses a fixed benchmark template, not diagnostic random selection, to guarantee the four seeded questions are selected in live DB.

Verification:

- `node run-migrations.js` exited 0 and applied `202606020001_mistake_notebook.sql`.
- `node --check scripts/smoke-mistake-items.js` exited 0.
- `corepack pnpm exec vitest run src/tests/unit/mistake-classification.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node scripts/smoke-mistake-items.js` exited 0 live:

```json
{
  "ok": true,
  "sessionId": "79e0996b-3bf8-4d5c-b0d1-2e63864ef40c",
  "resultId": "03f5b243-94c7-4d2a-8543-64232ca6712b",
  "mistakeRows": 4,
  "mistakeTypes": [
    "conceptual_gap",
    "lucky_guess",
    "not_attempted",
    "overconfidence"
  ],
  "idempotent": true
}
```

Sanity review focus:

1. Duplicate submit is guarded by `!wasAlreadyScored` before the mistake job runs in the server action.
2. Job idempotency is enforced by `unique (user_id, session_id, question_id)` plus `onConflict: "user_id,session_id,question_id"` and `ignoreDuplicates: true`.
3. `not_attempted` requires a `session_answers` row with `selected_answer = null`; this matches the current save path when a skipped answer is saved.
4. `question_concepts` RLS can still return no concept if a question is retired between start and submit; the job stores `concept_id = null` in that case.
5. `retest_queue` remains unpopulated until `TSP-062`.

### 2026-06-02 - Session 14 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-059 — migration, TSP-060 — `classifyMistake`, `createMistakeItemsJob`, wire-up, unit tests, smoke.

**Overall: PASS. TSP-059 → Done. TSP-060 → Done.**

---

**S1 — Migration (TSP-059): PASS.**  
`mistake_items` has `UNIQUE (user_id, session_id, question_id)`, all seven `mistake_type` values, all five `status` values, owner RLS policies with both `using` and `with check`, and authenticated grants. `retest_queue` has the topic/concept XOR check, matching RLS, grants, and an `updated_at` trigger wired to `public.set_updated_at()` which was defined in migration 1. Both tables enable RLS before policies are attached. All indexes from spec present.

**S2 — `classifyMistake` priority order (TSP-060): PASS.**  
Priority is exact: overconfidence (wrong+sure) → conceptual_gap (wrong, any other confidence) → not_attempted (null is_correct) → lucky_guess (correct+guessed) → bookmarked (correct+marked_review) → null. The `toAnswerConfidence` guard sanitizes raw DB strings before they reach the classifier.

**S3 — `createMistakeItemsJob` idempotency and error handling: PASS.**  
Upsert uses `onConflict: "user_id,session_id,question_id"` with `ignoreDuplicates: true`. This matches the unique constraint exactly. Both `loadQuestionTopics` and `loadPrimaryConcepts` throw on DB error, which propagates to the non-fatal catch in `submitSessionAction` — submit always returns `ok: true`. If queries return zero rows (RLS filtered, non-live question), maps are simply empty and `topic_id`/`concept_id` land as null — job still runs.

**S4 — Wire-up in `submitSessionAction`: PASS.**  
Mistake job runs inside `if (result.resultId && !wasAlreadyScored)`, same guard as mastery. Both jobs have separate try/catch blocks. Mastery runs first. Mistake failure never breaks submit or mastery.

**S5 — Unit tests: PASS.**  
All 12 planned cases present and correctly mapped. Table-driven structure is clean.

**S6 — Smoke: PASS.**  
Live smoke produced 4 rows (overconfidence, conceptual_gap, not_attempted, lucky_guess). Two idempotency checks: second job run on same result_id, and duplicate submit. Both confirmed 4 rows unchanged. Builder used a fixed benchmark template (same pattern as mastery smoke) instead of diagnostic random selection — this is correct, guarantees the seeded questions are selected.

---

**Known issues:**

**S14-A (non-blocking, carry forward):** `questions` RLS filters to `status = 'live'` only. If a question is retired after session start but before submit, `topic_id` will be null in the mistake_item. Acceptable for MVP.

**S14-B (by design):** `retest_queue` schema created here but unpopulated. TSP-062 (Session 15) adds the scheduler.

**S14-C (note):** Questions the student never interacted with (no `session_answers` row) are not captured as `not_attempted`. Only explicitly saved skips (upserted with `selected_answer = null`) produce a `not_attempted` row. This is a reasonable scope boundary for the autosave-driven UI flow. Revisit if session analysis needs full coverage of unattempted questions.

---

**Next session:** Session 15 — TSP-062 (simple retest scheduler). Reads `mistake_items` to populate `retest_queue` based on priority, recency, and repeated failure. TSP-062 completion unblocks TSP-076 (dashboard overview API).

---

### 2026-06-02 - Session 15 Plan (M4 second slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M4 Dashboard & Retention  
**Ticket:** TSP-062 — Implement simple retest scheduler  
**Prerequisites complete:** TSP-059 `retest_queue` schema (Done), TSP-060 `mistake_items` creation (Done)

---

#### Overview

Session 15 adds the simple retest scheduler: logic that reads the current session's `mistake_items` and populates `retest_queue` so the dashboard can surface due retests.

**No new migration** — `retest_queue` was created by TSP-059.

The pure computation module lives at `src/lib/adaptive/simple-scheduler.ts` (per TRD file structure, Section 2). The job lives at `src/lib/jobs/handlers/update-retest-queue.ts`. Wire-up is a third non-fatal call in `submitSessionAction` after mastery and mistakes.

**TSP-063 (concept retest sessions) and TSP-064 (FSRS) are out of scope.** `computeRetestSchedule` is defined here for completeness and so TSP-063 can import it, but it is not wired to any DB call in this session.

---

#### Key design decisions

**1. Granularity: concept-level, topic fallback.**  
One `retest_queue` row per `concept_id` per user per exam when concept is known. When `mistake_item.concept_id` is null, fall back to `topic_id`. The `retest_queue` XOR constraint enforces one or the other.

**2. Dedup: check-then-insert/update.**  
No unique constraint on `retest_queue`. Query for an existing `status IN ('due', 'scheduled', 'snoozed')` row for the same (user, exam, concept/topic). If found: `UPDATE priority = MAX(existing, new)`. If not found: `INSERT`. Completed/cancelled historical rows are left untouched.

**3. Priority formula:**
```
basePriority = max of MISTAKE_TYPE_PRIORITY values for current session's mistakes on this concept
  overconfidence → 3, conceptual_gap → 2, not_attempted → 1, lucky_guess → 1, bookmarked → 0.5
topicBoost = (topicWeightPercent / 100) × 2   (0 if null or unknown)
priority = clamp(basePriority + topicBoost, 0, 10)
```

**4. Initial `due_at`: now + 1 day.** After-retest update is TSP-063.

**5. `scheduler_state` (JSONB):**
```json
{ "intervalDays": 1, "repetitions": 0, "lapses": 0, "lastReviewedAt": null }
```

---

#### `src/lib/adaptive/simple-scheduler.ts` — full spec

New directory and file. Exports named constants and two pure functions.

```typescript
export const MISTAKE_TYPE_PRIORITY: Record<string, number> = {
  overconfidence: 3,
  conceptual_gap: 2,
  not_attempted: 1,
  lucky_guess: 1,
  bookmarked: 0.5,
};

export const INTERVAL_DAYS_SEQUENCE = [1, 2, 4, 8, 14, 21, 30] as const;
export const MAX_PRIORITY = 10;
export const TOPIC_BOOST_SCALE = 2; // max bonus for a 100%-weight topic

export type SchedulerState = {
  intervalDays: number;
  repetitions: number;   // successful review count
  lapses: number;        // failed review count
  lastReviewedAt: string | null;
};

export type InitialScheduleInput = {
  mistakeTypes: string[];
  topicWeightPercent: number | null;
};

export type RetestOutcome = "pass" | "fail";

export type ScheduleResult = {
  dueAt: Date;
  priority: number;
  schedulerState: SchedulerState;
};

/**
 * Computes the first retest schedule for a concept that just appeared
 * in mistake_items. nowMs is injectable for deterministic tests.
 */
export function computeInitialSchedule(
  input: InitialScheduleInput,
  nowMs?: number
): ScheduleResult {
  const now = new Date(nowMs ?? Date.now());
  const basePriority =
    input.mistakeTypes.length > 0
      ? Math.max(...input.mistakeTypes.map((t) => MISTAKE_TYPE_PRIORITY[t] ?? 0))
      : 0;
  const topicBoost =
    input.topicWeightPercent !== null
      ? (input.topicWeightPercent / 100) * TOPIC_BOOST_SCALE
      : 0;
  const priority = Math.min(MAX_PRIORITY, basePriority + topicBoost);
  const intervalDays = INTERVAL_DAYS_SEQUENCE[0]; // 1
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return {
    dueAt,
    priority,
    schedulerState: { intervalDays, repetitions: 0, lapses: 0, lastReviewedAt: null },
  };
}

/**
 * Computes the updated schedule after a retest session outcome.
 * Called by TSP-063 after concept retest scoring. Not wired in this session.
 * Pass → doubles interval, lowers priority. Fail → resets to 1 day, raises priority.
 */
export function computeRetestSchedule(
  outcome: RetestOutcome,
  existingState: SchedulerState,
  topicWeightPercent: number | null,
  nowMs?: number
): ScheduleResult {
  const now = new Date(nowMs ?? Date.now());
  const nowIso = now.toISOString();
  const topicBoost =
    topicWeightPercent !== null
      ? (topicWeightPercent / 100) * TOPIC_BOOST_SCALE
      : 0;

  if (outcome === "pass") {
    const newRepetitions = existingState.repetitions + 1;
    const idx = Math.min(newRepetitions, INTERVAL_DAYS_SEQUENCE.length - 1);
    const intervalDays = INTERVAL_DAYS_SEQUENCE[idx];
    return {
      dueAt: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
      priority: Math.min(MAX_PRIORITY, 1 + topicBoost),
      schedulerState: {
        intervalDays,
        repetitions: newRepetitions,
        lapses: existingState.lapses,
        lastReviewedAt: nowIso,
      },
    };
  }

  // fail
  const newLapses = existingState.lapses + 1;
  const lapseBoost = Math.min(newLapses, 3) * 0.5; // +0.5/lapse, max +1.5
  return {
    dueAt: new Date(now.getTime() + INTERVAL_DAYS_SEQUENCE[0] * 24 * 60 * 60 * 1000),
    priority: Math.min(MAX_PRIORITY, 2 + lapseBoost + topicBoost),
    schedulerState: {
      intervalDays: INTERVAL_DAYS_SEQUENCE[0],
      repetitions: 0, // reset on lapse
      lapses: newLapses,
      lastReviewedAt: nowIso,
    },
  };
}
```

---

#### `src/lib/jobs/handlers/update-retest-queue.ts` — full spec

New file. Same structural pattern as `create-mistake-items.ts`.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeInitialSchedule } from "@/lib/adaptive/simple-scheduler";

type ResultRow = { session_id: string; user_id: string; exam_id: string };
type MistakeRow = { concept_id: string | null; topic_id: string | null; mistake_type: string };
type TopicRow = { id: string; weight_percent: number | string | null };
type ActiveRetestRow = { id: string; priority: number | string };

export async function updateRetestQueueJob(
  resultId: string,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Session context
  const { data: result, error: resultError } = await supabase
    .from("session_results")
    .select("session_id,user_id,exam_id")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError || !result) {
    throw new Error(
      `[retest] session_results lookup failed for ${resultId}: ${resultError?.message ?? "not found"}`
    );
  }

  const { session_id: sessionId, user_id: userId, exam_id: examId } = result as ResultRow;

  // 2. Unresolved mistake_items for this session
  const { data: mistakes, error: mistakeError } = await supabase
    .from("mistake_items")
    .select("concept_id,topic_id,mistake_type")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("status", "unresolved");

  if (mistakeError) {
    throw new Error(`[retest] mistake_items lookup failed: ${mistakeError.message}`);
  }

  const mistakeRows = (mistakes ?? []) as MistakeRow[];
  if (mistakeRows.length === 0) return;

  // 3. Group by concept_id (preferred) or topic_id (fallback).
  // Key: "concept:<uuid>" or "topic:<uuid>"
  const groups = new Map<
    string,
    { conceptId: string | null; topicId: string | null; mistakeTypes: string[] }
  >();

  for (const row of mistakeRows) {
    const key = row.concept_id ? `concept:${row.concept_id}` : `topic:${row.topic_id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.mistakeTypes.push(row.mistake_type);
    } else {
      groups.set(key, {
        conceptId: row.concept_id,
        topicId: row.concept_id ? null : row.topic_id,
        mistakeTypes: [row.mistake_type],
      });
    }
  }

  // 4. Topic weights for all topic_ids involved
  const topicIds = [...new Set(
    [...groups.values()].map((g) => g.topicId).filter(Boolean) as string[]
  )];
  const topicWeightMap = new Map<string, number>();

  if (topicIds.length > 0) {
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id,weight_percent")
      .in("id", topicIds);

    for (const t of (topicRows ?? []) as TopicRow[]) {
      const w = typeof t.weight_percent === "string"
        ? Number(t.weight_percent)
        : (t.weight_percent ?? null);
      if (t.id && w !== null && Number.isFinite(w)) {
        topicWeightMap.set(t.id, w);
      }
    }
  }

  // 5. Insert or update priority for each group
  const nowMs = Date.now();

  for (const group of groups.values()) {
    const topicWeight = group.topicId ? (topicWeightMap.get(group.topicId) ?? null) : null;
    const { dueAt, priority, schedulerState } = computeInitialSchedule(
      { mistakeTypes: group.mistakeTypes, topicWeightPercent: topicWeight },
      nowMs
    );

    const activeRow = await findActiveRetestRow(
      supabase, userId, examId, group.conceptId, group.topicId
    );

    if (activeRow) {
      const existing = typeof activeRow.priority === "string"
        ? Number(activeRow.priority)
        : activeRow.priority;
      if (priority > existing) {
        await supabase
          .from("retest_queue")
          .update({ priority, updated_at: new Date(nowMs).toISOString() })
          .eq("id", activeRow.id);
      }
    } else {
      await supabase.from("retest_queue").insert({
        user_id: userId,
        exam_id: examId,
        concept_id: group.conceptId,
        topic_id: group.topicId,
        due_at: dueAt.toISOString(),
        scheduler: "simple",
        scheduler_state: schedulerState,
        priority,
        status: "due",
      });
    }
  }
}

async function findActiveRetestRow(
  supabase: SupabaseClient,
  userId: string,
  examId: string,
  conceptId: string | null,
  topicId: string | null
): Promise<ActiveRetestRow | null> {
  if (conceptId) {
    const { data } = await supabase
      .from("retest_queue")
      .select("id,priority")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .eq("concept_id", conceptId)
      .in("status", ["due", "scheduled", "snoozed"])
      .limit(1);
    return ((data ?? []) as ActiveRetestRow[])[0] ?? null;
  }
  // topic-level: use .is() for null column filter (not .eq())
  const { data } = await supabase
    .from("retest_queue")
    .select("id,priority")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("topic_id", topicId)
    .is("concept_id", null)
    .in("status", ["due", "scheduled", "snoozed"])
    .limit(1);
  return ((data ?? []) as ActiveRetestRow[])[0] ?? null;
}
```

---

#### Wire-up in `src/app/test/actions.ts`

Add import:
```typescript
import { updateRetestQueueJob } from "@/lib/jobs/handlers/update-retest-queue";
```

In `submitSessionAction`, after the existing mastery + mistake try/catch blocks, add:

```typescript
  try {
    await updateRetestQueueJob(result.resultId, supabase);
  } catch (retestError) {
    console.error("[retest] update failed for result", result.resultId, retestError);
  }
```

All three jobs remain inside `if (result.resultId && !wasAlreadyScored)`. Order: mastery → mistakes → retest queue.

---

#### `src/tests/unit/simple-scheduler.test.ts` — required test cases

```typescript
const NOW = Date.UTC(2026, 5, 2, 12, 0, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;
```

**`computeInitialSchedule` (9 cases):**

| # | mistakeTypes | topicWeightPercent | Expected priority | dueAt offset |
|---|---|---|---|---|
| 1 | `["overconfidence"]` | `null` | `3` | `+1 day` |
| 2 | `["conceptual_gap"]` | `null` | `2` | `+1 day` |
| 3 | `["lucky_guess"]` | `null` | `1` | `+1 day` |
| 4 | `["overconfidence","conceptual_gap"]` | `null` | `3` (takes max) | `+1 day` |
| 5 | `["overconfidence"]` | `50` | `4` (3 + 1) | `+1 day` |
| 6 | `["overconfidence"]` | `100` | `5` (3 + 2) | `+1 day` |
| 7 | `["overconfidence"]` | `350` | `10` (capped) | `+1 day` |
| 8 | `[]` | `null` | `0` | `+1 day` |
| 9 | `["bookmarked"]` | `0` | `0.5` | `+1 day` |

Case 1 also verify: `schedulerState = { intervalDays: 1, repetitions: 0, lapses: 0, lastReviewedAt: null }`.

**`computeRetestSchedule` (6 cases):**

| # | outcome | existing state | topicWeight | Expected intervalDays | Expected priority |
|---|---|---|---|---|---|
| 10 | `"pass"` | `{ intervalDays:1, repetitions:0, lapses:0, lastReviewedAt:null }` | `null` | `2` | `1` |
| 11 | `"pass"` | `{ intervalDays:2, repetitions:1, lapses:0, lastReviewedAt:null }` | `null` | `4` | `1` |
| 12 | `"pass"` | `{ intervalDays:21, repetitions:5, lapses:0, lastReviewedAt:null }` | `null` | `30` (last in seq) | `1` |
| 13 | `"fail"` | `{ intervalDays:8, repetitions:3, lapses:0, lastReviewedAt:null }` | `null` | `1` (reset) | `2.5` (2 + 0.5) |
| 14 | `"fail"` | `{ intervalDays:1, repetitions:0, lapses:2, lastReviewedAt:null }` | `null` | `1` | `3.5` (2 + 1.5) |
| 15 | `"pass"` | `{ intervalDays:1, repetitions:0, lapses:0, lastReviewedAt:null }` | `50` | `2` | `2` (1 + 1) |

Case 10: verify `repetitions = 1` and `lastReviewedAt` is non-null ISO string.
Case 13: verify `repetitions = 0` (reset) and `lapses = 1`.

---

#### `scripts/smoke-retest-queue.js` — structure

Same pattern as `smoke-mastery-update.js`. Direct `postgres` client, self-contained JS.

**Seed:** Same 4-question fixed benchmark as mistake smoke (overconfidence, conceptual_gap, not_attempted, lucky_guess). Reuse the same seeding approach.

**Inline JS functions:**
1. `runMistakeJob(sql, userId, sessionId, examId)` — SQL insert for `mistake_items` (inline version of TSP-060 job)
2. `runRetestQueueJob(sql, userId, sessionId, examId, topicId)` — SQL version of `updateRetestQueueJob`

For `runRetestQueueJob`:
```sql
-- Step 1: load mistake_items
select concept_id, topic_id, mistake_type
from public.mistake_items
where session_id = $sessionId and user_id = $userId and status = 'unresolved'

-- Step 2: load topic weight
select weight_percent from public.topics where id = $topicId

-- Step 3: for each concept group
-- Check active row:
select id, priority from public.retest_queue
where user_id = $userId and exam_id = $examId and concept_id = $conceptId
  and status in ('due', 'scheduled', 'snoozed')
limit 1

-- If none: insert
insert into public.retest_queue (
  user_id, exam_id, concept_id, topic_id,
  due_at, scheduler, scheduler_state, priority, status
) values (...)
```

**Assertions:**
1. At least 1 `retest_queue` row for `(user_id, exam_id)` with `status = 'due'`
2. All rows have `scheduler = 'simple'`
3. `due_at` is between now and now + 2 days
4. Highest-priority row corresponds to the concept with `overconfidence` mistake type
5. `scheduler_state` is valid JSON with `intervalDays = 1`

**Idempotency:**
- Run `runRetestQueueJob` again
- Assert row count unchanged (same concepts, same active rows)
- Assert priority same or higher (never decremented)

**Cleanup:** Delete `retest_queue` rows, `mistake_items`, `test_sessions`, questions, concepts, `auth.users`.

---

#### Known issues

**S15-A:** `updateRetestQueueJob` reads only the current session's `mistake_items`. Historical unresolved mistakes from prior sessions are not aggregated into priority. Priority is correct per-session but does not compound across sessions for repeated failures. Fix: add a second query counting all unresolved `mistake_items` for this concept to add a `failureCount` boost. Defer to TSP-062 follow-on or TSP-129.

**S15-B:** No unique constraint on `retest_queue (user_id, exam_id, concept_id)`. Concurrent submits could create duplicate `due` rows. Acceptable for MVP (non-concurrent post-submit job).

---

### 2026-06-02 - Session 15 Builder Handoff - Codex

Scope completed:

- Implemented `TSP-062` simple retest scheduler from the Session 15 Architect plan.
- Marked `TSP-062` Done after local gates and live DB smoke passed.

Files changed:

- `src/lib/adaptive/simple-scheduler.ts`
- `src/tests/unit/simple-scheduler.test.ts`
- `src/lib/jobs/handlers/update-retest-queue.ts`
- `scripts/smoke-retest-queue.js`
- `src/app/test/actions.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/CHANGELOG.md`
- `docs/process/HANDOFF.md`

What changed:

- Added pure scheduler constants and functions: `MISTAKE_TYPE_PRIORITY`, `INTERVAL_DAYS_SEQUENCE`, `MAX_PRIORITY`, `TOPIC_BOOST_SCALE`, `computeInitialSchedule`, and `computeRetestSchedule`.
- Added 15 deterministic scheduler tests covering initial priority, topic boost, cap behavior, empty/bookmarked cases, pass/fail interval behavior, lapse priority, and `lastReviewedAt`.
- Added `updateRetestQueueJob`, which loads the scored result, reads unresolved current-session mistake rows, groups by concept with topic fallback, loads topic weights for fallback rows, then creates or updates active retest queue rows.
- `findActiveRetestRow` uses `.is("concept_id", null)` for topic-level lookup and `.is("topic_id", null)` for concept-level lookup.
- Wired `submitSessionAction` to run `updateRetestQueueJob` after mastery and mistake item creation, guarded by `!wasAlreadyScored` and wrapped in a non-fatal try/catch.
- Added a self-contained raw-SQL smoke script that seeds the same four mistake scenarios, creates mistake rows, populates `retest_queue`, and checks idempotency.

Verification:

- `node --check scripts/smoke-retest-queue.js` exited 0.
- `corepack pnpm exec vitest run src/tests/unit/simple-scheduler.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node scripts/smoke-retest-queue.js` exited 0 live:

```json
{
  "ok": true,
  "sessionId": "7f27ed00-82f3-4e72-a99f-8f32760f5b42",
  "resultId": "1b518337-e1c3-4a28-b307-176af617376a",
  "retestRows": 4,
  "highestPriority": 3,
  "highestPriorityMistakeType": "overconfidence",
  "idempotent": true
}
```

Sanity review focus:

1. Retest queue update remains non-fatal and runs only on first submit inside `!wasAlreadyScored`.
2. Topic-level active-row lookup uses `.is("concept_id", null)`, not `.eq("concept_id", null)`.
3. Concept-level rows store `concept_id` and `topic_id = null` to satisfy the retest queue XOR constraint.
4. Existing active rows are updated only when the new priority is higher; priority is never decremented.
5. Current-session mistake rows only are considered; historical unresolved mistake aggregation remains deferred per S15-A.
6. No unique constraint exists on `retest_queue`, so the job is idempotent for serial reruns but not concurrency-safe per S15-B.

### 2026-06-03 - Session 15 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-062 — `simple-scheduler.ts`, `update-retest-queue.ts`, unit tests, smoke, wire-up.

**Overall: PASS. TSP-062 → Done.**

---

**S1 — Pure scheduler functions: PASS.**  
`computeInitialSchedule`: priority = max(type priorities) + topicBoost, clamped 0–10. `computeTopicBoost` guards non-finite values. `clampPriority` guards negative and non-finite. `nowMs` injectable confirmed. Initial `schedulerState` correctly has `{ intervalDays:1, repetitions:0, lapses:0, lastReviewedAt:null }`.

**S2 — `computeRetestSchedule` pass path: PASS.**  
Interval advances via `INTERVAL_DAYS_SEQUENCE[min(newRepetitions, len-1)]`. `repetitions++`. `lapses` preserved. `lastReviewedAt` set to ISO string. Priority drops to `1 + topicBoost`.

**S3 — `computeRetestSchedule` fail path: PASS.**  
Interval resets to `INTERVAL_DAYS_SEQUENCE[0]` (1 day). `repetitions` resets to 0. `lapses++`. `lapseBoost = min(lapses, 3) × 0.5` (max +1.5). `lastReviewedAt` set. Priority = `2 + lapseBoost + topicBoost`.

**S4 — `findActiveRetestRow` null-column filters: PASS.**  
Concept-level path uses `.is("topic_id", null)` to enforce XOR. Topic-level path uses `.is("concept_id", null)`. Both use `.in("status", ACTIVE_RETEST_STATUSES)`. Both throw on DB error. This is one defensive step beyond spec — correct.

**S5 — `groupMistakes` edge case: PASS.**  
Rows where both `concept_id` and `topic_id` are null are silently skipped. Not in spec but correct — prevents a null-key group from entering the map and causing a meaningless insert.

**S6 — Priority update guard: PASS.**  
`updatePriorityIfHigher` uses strict `>` (not `>=`), so re-running with equal priority skips the update. Idempotent for same priority, bumping only on genuine escalation.

**S7 — Insert error propagates: PASS.**  
`insertError` throws rather than silently continuing. Combined with non-fatal catch in `submitSessionAction`, this ensures submit always returns `ok: true` while logging any insertion failure.

**S8 — Wire-up: PASS.**  
Third job inside `if (result.resultId && !wasAlreadyScored)`. Non-fatal. Order: mastery → mistakes → retest queue.

**S9 — Unit tests: PASS.**  
All 15 planned cases present. Constants are asserted inline on the first overconfidence case (S1-style contract test). `state()` helper keeps test cases concise. `lastReviewedAt` verified as ISO string on pass and fail cases.

**S10 — Live smoke: PASS.**  
4 `retest_queue` rows from 4 distinct concepts. Highest priority row corresponds to `overconfidence` mistake. Idempotent on second run. `scheduler = 'simple'`, initial `schedulerState` verified.

---

**Known issues (carry forward):**

**S15-A (non-blocking):** Only current session's `mistake_items` are read. Historical unresolved mistakes for the same concept do not compound into priority. Fix: additional count query on all unresolved `mistake_items` for (user, exam, concept). Defer to TSP-129 or a cleanup pass before M4 launch.

**S15-B (non-blocking):** No unique constraint on `retest_queue`. Serial rerun is idempotent (check-then-insert). Concurrent submits could create duplicate `due` rows. Acceptable for MVP.

---

**M4 learning loop is now complete:** submit → mastery update → mistake_items → retest_queue. All TSP-056, TSP-059, TSP-060, TSP-062 are Done.

**Next session:** Session 16 — TSP-076 (dashboard overview API). Both dependencies now satisfied: TSP-056 ✅ and TSP-062 ✅. Session 16 builds the server-side API route that returns readiness score, due retest count, weak topics, and recent sessions — the data layer the dashboard widgets consume.

---

### 2026-06-03 - Session 16 Plan (M4 third slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M4 Dashboard & Retention  
**Ticket:** TSP-076 — Build dashboard overview API  
**Dependencies complete:** TSP-056 readiness score ✅, TSP-062 retest queue ✅

---

#### Overview

Session 16 builds the aggregation layer the dashboard widgets consume. One function, five data sources, one server action wrapper.

**No new migration, no new DB table, no smoke script.** All underlying tables exist. This is TypeScript only.

**Scope:** data layer only — no `/dashboard` page, no UI widgets. Those come in Session 17 (TSP-078 readiness card + TSP-079 weak topics widget). The `getDashboardOverviewAction` server action is callable from a page, but the page itself is not built here.

---

#### Return shape: `DashboardOverview`

```typescript
export type DashboardOverview = {
  examId: string;
  readiness: ReadinessScore;          // from existing fetchReadinessScore
  weakTopics: WeakTopic[];            // top 5 by weight × mastery gap; includes uncovered topics
  dueRetests: DueRetest[];            // up to 10, sorted due_at ASC then priority DESC
  overdueRetestCount: number;         // count where due_at <= now
  recentSessions: RecentSession[];    // last 5 scored sessions
  unresolvedMistakeCount: number;     // total unresolved mistake_items
  strategyMetrics: StrategyMetrics | null; // from most recent session_results.strategy_metrics
};
```

**Why include `strategyMetrics` here:** `session_results.strategy_metrics` already exists from TSP-054 with no additional queries needed. The dashboard overview is the right place to surface it — widget TSP-081 will consume it from this response.

---

#### Data sources and queries

**1. Readiness** — call `fetchReadinessScore(supabase, userId, examId)` (existing, already gracefully degrades).

**2. Weak topics** — two queries merged in TypeScript:
- `topics` WHERE `exam_id=X AND weight_percent IS NOT NULL` → all weighted topics with names
- `mastery_records` WHERE `user_id=X AND exam_id=Y AND topic_id IS NOT NULL` → existing topic mastery

Merge: each topic gets its mastery_score from the record, or `0` if no record yet (unstarted topics with high weight are rightfully high priority). Compute priority score, sort, slice 5.

**Priority formula:**
```
priority = (weightPercent / 100) × (100 − masteryScore)
```
A 20%-weight topic with 0% mastery → priority 20. A 20%-weight topic with 100% mastery → priority 0. Topics with `priority = 0` are filtered out (fully mastered + zero-weight topics).

**3. Due retests** — `retest_queue` WHERE `user_id=X AND exam_id=Y AND status='due'`, ordered `due_at ASC, priority DESC`. Fetch all, count overdue locally (`due_at <= now`), slice to 10 for the list.

**4. Recent sessions** — two queries:
- `session_results` WHERE `user_id=X AND exam_id=Y`, ordered `created_at DESC`, limit 5, including `strategy_metrics`
- `test_sessions` for the returned `session_id`s (to get `type`)
- Merge by `session_id`. `strategyMetrics` from the most recent row.

**5. Unresolved mistake count** — `mistake_items` count WHERE `user_id=X AND exam_id=Y AND status='unresolved'`. Use `{ count: "exact", head: true }`.

---

#### `src/lib/dashboard/overview.ts` — full TypeScript spec

New file. New directory `src/lib/dashboard/` does not yet exist — create it.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchReadinessScore } from "@/lib/scoring/readiness-query";
import type { ReadinessScore } from "@/lib/scoring/readiness";

// ── Public types ────────────────────────────────────────────────────────────

export type WeakTopic = {
  topicId: string;
  topicName: string;
  masteryScore: number;
  weightPercent: number;
  priority: number;
};

export type DueRetest = {
  id: string;
  conceptId: string | null;
  topicId: string | null;
  dueAt: string;
  priority: number;
  scheduler: string;
};

export type RecentSession = {
  sessionId: string;
  type: string;
  score: number;
  maxScore: number;
  accuracy: number;
  createdAt: string;
};

export type StrategyMetrics = {
  negativeMarksLost: number;
  highConfidenceWrong: number;
  correctGuessed: number;
  totalRevisits: number;
  timeOnWrongSec: number;
  timeOnSkippedSec: number;
};

export type DashboardOverview = {
  examId: string;
  readiness: ReadinessScore;
  weakTopics: WeakTopic[];
  dueRetests: DueRetest[];
  overdueRetestCount: number;
  recentSessions: RecentSession[];
  unresolvedMistakeCount: number;
  strategyMetrics: StrategyMetrics | null;
};

// ── Pure helpers (exported for unit tests) ──────────────────────────────────

/** Priority score: higher weight and lower mastery → higher urgency. */
export function computeWeakTopicPriority(
  weightPercent: number,
  masteryScore: number
): number {
  const w = Math.max(0, weightPercent);
  const gap = Math.max(0, 100 - Math.max(0, masteryScore));
  return (w / 100) * gap;
}

type TopicRow = { id: string; name: string; weight_percent: number | string | null };

/**
 * Merges topic list with mastery map. Topics without a mastery record get
 * masteryScore 0 so unstarted high-weight topics appear at the top.
 * Filters out topics with priority 0, sorts descending, returns top 5.
 */
export function buildWeakTopics(
  topics: TopicRow[],
  masteryByTopicId: Map<string, number>
): WeakTopic[] {
  return topics
    .map((topic) => {
      const weightPercent = toNumber(topic.weight_percent);
      const masteryScore = masteryByTopicId.get(topic.id) ?? 0;
      return {
        topicId: topic.id,
        topicName: topic.name,
        masteryScore,
        weightPercent,
        priority: computeWeakTopicPriority(weightPercent, masteryScore),
      };
    })
    .filter((t) => t.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

/**
 * Safely parses strategy_metrics JSONB from session_results.
 * Returns null if input is null/non-object; missing keys default to 0.
 */
export function toStrategyMetrics(value: unknown): StrategyMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  return {
    negativeMarksLost: toNumber(r.negativeMarksLost),
    highConfidenceWrong: toNumber(r.highConfidenceWrong),
    correctGuessed: toNumber(r.correctGuessed),
    totalRevisits: toNumber(r.totalRevisits),
    timeOnWrongSec: toNumber(r.timeOnWrongSec),
    timeOnSkippedSec: toNumber(r.timeOnSkippedSec),
  };
}

// ── Main aggregation ─────────────────────────────────────────────────────────

const READINESS_ZERO: ReadinessScore = {
  score: 0,
  confidenceLevel: "low",
  coveragePercent: 0,
  staleTopicIds: [],
  hasBenchmarkSession: false,
  breakdown: {},
};

export async function fetchDashboardOverview(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<DashboardOverview> {
  const [readinessR, weakR, retestR, sessionsR, mistakeR] = await Promise.allSettled([
    fetchReadinessScore(supabase, userId, examId),
    loadWeakTopics(supabase, userId, examId),
    loadDueRetests(supabase, userId, examId),
    loadRecentSessions(supabase, userId, examId),
    loadUnresolvedMistakeCount(supabase, userId, examId),
  ]);

  return {
    examId,
    readiness: readinessR.status === "fulfilled" ? readinessR.value : READINESS_ZERO,
    weakTopics: weakR.status === "fulfilled" ? weakR.value.weakTopics : [],
    dueRetests: retestR.status === "fulfilled" ? retestR.value.dueRetests : [],
    overdueRetestCount: retestR.status === "fulfilled" ? retestR.value.overdueRetestCount : 0,
    recentSessions: sessionsR.status === "fulfilled" ? sessionsR.value.recentSessions : [],
    unresolvedMistakeCount: mistakeR.status === "fulfilled" ? mistakeR.value : 0,
    strategyMetrics: sessionsR.status === "fulfilled" ? sessionsR.value.strategyMetrics : null,
  };
}

// ── Private fetchers ─────────────────────────────────────────────────────────

async function loadWeakTopics(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ weakTopics: WeakTopic[] }> {
  const [topicResult, masteryResult] = await Promise.all([
    supabase
      .from("topics")
      .select("id,name,weight_percent")
      .eq("exam_id", examId)
      .not("weight_percent", "is", null),
    supabase
      .from("mastery_records")
      .select("topic_id,mastery_score")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .not("topic_id", "is", null),
  ]);

  if (topicResult.error) throw topicResult.error;

  const masteryByTopicId = new Map<string, number>();
  for (const row of (masteryResult.data ?? []) as Array<{
    topic_id: string | null;
    mastery_score: number | string | null;
  }>) {
    if (row.topic_id) masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
  }

  return { weakTopics: buildWeakTopics(topicResult.data as TopicRow[] ?? [], masteryByTopicId) };
}

async function loadDueRetests(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ dueRetests: DueRetest[]; overdueRetestCount: number }> {
  const { data, error } = await supabase
    .from("retest_queue")
    .select("id,concept_id,topic_id,due_at,priority,scheduler")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "due")
    .order("due_at", { ascending: true })
    .order("priority", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    concept_id: string | null;
    topic_id: string | null;
    due_at: string;
    priority: number | string | null;
    scheduler: string;
  }>;

  const now = new Date().toISOString();
  const overdueRetestCount = rows.filter((r) => r.due_at <= now).length;
  const dueRetests: DueRetest[] = rows.slice(0, 10).map((r) => ({
    id: r.id,
    conceptId: r.concept_id,
    topicId: r.topic_id,
    dueAt: r.due_at,
    priority: toNumber(r.priority),
    scheduler: r.scheduler,
  }));

  return { dueRetests, overdueRetestCount };
}

async function loadRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ recentSessions: RecentSession[]; strategyMetrics: StrategyMetrics | null }> {
  const { data: resultRows, error: resultError } = await supabase
    .from("session_results")
    .select("session_id,score,max_score,accuracy,strategy_metrics,created_at")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (resultError) throw resultError;

  const results = (resultRows ?? []) as Array<{
    session_id: string;
    score: number | string;
    max_score: number | string;
    accuracy: number | string;
    strategy_metrics: unknown;
    created_at: string;
  }>;

  if (results.length === 0) return { recentSessions: [], strategyMetrics: null };

  const sessionIds = results.map((r) => r.session_id);
  const { data: sessionRows } = await supabase
    .from("test_sessions")
    .select("id,type")
    .in("id", sessionIds);

  const typeBySessionId = new Map<string, string>();
  for (const s of (sessionRows ?? []) as Array<{ id: string; type: string }>) {
    typeBySessionId.set(s.id, s.type);
  }

  const recentSessions: RecentSession[] = results.map((r) => ({
    sessionId: r.session_id,
    type: typeBySessionId.get(r.session_id) ?? "unknown",
    score: toNumber(r.score),
    maxScore: toNumber(r.max_score),
    accuracy: toNumber(r.accuracy),
    createdAt: r.created_at,
  }));

  return { recentSessions, strategyMetrics: toStrategyMetrics(results[0]?.strategy_metrics) };
}

async function loadUnresolvedMistakeCount(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("mistake_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "unresolved");

  if (error) throw error;
  return count ?? 0;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
```

---

#### `src/app/dashboard/actions.ts` — server action wrapper

New file. New directory `src/app/dashboard/` — create it.

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { fetchDashboardOverview, type DashboardOverview } from "@/lib/dashboard/overview";

export type GetDashboardOverviewState =
  | { ok: true; data: DashboardOverview }
  | { ok: false; message: string };

export async function getDashboardOverviewAction(
  examId: string
): Promise<GetDashboardOverviewState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(examId)) {
    return { ok: false, message: "Valid exam id is required." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  const data = await fetchDashboardOverview(supabase, user.id, examId);
  return { ok: true, data };
}
```

---

#### `src/tests/unit/dashboard-overview.test.ts` — required test cases

Test only the pure exported helpers — no Supabase mock needed for this file.

**`computeWeakTopicPriority` (6 cases):**

| # | weightPercent | masteryScore | Expected priority |
|---|---|---|---|
| 1 | `100` | `0` | `100` |
| 2 | `20` | `50` | `10` (20/100 × 50) |
| 3 | `30` | `100` | `0` (no gap) |
| 4 | `0` | `0` | `0` (no weight) |
| 5 | `50` | `80` | `10` (50/100 × 20) |
| 6 | `100` | `-10` | `110` (gap clamped at min 0 for mastery, but max at 100) — actually `100` since mastery is clamped to 0 |

Wait — case 6: `masteryScore = -10`, `Math.max(0, -10) = 0`, gap = 100, priority = 1 × 100 = 100. Yes.

**`buildWeakTopics` (6 cases):**

| # | Description | Expected |
|---|---|---|
| 7 | Topics sorted by priority descending | highest-weight × highest-gap first |
| 8 | Topic without mastery record → masteryScore 0 | appears if weight > 0 |
| 9 | Topic with mastery 100 → priority 0 → filtered out | not in result |
| 10 | More than 5 topics → result length = 5 | capped |
| 11 | Empty topics array → `[]` | empty |
| 12 | string `weight_percent` (e.g. `"25"`) → parsed via `toNumber` | priority computed correctly |

**`toStrategyMetrics` (4 cases):**

| # | Input | Expected |
|---|---|---|
| 13 | `null` | `null` |
| 14 | `{ negativeMarksLost: 2, highConfidenceWrong: 1, correctGuessed: 3, totalRevisits: 5, timeOnWrongSec: 120, timeOnSkippedSec: 60 }` | all fields parsed correctly |
| 15 | `{}` (empty object) | all fields default to `0` |
| 16 | `{ negativeMarksLost: "1.5", highConfidenceWrong: "2" }` | string values parsed as numbers, rest 0 |

---

#### Tracker and process doc updates (Builder)

After all gates pass:
1. `trackers/JIRA_TRACKER.csv` — TSP-076: `Backlog → Done`, Owner = Builder, Builder Remarks.
2. `docs/process/SESSION_STATE.md` — add Session 16 completed note, update Next Recommended Work.
3. Append Builder Handoff to `docs/process/HANDOFF.md`.
4. One commit: `git commit -m "TSP-076: dashboard overview API"`.

---

#### Verification gates

```powershell
corepack pnpm exec vitest run src/tests/unit/dashboard-overview.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

No `node run-migrations.js`. No smoke script.

---

#### Known issues

**S16-A:** `loadWeakTopics` throws (and degrades to `[]`) if either the topics query or mastery query errors. The mastery query error is swallowed — only the topics query error propagates. This is correct: if we can't get topics we can't compute priority, but if mastery fails we still return all topics as "unstarted" (mastery 0 for all). **Fix:** handle mastery error separately from topic error. Non-blocking for MVP.

**S16-B:** `overdueRetestCount` counts rows fetched (post-limit-10), not the true total. Since we fetch all due rows (no limit on the query) and slice to 10 for the list, the count IS accurate for all due rows. This is intentional — no issue.

**S16-C:** `strategyMetrics` is from the most recent session only. If the user's most recent session has no `strategy_metrics` (e.g. a legacy session from before TSP-054), the field is `null`. Non-blocking.

---

#### Next session (Session 17 — TSP-078 + TSP-079)

Readiness card UI + weak topics widget — the first visible dashboard. Consumes `getDashboardOverviewAction`. Creates `src/app/dashboard/page.tsx`.

---

The Architect spec below was executed by Builder on 2026-05-29 and remains here for Sanity review context.

**Tracker rows:** TSP-149, TSP-090, TSP-091
**Estimated effort:** One builder session (~4–5 hours)
**Planned by:** Architect, 2026-05-29

---

### Step 0 — Attempt pnpm install first

Before writing any code:

```powershell
corepack pnpm install
```

If it succeeds, verification is fully open for this session — run `typecheck`, `lint`, `test`, `build` normally.
If it fails, record the exact error in `docs/process/BLOCKERS.md` and proceed coding. Mark completed rows `Review` (not `Done`) with a remark that verification is pending pnpm repair.

---

### TSP-149 — Audit and complete .env.example

**Priority:** Do this first — 15 minutes, zero risk.
**Gate:** Standard (typecheck only — no TS impact).

Edit `.env.example`. The current file has the right keys but is missing `DATABASE_URL` and all inline comments. Replace the full file content with:

```dotenv
# ── App ──────────────────────────────────────────────────────────────────────
# Public base URL. Used in server actions for redirects and email links.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Supabase ──────────────────────────────────────────────────────────────────
# Project URL and anon key — Supabase dashboard → Settings → API.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Service role key — Supabase dashboard → Settings → API.
# Never expose to the browser. Used only in server-side admin jobs.
SUPABASE_SERVICE_ROLE_KEY=

# Transaction pooler connection string — Supabase dashboard → Settings →
# Database → Connection string → Transaction pooler (port 6543).
# Used by run-migrations.js and server-side admin scripts.
DATABASE_URL=

# ── AI providers ──────────────────────────────────────────────────────────────
# Groq — first AI inference provider (TSP-066). https://console.groq.com/keys
GROQ_API_KEY=

# Anthropic — fallback / future use. https://console.anthropic.com/
ANTHROPIC_API_KEY=

# OpenAI — embeddings and fallback. https://platform.openai.com/api-keys
OPENAI_API_KEY=

# HuggingFace — auto-tagging (Phase 1.5, TSP-124). https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=

# ── Email ─────────────────────────────────────────────────────────────────────
# Resend — transactional email for reminders and digest (TSP-085). https://resend.com/api-keys
RESEND_API_KEY=
# From address for outbound email, e.g. noreply@yourdomain.com
EMAIL_FROM=

# ── Analytics and observability ───────────────────────────────────────────────
# PostHog — product analytics. https://app.posthog.com/project/settings
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry — error tracking (TSP-145). https://sentry.io/settings/
SENTRY_DSN=
```

**Acceptance criteria:** A new developer can identify every secret, understand its purpose, and know where to obtain it without reading any source file.
**Tracker:** Mark `Done`. Builder Remarks: what was added and why (`DATABASE_URL` was missing; comments added for developer orientation).

---

### TSP-090 — Admin role guard

**Priority:** Second — security boundary. TSP-091 depends on it.
**Gate:** Standard (typecheck + lint). App build gate also recommended since layout becomes async.

**Context:**
The middleware already redirects unauthenticated users from `/admin`. But any signed-in user can currently reach all admin pages — the role is never checked server-side. The DB `is_admin()` RLS function blocks writes, but errors arrive as generic PostgREST permission errors. This task adds a clean server-side role guard.

**`public.is_admin()` in DB (already applied):**
```sql
select coalesce(
  auth.jwt() -> 'app_metadata' ->> 'user_role',
  auth.jwt() ->> 'user_role',
  ''
) = 'admin';
```
Mirror this exactly in TypeScript: check `app_metadata.user_role` first, `user_metadata.user_role` as fallback.

---

**Create `src/lib/auth/require-admin.ts`** (new file, new directory):

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

// For Server Component layouts and pages — throws a redirect.
// In no-config scaffold mode (local dev without Supabase env values), this is
// a no-op so the admin shell remains navigable during development.
export async function requireAdmin(): Promise<void> {
  if (!hasSupabaseConfig()) return;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin");
  }

  const role =
    (user.app_metadata?.user_role as string | undefined) ??
    (user.user_metadata?.user_role as string | undefined);

  if (role !== "admin") {
    redirect("/?error=unauthorized");
  }
}

// For Server Actions — returns a typed result instead of redirecting.
// Caller checks ok === false and returns the message as the action error state.
export async function requireAdminForAction(): Promise<
  { ok: false; message: string } | { ok: true; userId: string }
> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, message: error?.message ?? "Sign in to continue." };
  }

  const role =
    (user.app_metadata?.user_role as string | undefined) ??
    (user.user_metadata?.user_role as string | undefined);

  if (role !== "admin") {
    return { ok: false, message: "Admin access required." };
  }

  return { ok: true, userId: user.id };
}
```

**Constraints — do not change these:**
- The no-config guard must stay. Removing it breaks local development without credentials.
- `requireAdminForAction` must NOT call `redirect()` — server action result flows cannot catch redirects cleanly.
- `requireAdminForAction` creates its own Supabase client. Callers still call `createClient()` separately for their own RPC calls — the guard only verifies the role.

---

**Update `src/app/admin/layout.tsx`** — make it `async` and add the guard:

```typescript
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link className="text-sm font-semibold text-primary" href="/admin">
            Admin Console
          </Link>
          {/* Replace with <AdminNav /> in TSP-091 */}
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/manifests">Manifests</Link>
            <Link href="/admin/questions">Questions</Link>
            <Link href="/admin/questions/import">Import</Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
```

---

**Update `src/app/admin/questions/actions.ts`** — replace `requireSignedInUser` with `requireAdminForAction` at all three call sites (`createQuestionAction`, `updateQuestionAction`, `retireQuestionAction`).

Change every block of this shape:
```typescript
const supabase = await createClient();
const result = await requireSignedInUser(supabase);
if (!result.ok) {
  return result;
}
```

To:
```typescript
const adminCheck = await requireAdminForAction();
if (!adminCheck.ok) {
  return { ok: false, message: adminCheck.message };
}
const supabase = await createClient();
```

Add import at top: `import { requireAdminForAction } from "@/lib/auth/require-admin";`

Delete the `requireSignedInUser` helper function at the bottom of the file — it is no longer used.

---

**Update `src/app/admin/manifests/actions.ts`** — replace the inline auth block in `importManifestAction` (the `supabase.auth.getUser()` block before the RPC call):

```typescript
// Remove this block:
const supabase = await createClient();
const {
  data: { user },
  error: userError
} = await supabase.auth.getUser();
if (userError || !user) {
  return { ok: false, message: ... };
}

// Replace with:
const adminCheck = await requireAdminForAction();
if (!adminCheck.ok) {
  return { ok: false, message: adminCheck.message };
}
const supabase = await createClient();
```

Add import at top: `import { requireAdminForAction } from "@/lib/auth/require-admin";`

---

**Update `src/app/admin/questions/import/actions.ts`** — same pattern as manifests. Replace the inline auth block in `importQuestionsAction`. The error return here has extra fields — preserve them:

```typescript
const adminCheck = await requireAdminForAction();
if (!adminCheck.ok) {
  return {
    ok: false,
    message: adminCheck.message,
    totalRows,
    validRows: plan.questions.length,
    importedRows: 0,
    errors: []
  };
}
const supabase = await createClient();
```

Add import at top: `import { requireAdminForAction } from "@/lib/auth/require-admin";`

---

**Acceptance criteria:**
- Unauthenticated user hitting `/admin` → redirected to `/login?redirectTo=/admin`.
- Authenticated non-admin user hitting `/admin` → redirected to `/?error=unauthorized`.
- No-config scaffold mode (no `.env`) → admin shell renders normally (no crash, no redirect).
- All three action files (`questions/actions.ts`, `manifests/actions.ts`, `questions/import/actions.ts`) use `requireAdminForAction` — no inline `getUser()` auth-only checks remain.
- `requireSignedInUser` helper is deleted from `questions/actions.ts`.

**Tracker:** Mark `Done`. Builder Remarks: what changed, that no-config bypass is intentional, browser smoke still blocked until admin user is created.
**Rollback notes:** Revert `src/lib/auth/require-admin.ts` and the three action file changes. Layout revert removes the `async` keyword and `requireAdmin` import.

---

### TSP-091 — Admin nav with active links + Phase 1 section overview

**Priority:** Third — depends on TSP-090 Done.
**Gate:** App build gate (layout + Client Component change → `corepack pnpm build` required).

**Context:**
Current nav has no active state — all links look identical on every page. The overview page only shows two sections; Phase 1 adds five more. New developers and admins landing on `/admin` have no orientation.

---

**Create `src/components/admin/admin-nav.tsx`** (new file — Client Component):

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/manifests", label: "Manifests", exact: false },
  { href: "/admin/questions/import", label: "Import", exact: true },
  { href: "/admin/questions", label: "Questions", exact: true },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {links.map(({ href, label, exact }) => {
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "transition-colors hover:text-foreground",
              isActive ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

**Note on link order:** `Import` (`/admin/questions/import`, `exact: true`) appears before `Questions` (`/admin/questions`, `exact: true`) in the array. Both use exact matching so order does not affect correctness — but keep this order to make intent clear.

---

**Update `src/app/admin/layout.tsx`** — swap inline nav for `<AdminNav />`:

```typescript
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link className="text-sm font-semibold text-primary" href="/admin">
            Admin Console
          </Link>
          <AdminNav />
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
    </main>
  );
}
```

---

**Update `src/app/admin/page.tsx`** — extend the overview grid to all Phase 1 sections:

```typescript
import Link from "next/link";

type SectionStatus = "live" | "phase-1" | "phase-1.5";

const sections: {
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  status: SectionStatus;
}[] = [
  {
    title: "Exam manifest engine",
    description:
      "Import syllabus, topics, concepts, marking rules, and historical cutoffs via JSON manifest.",
    href: "/admin/manifests",
    linkLabel: "Open manifest validator",
    status: "live"
  },
  {
    title: "Question CRUD",
    description:
      "Create, edit, and retire individual questions while preserving full version history.",
    href: "/admin/questions",
    linkLabel: "Open question CRUD",
    status: "live"
  },
  {
    title: "Bulk question import",
    description:
      "Upload questions in bulk via JSON or CSV with per-row validation and error report.",
    href: "/admin/questions/import",
    linkLabel: "Open bulk import",
    status: "live"
  },
  {
    title: "Review and approval workflow",
    description:
      "Approve, reject, and publish draft questions. Only approved questions appear in tests.",
    status: "phase-1"
  },
  {
    title: "Flagged content queue",
    description:
      "Review questions and AI explanations flagged by users. Quarantine or restore after review.",
    status: "phase-1"
  },
  {
    title: "Jobs monitor",
    description:
      "Inspect failed, pending, and dead background jobs. Retry important jobs from this view.",
    status: "phase-1"
  },
  {
    title: "Audit log",
    description:
      "View admin actions — role changes, question approvals, manifest imports — with filters.",
    status: "phase-1"
  },
  {
    title: "Question quality analytics",
    description:
      "Track difficulty index, discrimination, flag spikes, and quality tier distribution per exam.",
    status: "phase-1.5"
  }
];

const statusLabel: Record<SectionStatus, string> = {
  live: "Live",
  "phase-1": "Phase 1",
  "phase-1.5": "Phase 1.5"
};

const statusClass: Record<SectionStatus, string> = {
  live: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "phase-1": "bg-blue-50 text-blue-700 ring-blue-600/20",
  "phase-1.5": "bg-slate-100 text-slate-600 ring-slate-500/20"
};

export default function AdminPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Admin console</p>
        <h1 className="mt-2 text-3xl font-semibold">Overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Content operations and platform management for the Test Series Portal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold leading-5">{section.title}</h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass[section.status]}`}
              >
                {statusLabel[section.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{section.description}</p>
            {section.href && section.linkLabel ? (
              <Link
                className="mt-4 inline-flex text-xs font-medium text-primary"
                href={section.href}
              >
                {section.linkLabel} →
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

**Acceptance criteria:**
- Active nav link is visually distinct (bold, `text-foreground`) on each admin page; inactive links are `text-muted-foreground`.
- `/admin` overview shows all 8 sections with correct status badges (3 Live, 4 Phase 1, 1 Phase 1.5).
- Live sections have working links. Phase 1 and 1.5 sections render without links.
- `corepack pnpm build` passes — layout is `async` and includes a Client Component island.

**Tracker:** Mark `Done`. Builder Remarks: what was added, that coming-soon sections have no routes yet, that badges give developer orientation at a glance.
**Rollback notes:** Revert `src/components/admin/admin-nav.tsx` (delete), revert `src/app/admin/layout.tsx` to inline nav, revert `src/app/admin/page.tsx` to prior two-card layout.

---

### 2026-06-02 - Session 12 Builder Handoff - Codex

Scope completed:

- Completed `TSP-055` mastery update job.
- Built the three remaining Session 12 pieces: Supabase adapter, `submitSessionAction` wire-up, and live DB smoke script.
- Marked `TSP-055` `Done` after local and live DB verification passed.

Files changed:

- `src/lib/jobs/handlers/update-mastery-supabase.ts`
- `src/app/test/actions.ts`
- `scripts/smoke-mastery-update.js`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/CHANGELOG.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `createSupabaseMasteryRepository`, implementing `MasteryUpdateRepository` with the planned five-query load path: `session_results`, `test_sessions`, `session_answers`, `session_questions` joined to `questions`, and `question_concepts`.
- `findMasteryRecord` uses `.is("topic_id", null)` and `.is("concept_id", null)` for null lookups, not `.eq(..., null)`.
- `upsertMasteryRecord` writes `user_id` from the scored session result and uses exact partial-unique conflict targets: `user_id,exam_id,topic_id` for topic rows and `user_id,exam_id,concept_id` for concept rows.
- `submitSessionAction` now runs `updateMasteryJob(resultId, createSupabaseMasteryRepository(supabase))` after scoring, wrapped in `try/catch`; mastery failures are logged and never fail the submit response.
- Added an already-scored pre-check before the submit RPC. This is required because the current `submit_test_session` RPC returns the existing `result_id` for duplicate submits; without the guard, duplicate submits would double-blend mastery.
- Added `scripts/smoke-mastery-update.js`, which seeds fixed benchmark questions across 2 topics and 2 concepts, submits, verifies mastery row shape, and confirms duplicate-submit idempotency. The smoke has a self-contained JS copy of the mastery flow because this OneDrive/pnpm workspace fails with `UNKNOWN: unknown error, read` when loading the TypeScript runtime directly from `node_modules`.

Verification:

- `node --check scripts/smoke-mastery-update.js` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node run-migrations.js` applied all migrations through `202606010004_mastery_records.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs.
- `node scripts/smoke-mastery-update.js` passed live with 2 topic mastery rows, 2 concept mastery rows, owner/shape checks, low first-attempt confidence, and unchanged mastery rows on duplicate submit.

Sanity review focus:

- Confirm mastery failure remains non-fatal in `submitSessionAction`.
- Confirm duplicate submit skips mastery when the session was already `scored` before the RPC.
- Confirm Supabase `onConflict` columns match the partial unique indexes exactly.
- Confirm null lookup filters use `.is(..., null)`.
- Confirm inserted rows use the scored session user id so owner RLS passes.

Next recommended step:

- Sanity reviewer should inspect `TSP-055`, especially the duplicate-submit guard and Supabase null/conflict handling. After that, proceed to `TSP-056` readiness scoring or `TSP-057` forgetting-curve decay for the next M3 slice.

---

### 2026-06-03 - Session 16 Builder Handoff - Codex

Scope completed:

- Completed `TSP-076` dashboard overview API.
- Added the backend aggregation layer that returns readiness, weak topics, due retests, overdue retest count, recent sessions, unresolved mistake count, and most-recent strategy metrics.
- Added a guarded server action wrapper for dashboard callers.
- Marked `TSP-076` `Done` after all local TypeScript gates passed.

Files changed:

- `src/lib/dashboard/overview.ts`
- `src/app/dashboard/actions.ts`
- `src/tests/unit/dashboard-overview.test.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- `fetchDashboardOverview` calls five data sources with `Promise.allSettled`: readiness, weak topics, due retests, recent sessions, and unresolved mistake count. One failed source falls back without failing the whole overview response.
- `buildWeakTopics` merges all weighted topics with topic-level mastery records, defaults missing mastery to `0`, filters zero-priority topics, sorts by `weight_percent * mastery gap`, and caps to five rows.
- Due retests are fetched in full for `status = 'due'`, counted locally for overdue rows, then sliced to ten returned items.
- Recent sessions are pulled from `session_results`, enriched with `test_sessions.type`, and the most recent `strategy_metrics` payload is parsed defensively.
- `getDashboardOverviewAction` checks Supabase config, validates the exam UUID, requires an authenticated user, and returns `{ ok: true, data }` on success.
- Added 16 deterministic unit tests for `computeWeakTopicPriority`, `buildWeakTopics`, and `toStrategyMetrics`.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/dashboard-overview.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- No migration or smoke script was required for this TypeScript-only slice.

Sanity review focus:

- Confirm `Promise.allSettled` keeps dashboard overview non-fatal when any single data source fails.
- Confirm weak topics include uncovered weighted topics with `masteryScore = 0`.
- Confirm due retest count is computed before slicing the returned list to ten.
- Confirm the server action performs auth and UUID validation before querying.
- Confirm `strategyMetrics` parsing defaults missing/string values safely.

Next recommended step:

- Session 17 should build the readiness card and weak topics widget (`TSP-078`/`TSP-079`) using `getDashboardOverviewAction`.

### 2026-06-03 - Session 16 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-076 — `overview.ts`, `actions.ts`, 16 unit tests.

**Overall: PASS. TSP-076 → Done.**

---

**S1 — Pure helpers: PASS.**  
`computeWeakTopicPriority` clamps weight ≥ 0 and mastery to `[0, 100]` — bonus improvement over spec (prevents negative priority if mastery ever exceeds 100). `buildWeakTopics` correctly filters `priority > 0`, sorts descending, slices 5. Unstarted topics (no mastery record) default to masteryScore 0 and rank by weight alone.

**S2 — `toStrategyMetrics`: PASS.**  
Guards null, non-object, array. Missing keys fall back to 0. String values parsed through `toNumber`. Correct for Supabase JSONB which may return strings.

**S3 — `Promise.allSettled` isolation: PASS.**  
All five data sources called concurrently. Each failure resolves to its typed fallback — no source kill propagates to the final return shape.

**S4 — `loadWeakTopics` resolves S16-A: PASS.**  
Builder correctly throws on both `topicResult.error` AND `masteryResult.error`. The spec's S16-A (mastery error swallowed) does not apply — both propagate to the `allSettled` fallback. No known issues remain for weak topics.

**S5 — Due retests: PASS.**  
Full (unbounded) query, count computed before slicing. ISO string comparison `row.due_at <= now` is correct for UTC ISO 8601 timestamps (lexicographic order is chronological). List capped to 10.

**S6 — Recent sessions: PASS.**  
Two separate queries merged by `session_id`. Test sessions query has no error throw — type silently falls back to `"unknown"` if that query fails, which is the correct non-fatal behavior for a derived field.

**S7 — Mistake count: PASS.**  
`{ count: "exact", head: true }` used correctly. Throws on error. Returns `count ?? 0` for empty tables.

**S8 — Server action: PASS.**  
`hasSupabaseConfig()`, local `isUuid()` guard, `auth.getUser()` (not `getSession()`), structured `{ ok: true/false }` return. Consistent with the existing actions pattern.

**S9 — Unit tests: PASS.**  
All 16 planned cases present. The `topic()` helper keeps tests concise. Table-driven structure for `computeWeakTopicPriority` cases.

---

**No known issues.** S16-A was resolved by the Builder. S16-B and S16-C from the plan are informational notes, not blocking issues.

**Next session:** Session 17 — TSP-078 (readiness card) + TSP-079 (weak topics widget). First visible `/dashboard` page. Consumes `getDashboardOverviewAction`. Creates `src/app/dashboard/page.tsx` with two server-rendered widgets.

---

### 2026-06-03 - Session 17 Plan (M4 fourth slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M4 Dashboard & Retention  
**Tickets:** TSP-078 (readiness score card), TSP-079 (weak topics widget)  
**Dependencies complete:** TSP-076 dashboard overview API ✅

---

#### Overview

Session 17 builds the first user-visible page. The dashboard shell at `src/app/(app)/dashboard/page.tsx` is replaced with a real server-rendered layout. Two components are created: `ReadinessCard` and `WeakTopics`.

**No new migration. No new DB table. No smoke script.** Everything is TypeScript + TSX display components consuming `fetchDashboardOverview`.

**No unit tests.** All logic is display-only. The computation layer (`computeWeakTopicPriority`, `toStrategyMetrics`, etc.) is already covered. New components have no extractable pure helpers.

**Dev server is blocked on this workspace** (OneDrive/node_modules hydration issue, see SESSION_STATE). Verification gates are typecheck + lint + test + build only. Browser rendering cannot be confirmed by the Builder — note this in the handoff.

---

#### File plan

| Action | Path |
|---|---|
| Replace | `src/app/(app)/dashboard/page.tsx` |
| Create | `src/components/dashboard/readiness-card.tsx` |
| Create | `src/components/dashboard/weak-topics.tsx` |

---

#### Route and data loading notes

The page lives at `src/app/(app)/dashboard/page.tsx`. The `(app)` route group does not add a URL segment — the route is `/dashboard`. The middleware already protects `/dashboard` (see `middleware.ts` line 5).

The Session 16 server action is at `src/app/dashboard/actions.ts`. **Do not call the action from the server component.** Instead import and call `fetchDashboardOverview` from `@/lib/dashboard/overview` directly — server components can import server-only modules without the `"use server"` wrapper overhead. The action wrapper exists for client components.

`searchParams` in Next.js 15 is a `Promise` — always `await` it.

---

#### `src/app/(app)/dashboard/page.tsx` — full spec

```tsx
import Link from "next/link";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardOverview } from "@/lib/dashboard/overview";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { WeakTopics } from "@/components/dashboard/weak-topics";

type Exam = { id: string; name: string; slug: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examParam } = await searchParams;
  const data = await loadDashboardData(examParam);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Dashboard" />
        <Notice message="Supabase is not configured. Add environment variables to enable the dashboard." />
      </section>
    );
  }

  if (!data.authed) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Dashboard" />
        <Notice message="Sign in to view your dashboard." />
      </section>
    );
  }

  if (!data.examId || data.exams.length === 0) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Dashboard" />
        <Notice message="No active exams found. Import an exam manifest from the admin panel to get started." />
      </section>
    );
  }

  const { overview, examId, exams } = data;
  const currentExam = exams.find((e) => e.id === examId) ?? exams[0];

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">{currentExam.name}</h1>
        {exams.length > 1 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {exams.map((exam) => (
              <Link
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  exam.id === examId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                href={`/dashboard?exam=${exam.id}`}
                key={exam.id}
              >
                {exam.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReadinessCard readiness={overview.readiness} />
        <WeakTopics examId={examId} topics={overview.weakTopics} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatChip
          label="Due retests"
          value={overview.overdueRetestCount}
          href="/tests"
        />
        <StatChip
          label="Unresolved mistakes"
          value={overview.unresolvedMistakeCount}
        />
        <StatChip
          label="Recent sessions"
          value={overview.recentSessions.length}
          href="/tests"
        />
      </div>
    </section>
  );
}

// ── Private helpers ──────────────────────────────────────────────────────────

type DashboardData =
  | { configured: false }
  | { configured: true; authed: false }
  | { configured: true; authed: true; examId: null; exams: Exam[] }
  | {
      configured: true;
      authed: true;
      examId: string;
      exams: Exam[];
      overview: Awaited<ReturnType<typeof fetchDashboardOverview>>;
    };

async function loadDashboardData(examParam: string | undefined): Promise<DashboardData> {
  if (!hasSupabaseConfig()) return { configured: false };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { configured: true, authed: false };

  const { data: examRows } = await supabase
    .from("exams")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  const exams = toExams(examRows);
  if (exams.length === 0) return { configured: true, authed: true, examId: null, exams };

  const examId = isValidExamId(examParam, exams) ? examParam! : exams[0].id;
  const overview = await fetchDashboardOverview(supabase, user.id, examId);

  return { configured: true, authed: true, examId, exams, overview };
}

function isValidExamId(param: string | undefined, exams: Exam[]): boolean {
  return Boolean(param && exams.some((e) => e.id === param));
}

function toExams(rows: unknown): Exam[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
    .map((r) => ({
      id: typeof r.id === "string" ? r.id : "",
      name: typeof r.name === "string" ? r.name : "",
      slug: typeof r.slug === "string" ? r.slug : "",
    }))
    .filter((e) => e.id && e.name);
}

function PageHeader({ title }: { title: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Dashboard</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

function StatChip({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </>
  );
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      {href ? (
        <Link className="block" href={href}>
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
```

---

#### `src/components/dashboard/readiness-card.tsx` — full spec

```tsx
import type { ReadinessScore } from "@/lib/scoring/readiness";

type Props = {
  readiness: ReadinessScore;
};

export function ReadinessCard({ readiness }: Props) {
  const score = Math.round(readiness.score);
  const coverage = Math.round(readiness.coveragePercent * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Readiness score</h2>

      <div className="mt-4 flex items-end gap-4">
        <p className={`text-5xl font-bold tabular-nums ${scoreColorClass(score)}`}>
          {score}
        </p>
        <p className="mb-1 text-sm text-muted-foreground">/ 100</p>
        <ConfidenceBadge level={readiness.confidenceLevel} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {coverage}% of topics covered
      </p>

      {readiness.staleTopicIds.length > 0 ? (
        <p className="mt-2 text-sm text-amber-600">
          {readiness.staleTopicIds.length} topic
          {readiness.staleTopicIds.length === 1 ? "" : "s"} not reviewed recently — score may be conservative
        </p>
      ) : null}

      {!readiness.hasBenchmarkSession ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Take a benchmark test to calibrate your score more accurately.
        </p>
      ) : null}
    </div>
  );
}

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles: Record<string, string> = {
    low: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`mb-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[level]}`}
    >
      {level} confidence
    </span>
  );
}
```

---

#### `src/components/dashboard/weak-topics.tsx` — full spec

```tsx
import Link from "next/link";
import type { WeakTopic } from "@/lib/dashboard/overview";

type Props = {
  topics: WeakTopic[];
  examId: string;
};

export function WeakTopics({ topics, examId }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Weak topics</h2>

      {topics.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          All weighted topics are on track. Keep practicing!
        </p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {topics.map((topic) => (
            <TopicRow examId={examId} key={topic.topicId} topic={topic} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicRow({ topic, examId }: { topic: WeakTopic; examId: string }) {
  const mastery = Math.round(topic.masteryScore);
  const masteryBarColor = mastery >= 70 ? "bg-green-500" : mastery >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <li className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{topic.topicName}</p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {topic.weightPercent}% weight
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${masteryBarColor}`}
            style={{ width: `${mastery}%` }}
          />
        </div>
        <p className="w-16 shrink-0 text-right text-xs text-muted-foreground">
          {mastery}% mastered
        </p>
      </div>

      {/* S17-A: Practice link goes to /tests for now.
          Topic-prefilled retest CTA deferred to TSP-063. */}
      <Link
        className="w-fit text-xs font-medium text-primary hover:underline"
        href="/tests"
      >
        Practice →
      </Link>
    </li>
  );
}
```

**Note on `examId` prop:** `WeakTopics` accepts `examId` for future use by the topic-prefilled CTA (TSP-063). For now it is unused in the rendered output. TypeScript will show an unused variable warning — suppress with a leading underscore rename if lint flags it, or just leave it (the prop is intentionally forward-looking).

---

#### Verification gates

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

No migration. No smoke script. **No browser verification is possible** on this workspace due to the OneDrive dev-server issue. Builder must note this explicitly in the handoff.

---

#### Tracker and process doc updates (Builder)

1. `trackers/JIRA_TRACKER.csv` — TSP-078: `Backlog → Done`. TSP-079: `Backlog → Done`.
2. `docs/process/SESSION_STATE.md` — add Session 17 completed, update Next Recommended Work.
3. Append Builder Handoff to `docs/process/HANDOFF.md`.
4. Two commits (one per ticket):
   - `git commit -m "TSP-078: readiness score card"` (ReadinessCard component + page data loading)
   - `git commit -m "TSP-079: weak topics widget"` (WeakTopics component; or bundle both as one commit if they're implemented together)
   - Acceptable to bundle as one commit if the page, ReadinessCard, and WeakTopics are all needed simultaneously for the build to pass.

---

#### Known issues

**S17-A (by design):** `WeakTopics` "Practice" links go to `/tests` (no topic context). TSP-063 (concept retest sessions) adds the direct `topicId`-prefilled CTA. The `examId` prop is accepted but unused for now.

**S17-B:** No exam switcher dropdown — only pill links. If the user has many exams, the pill row may overflow. Acceptable for MVP with 1-2 exams.

**S17-C (environment):** Dev server cannot run on this workspace. Browser rendering is unverified. All verification is static analysis only (typecheck + lint + build). Note this in the builder handoff.

---

#### Next session (Session 18)

Two options:
- **TSP-080** (progress timeline) — chart of readiness + score over time
- **TSP-081** (strategy metrics widget) — overconfidence, negative marking loss, skip discipline

Or pivot to TSP-063 (concept retest sessions) which adds the "Practice this topic" CTA that Session 17 intentionally left as a plain `/tests` link.

---

### 2026-06-03 - Session 17 Builder Handoff - Codex

Scope completed:

- Completed `TSP-078` readiness score card.
- Completed `TSP-079` weak topics widget.
- Replaced the Phase 0 `/dashboard` shell with a server-rendered dashboard page backed by `fetchDashboardOverview`.
- Marked `TSP-078` and `TSP-079` `Done` after the static verification gates passed.

Files changed:

- `src/app/(app)/dashboard/page.tsx`
- `src/components/dashboard/readiness-card.tsx`
- `src/components/dashboard/weak-topics.tsx`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- `/dashboard` now awaits Next.js 15 `searchParams`, loads active exams, defaults to the first active exam when no valid `exam` query param is present, and calls `fetchDashboardOverview` directly from the server component.
- The page handles unconfigured Supabase, unauthenticated users, and no-active-exam states with simple server-rendered notices.
- Added `ReadinessCard`, showing rounded readiness score, color thresholds, confidence badge, coverage percentage, stale-topic warning, and benchmark calibration nudge.
- Added `WeakTopics`, showing up to five weak topics with topic name, mastery progress bar, weight badge, empty state, and current `/tests` practice links.
- Added dashboard stat chips for due retests, unresolved mistakes, and recent sessions.

Verification:

- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- Browser verification was not possible in this workspace because the dev server remains blocked by the documented OneDrive/node_modules issue.

Known issues:

- S17-A remains by design: weak-topic practice links go to `/tests` without topic context. Topic-prefilled CTAs are deferred to TSP-063.
- S17-B remains acceptable for MVP: multiple exams render as pill links, not a dropdown.
- S17-C remains environmental: no browser rendering was verified in this workspace.

Next recommended step:

- Session 18 can continue dashboard UI with `TSP-080` progress timeline or `TSP-081` strategy metrics widget, or pivot to `TSP-063` for topic-prefilled retest/practice CTAs.

### 2026-06-03 - Session 17 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-078 — `ReadinessCard`, TSP-079 — `WeakTopics`, dashboard page shell replacement.

**Overall: PASS. TSP-078 → Done. TSP-079 → Done.**

---

**S1 — Page data loading: PASS.**  
Next.js 15 `searchParams` correctly `await`-ed. `DashboardData` discriminated union covers all four states: unconfigured, unauthenticated, no active exams, and full success. Each state has an early return before the success render — no null-dereference risk.

**S2 — Exam selection: PASS.**  
`isValidExamId` uses a `param is string` type predicate, correctly narrowing `examParam` to `string` at the call site. Falls back to `exams[0].id` when no valid param is present. Exam switcher pill links only render when `exams.length > 1`.

**S3 — Direct `fetchDashboardOverview` call: PASS.**  
Server component correctly imports and calls the aggregation function directly rather than going through the action wrapper. This is the right pattern — action wrappers are for client components.

**S4 — `ReadinessCard` (TSP-078): PASS.**  
Score rounded, color-coded at 70/40 thresholds. `ConfidenceBadge` uses `Record<typeof level, string>` — stricter than spec, all three levels explicitly covered. Stale-topics warning conditional on `staleTopicIds.length > 0`. Benchmark nudge conditional on `!hasBenchmarkSession`. No client state, no `"use client"`.

**S5 — `WeakTopics` (TSP-079): PASS.**  
Builder destructures only `topics` from `Props` — `examId` accepted in the type but not destructured, so no unused-variable lint warning. `TopicRow` adds `Math.min(100, Math.max(0, ...))` clamping on mastery before rendering — prevents any CSS overflow if upstream data is out of range. Correct empty state. `&rarr;` HTML entity renders as `→`.

**S6 — Visual consistency: PASS.**  
`masteryBarColorClass` uses the same 70/40 thresholds as `scoreColorClass` — consistent green/amber/red signaling across both widgets.

**S7 — `StatChip`: PASS.**  
Wraps in `<Link>` only when `href` is provided; otherwise plain div. JSX fragment variable pattern is correct. `sm:grid-cols-3` responsive layout.

**S8 — No browser verification: acknowledged.**  
All gates passed through static analysis (typecheck + lint + test + build). Browser rendering unverified due to persistent OneDrive dev-server issue (S17-C). First browser verification will happen when the founder creates the admin/test users and resolves the M0 blocker.

---

**Known issues (carry forward):**  
- **S17-A** — "Practice →" links in `WeakTopics` go to `/tests` without topic context. TSP-063 adds the direct topic/concept retest CTA.  
- **S17-B** — Exam switcher uses pill links, not a dropdown. Acceptable for MVP.  
- **S17-C** — Browser rendering unverified in this workspace.

---

**M4 dashboard is now visible.** With TSP-076 through TSP-079 Done, a logged-in user can see their readiness score, topic weaknesses, due retests count, and unresolved mistakes at `/dashboard`.

**Session 18 options:**
- **TSP-081** (strategy metrics widget) — consumes `overview.strategyMetrics` already in the response, minimal new code
- **TSP-080** (progress timeline) — needs a new query for historical `session_results`
- **TSP-063** (concept retest sessions) — adds the topic-prefilled "Practice" CTA that S17-A deferred, bridges to M4 complete

Recommended: **TSP-081 first** (fastest — data already in the API response, just a new display widget), then **TSP-063** to close the retest loop.

---

### 2026-06-03 - Session 18 Plan (M4 fifth slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M4 Dashboard & Retention  
**Tickets:** TSP-081 (strategy metrics widget), TSP-063 (concept retest sessions)  
**Dependencies complete:** TSP-054 strategy metrics ✅, TSP-076 dashboard API ✅, TSP-062 retest queue ✅, TSP-037 topic practice ✅

---

#### Overview

Session 18 closes out the two remaining M4 dashboard actions: surface strategy signals to the user (TSP-081) and give them a one-click path to start a retest from the due-retests list (TSP-063).

**TSP-081** is display-only. `overview.strategyMetrics` is already in every `fetchDashboardOverview` response — just needs a widget component.

**TSP-063** needs a new server action (`startRetestAction`) and a client component (`DueRetests`). It reuses the existing `start_test_session` RPC with `type='concept_retest'` — **no new SQL migration** (see S18-A for the known quality gap). The retest session sends the user directly to the existing test-runner at `/tests/:sessionId`.

**No new migration. No unit tests. No smoke script.**  
Verification: typecheck + lint + test + build.

---

#### File plan

| Action | Path |
|---|---|
| Create | `src/components/dashboard/strategy-metrics.tsx` |
| Create | `src/components/dashboard/due-retests.tsx` |
| Modify | `src/app/dashboard/actions.ts` |
| Modify | `src/app/(app)/dashboard/page.tsx` |

---

#### TSP-081: `src/components/dashboard/strategy-metrics.tsx`

Pure display. No client state. Renders only when `strategyMetrics !== null`. Warn threshold: `negativeMarksLost > 0` and `highConfidenceWrong > 2` render the value in amber.

```tsx
import type { StrategyMetrics } from "@/lib/dashboard/overview";

type Props = {
  metrics: StrategyMetrics;
};

export function StrategyMetricsCard({ metrics }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Strategy signals</h2>
      <p className="mt-1 text-xs text-muted-foreground">From your most recent session</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricRow
          label="Negative marks lost"
          value={metrics.negativeMarksLost.toFixed(1)}
          warn={metrics.negativeMarksLost > 0}
        />
        <MetricRow
          label="High-confidence wrong"
          value={String(metrics.highConfidenceWrong)}
          warn={metrics.highConfidenceWrong > 2}
        />
        <MetricRow label="Correct guesses" value={String(metrics.correctGuessed)} />
        <MetricRow label="Total revisits" value={String(metrics.totalRevisits)} />
        <MetricRow
          label="Time on wrong (s)"
          value={String(Math.round(metrics.timeOnWrongSec))}
        />
        <MetricRow
          label="Time on skipped (s)"
          value={String(Math.round(metrics.timeOnSkippedSec))}
        />
      </dl>
    </div>
  );
}

function MetricRow({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${warn ? "text-amber-600" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
```

---

#### TSP-063: `startRetestAction` in `src/app/dashboard/actions.ts`

Add new exports to the existing file. Do not modify the existing `getDashboardOverviewAction`.

**New types and action:**

```typescript
export type StartRetestState = {
  ok: boolean;
  message: string;
  sessionId?: string;
};

export const initialStartRetestState: StartRetestState = { ok: false, message: "" };

export async function startRetestAction(
  _prev: StartRetestState,
  formData: FormData
): Promise<StartRetestState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const retestQueueId = getString(formData, "retestQueueId");
  const examId = getString(formData, "examId");

  if (!isUuid(retestQueueId) || !isUuid(examId)) {
    return { ok: false, message: "Invalid retest or exam id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, message: authError?.message ?? "Sign in to continue." };
  }

  // 1. Load and ownership-check the retest_queue row
  const { data: retestRow, error: retestError } = await supabase
    .from("retest_queue")
    .select("id,user_id,concept_id,topic_id")
    .eq("id", retestQueueId)
    .eq("exam_id", examId)
    .maybeSingle();

  if (retestError || !retestRow) {
    return { ok: false, message: "Retest item not found." };
  }

  const row = retestRow as {
    id: string;
    user_id: string;
    concept_id: string | null;
    topic_id: string | null;
  };

  if (row.user_id !== user.id) {
    return { ok: false, message: "Retest item not found." };
  }

  // 2. Resolve topic_id (concept rows need a lookup)
  let topicId: string | null = row.topic_id;

  if (!topicId && row.concept_id) {
    const { data: conceptRow } = await supabase
      .from("concepts")
      .select("topic_id")
      .eq("id", row.concept_id)
      .maybeSingle();

    topicId =
      (conceptRow as { topic_id: string | null } | null)?.topic_id ?? null;
  }

  if (!topicId) {
    return { ok: false, message: "Could not resolve topic for this retest." };
  }

  // 3. Start the concept_retest session
  const { data, error: startError } = await supabase.rpc("start_test_session", {
    p_exam_id: examId,
    p_type: "concept_retest",
    p_template_id: null,
    p_topic_id: topicId,
    p_count: 10,
    p_duration_minutes: null,
    p_min_quality_tier: "bronze",
  });

  if (startError) {
    return { ok: false, message: startError.message };
  }

  const sessionId = toSessionId(data);
  if (!sessionId) {
    return { ok: false, message: "Failed to start retest session." };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Retest started.", sessionId };
}
```

**Private helpers to add at the bottom of `src/app/dashboard/actions.ts`:**

```typescript
function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toSessionId(data: unknown): string | undefined {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return typeof record.session_id === "string" ? record.session_id : undefined;
}
```

Also add `import { revalidatePath } from "next/cache";` at the top if not already present.

**S18-A note:** `concept_retest` sessions use the `else` branch of `start_test_session` (minimal live filter — random questions from the topic, no recency exclusion, no difficulty balancing). A follow-on migration can add a dedicated `concept_retest` routing branch that calls `select_topic_practice_questions` with recency exclusion. This is non-blocking for MVP.

---

#### TSP-063: `src/components/dashboard/due-retests.tsx`

Client component. Each item has its own `useActionState` instance pointing at `startRetestAction`. On success, redirects to the new session.

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  startRetestAction,
  initialStartRetestState,
  type StartRetestState,
} from "@/app/dashboard/actions";
import type { DueRetest } from "@/lib/dashboard/overview";

type Props = {
  retests: DueRetest[];
  examId: string;
};

export function DueRetests({ retests, examId }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Due retests</h2>

      {retests.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          No retests due yet. Keep practicing and reviewing mistakes to build
          your queue.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {retests.map((retest) => (
            <RetestItem examId={examId} key={retest.id} retest={retest} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RetestItem({
  retest,
  examId,
}: {
  retest: DueRetest;
  examId: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<StartRetestState, FormData>(
    startRetestAction,
    initialStartRetestState
  );

  useEffect(() => {
    if (state.ok && state.sessionId) {
      router.push(`/tests/${state.sessionId}`);
    }
  }, [router, state]);

  const dueDate = new Date(retest.dueAt);
  const isOverdue = dueDate <= new Date();

  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {retest.conceptId ? "Concept retest" : "Topic retest"}
        </p>
        <p
          className={`mt-0.5 text-xs ${
            isOverdue ? "text-red-600" : "text-muted-foreground"
          }`}
        >
          {isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
        </p>
        {!state.ok && state.message ? (
          <p className="mt-1 text-xs text-red-600">{state.message}</p>
        ) : null}
      </div>

      <form action={formAction}>
        <input name="retestQueueId" type="hidden" value={retest.id} />
        <input name="examId" type="hidden" value={examId} />
        <button
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Starting…" : "Start →"}
        </button>
      </form>
    </li>
  );
}
```

**S18-C note:** Retest items show generic "Concept retest" / "Topic retest" labels with no concept or topic name. The `DueRetest` type doesn't include names. A follow-on pass can extend `loadDueRetests` in `overview.ts` to join concept/topic names.

---

#### Updated `src/app/(app)/dashboard/page.tsx`

Add imports and wire up the two new widgets. The full updated render section (inside the success branch):

```tsx
// Add to imports:
import { DueRetests } from "@/components/dashboard/due-retests";
import { StrategyMetricsCard } from "@/components/dashboard/strategy-metrics";

// In the JSX (replace the existing success return):
return (
  <section className="grid gap-6">
    {/* header + exam switcher — unchanged */}

    <div className="grid gap-6 lg:grid-cols-2">
      <ReadinessCard readiness={overview.readiness} />
      <WeakTopics examId={examId} topics={overview.weakTopics} />
    </div>

    {/* NEW: due retests — always shown (empty state included) */}
    <DueRetests examId={examId} retests={overview.dueRetests} />

    {/* existing stats chips */}
    <div className="grid gap-4 sm:grid-cols-3">
      <StatChip href="/tests" label="Due retests" value={overview.overdueRetestCount} />
      <StatChip label="Unresolved mistakes" value={overview.unresolvedMistakeCount} />
      <StatChip href="/tests" label="Recent sessions" value={overview.recentSessions.length} />
    </div>

    {/* NEW: strategy metrics — only when data exists */}
    {overview.strategyMetrics !== null ? (
      <StrategyMetricsCard metrics={overview.strategyMetrics} />
    ) : null}
  </section>
);
```

The `DueRetests` is a client component — it requires `"use client"` in its own file. The page itself remains a server component. Next.js handles the boundary correctly when the client component is imported into a server component.

---

#### Verification gates

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

No migration. No smoke. **Browser verification blocked** on this workspace (S18-D, same environment issue as S17-C).

---

#### Tracker and process doc updates (Builder)

1. `trackers/JIRA_TRACKER.csv` — TSP-081: `Backlog → Done`. TSP-063: `Backlog → Done`.
2. `docs/process/SESSION_STATE.md` — add Session 18 completed note.
3. Append Builder Handoff to `docs/process/HANDOFF.md`.
4. Commits:
   - `git commit -m "TSP-081: strategy metrics widget"`
   - `git commit -m "TSP-063: concept retest sessions from dashboard"`

---

#### Known issues

**S18-A:** `concept_retest` sessions use `minimal_live_filter` (random live questions from the resolved topic, no recency exclusion, no difficulty balancing). Fix: add a `concept_retest` routing branch in `start_test_session` that calls `select_topic_practice_questions`. Migration needed. Non-blocking for MVP.

**S18-B:** `retest_queue.status` not updated when a retest starts or completes. Items remain `'due'` until TSP-063 completion handler is built. The `'due'` count in the stats chip may over-report active retests.

**S18-C:** `DueRetests` shows "Concept retest" / "Topic retest" with no concept or topic name. Requires extending `loadDueRetests` to join concept/topic name tables.

**S18-D:** Browser rendering unverified (OneDrive dev-server issue).

---

#### Next session (Session 19)

**M4 is now substantially complete** after Session 18. Options:
- **TSP-080** (progress timeline) — historical readiness + score chart over sessions
- **S18-A fix** (concept_retest SQL routing) — upgrade retest quality before launch
- **M0 browser smoke** — if admin/test users are now available, close 19 pending Review rows in one pass
- **TSP-057** (forgetting-curve decay nightly job) — deferred M3 row, needed before M4 data stales

---

### 2026-06-03 - Session 18 Builder Handoff - Codex

Scope completed:

- Completed `TSP-081` strategy metrics widget.
- Completed `TSP-063` concept retest sessions from dashboard.
- Added two commits as requested: one for the display-only strategy metrics widget and one for the dashboard retest launch flow.
- Marked `TSP-081` and `TSP-063` `Done` after the static verification gates passed.

Files changed:

- `src/components/dashboard/strategy-metrics.tsx`
- `src/components/dashboard/due-retests.tsx`
- `src/app/dashboard/actions.ts`
- `src/app/(app)/dashboard/page.tsx`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Added `StrategyMetricsCard`, a pure server component that renders six strategy rows from the most recent session metrics and highlights negative marks lost or high-confidence wrong above threshold.
- `/dashboard` now conditionally renders `StrategyMetricsCard` only when `overview.strategyMetrics !== null`.
- Added `startRetestAction` with Supabase config check, auth check, retest queue ownership validation, topic resolution for concept rows, `start_test_session` RPC call with `type = 'concept_retest'`, dashboard revalidation, and session id return.
- Added `DueRetests`, a client component that gives each due retest row its own `useActionState` instance, shows overdue rows in red, displays inline action errors, and redirects to `/tests/:sessionId` on success.
- `/dashboard` now renders the due retest widget between the readiness/weak-topic grid and the overview stat chips.

Verification:

- `corepack pnpm typecheck` exited 0 for the `TSP-081` commit.
- `corepack pnpm lint` exited 0 for the `TSP-081` commit.
- `corepack pnpm test` exited 0 for the `TSP-081` commit.
- `corepack pnpm build` exited 0 for the `TSP-081` commit.
- `corepack pnpm typecheck` exited 0 for the `TSP-063` commit.
- `corepack pnpm lint` exited 0 for the `TSP-063` commit.
- `corepack pnpm test` exited 0 for the `TSP-063` commit.
- `corepack pnpm build` exited 0 for the `TSP-063` commit.
- No migration or smoke script was required.
- Browser verification was not possible in this workspace because the dev server remains blocked by the documented OneDrive/node_modules issue.

Known issues:

- **S18-A:** `concept_retest` sessions currently use the existing minimal live topic selection path, with no recency exclusion or difficulty balancing. A follow-on migration should add a dedicated `concept_retest` branch that calls recency-aware topic selection.
- **S18-B:** `retest_queue.status` is not updated when a retest starts or completes, so due counts can over-report active retests until the completion handler is added.
- **S18-C:** `DueRetests` labels are generic "Concept retest" or "Topic retest" because the overview response does not include concept/topic names yet.
- **S18-D:** Browser rendering and redirect behavior are unverified in this workspace.

Next recommended step:

- Session 19 can add `TSP-080` progress timeline, fix S18-A with `concept_retest` SQL routing, run M0 browser smoke if users are available, or implement `TSP-057` forgetting-curve decay.

### 2026-06-03 - Session 18 Sanity Review - Architect (Claude Sonnet 4.6)

**Scope:** TSP-081 — `StrategyMetricsCard`, TSP-063 — `startRetestAction` + `DueRetests`.

**Overall: PASS. TSP-081 → Done. TSP-063 → Done.**

---

**S1 — `StrategyMetricsCard` (TSP-081): PASS.**  
Pure server component, no `"use client"`. Six metric rows, 2-col grid on `sm`. Amber warning applied correctly at `negativeMarksLost > 0` and `highConfidenceWrong > 2`. `MetricRow` receives `warn?: boolean` (optional) so rows without warn default to no colour treatment.

**S2 — `DueRetests` client boundary: PASS.**  
`"use client"` at file top. Imports `StartRetestState`, `startRetestAction`, and `initialStartRetestState` from the server actions file — correct (server action functions are callable from client components via the `"use server"` directive in the actions file). `useActionState<StartRetestState, FormData>` explicit generic — type-safe.

**S3 — `RetestItem` state management: PASS.**  
`useEffect` deps are `[router, state.ok, state.sessionId]` — more precise than `[router, state]`, fires only on relevant field changes. Overdue detection uses `dueDate <= new Date()` ISO comparison — correct. Error message renders only when `!state.ok && state.message` — no false display on success.

**S4 — `startRetestAction` ownership and resolution: PASS.**  
`retestRow` queried with both `.eq("id", ...)` and `.eq("exam_id", ...)` — scoped to the right exam before the ownership check. `row.user_id !== user.id` returns a generic "not found" message — no information leakage. Concept → topic resolution: Builder added explicit `conceptError` early return — bonus over spec.

**S5 — `start_test_session` call: PASS.**  
`p_template_id: null`, `p_duration_minutes: null` — correct for dynamic sessions. `p_min_quality_tier: "bronze"` is the permissive default. `p_count: 10` is a reasonable retest size.

**S6 — `revalidatePath` placement: PASS.**  
Called before the success return — ensures the dashboard cache is invalidated so the next page load reflects the new session in recent sessions.

**S7 — Dashboard page wiring: PASS.**  
`DueRetests` always rendered (with empty state). `StrategyMetricsCard` gated on `!== null` (not `!` or `truthy` check) — correct, since a zero-value metrics object would be truthy but should still render.

---

**Known issues (carry forward):**  
S18-A, S18-B, S18-C, S18-D — all logged by Builder, all non-blocking for MVP.

---

**M4 is now substantially complete.** Dashboard shows: readiness score, weak topics, due retests with one-click start, strategy signals, and overview stats. The full improvement loop — test → score → mastery → mistake notebook → retest queue → dashboard → start retest — is functional end-to-end in code.

**Session 19 options (priority order):**
1. **S18-A fix** — add `concept_retest` routing branch in `start_test_session` (one SQL migration, upgrades retest quality before any real users hit it)
2. **TSP-057** — forgetting-curve nightly decay job (completes M3)
3. **TSP-080** — progress timeline widget (historical readiness/score chart)
4. **M0 browser smoke** — if admin + test student users are now available in Supabase, one browser pass closes ~19 Review rows

---

### 2026-06-03 - Session 19 Plan (M3 completion + M4 fix) - Architect (Claude Sonnet 4.6)

**Milestone:** M3 Scoring & Learning (TSP-057 completes it) + M4 hardening (S18-A)
**Tickets:** S18-A (known gap on TSP-063) + TSP-057 (forgetting-curve decay)

#### Context

Two problems to fix before real users arrive:

**S18-A:** `start_test_session` has `diagnostic` and `topic` branches that use smart selectors, but `concept_retest` falls through to the `else` branch (`minimal_live_filter`). This means retest sessions serve random live questions with no recency exclusion and no difficulty balance — the same questions the user may have just seen. Fix: add a `concept_retest` branch that routes to `select_topic_practice_questions`, which already handles recency exclusion (last-3-session deduplication) and 30/40/30 difficulty balance. `p_topic_id` is always non-null when `concept_retest` is called — `startRetestAction` resolves concept→topic before calling the RPC.

**TSP-057:** `mastery_records` rows accumulate without decay. A user who aces a topic and then ignores it for 30 days should see their mastery drop on the dashboard (stale-topic warning is already wired to `staleTopicIds` in `readiness-card.tsx`). The formula is settled: `decayedMastery = storedMastery × exp(-daysSinceTested / (14 × stabilityFactor))`. pg_cron runs nightly inside Postgres — no extra infra, no service role key. The TypeScript side gets a pure `computeDecayedMastery` function + unit tests so the formula is independently verifiable.

#### Architecture

**Migration 1: `202606030001_concept_retest_routing.sql`** (S18-A)

`create or replace function public.start_test_session(...)` — extend the `v_selection_mode` assignment and the question-selection IF block. Exact diff:

```
-- In v_selection_mode assignment (around line 166 of topic_practice_selection migration):
v_selection_mode := case p_type
  when 'diagnostic'     then 'diagnostic_weighted'
  when 'topic'          then 'topic_practice_balanced'
  when 'concept_retest' then 'concept_retest_balanced'   -- ADD THIS
  else                       'minimal_live_filter'
end;
```

Add a new `elsif p_type = 'concept_retest'` branch immediately after the `elsif p_type = 'topic'` block:

```sql
elsif p_type = 'concept_retest' then
  for v_question in
    select *
    from public.select_topic_practice_questions(
      v_user_id,
      p_exam_id,
      p_topic_id,
      v_count,
      v_min_quality_tier,
      v_exposure_policies
    )
  loop
    v_sequence := v_sequence + 1;
    insert into public.session_questions (
      session_id, question_id, question_version_id,
      prompt_snapshot, sequence, selected_by_reason
    )
    values (
      v_session_id,
      v_question.question_id,
      v_question.current_version_id,
      public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
      v_sequence,
      'concept_retest_balanced'
    )
    returning id into v_session_question_id;

    v_questions := v_questions || jsonb_build_array(
      jsonb_build_object(
        'session_question_id', v_session_question_id,
        'question_id',         v_question.question_id,
        'sequence',            v_sequence,
        'prompt_snapshot',     public.build_session_prompt_snapshot(v_question.content, v_question.q_type)
      )
    );
  end loop;
```

Grant stays the same (existing `grant execute on function public.start_test_session(uuid, text, uuid, uuid, int, int, text) to authenticated`).

**Migration 2: `202606030002_mastery_decay.sql`** (TSP-057)

Two parts:

*Part A — enable extension (idempotent):*
```sql
create extension if not exists pg_cron;
```

*Part B — decay function (security definer so pg_cron can call it without bypassing RLS per-row):*
```sql
create or replace function public.apply_mastery_decay()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mastery_records
  set
    mastery_score = greatest(
      0,
      mastery_score * exp(
        -extract(epoch from (now() - last_tested_at)) / 86400.0
        / (14.0 * stability_factor)
      )
    ),
    updated_at = now()
  where
    last_tested_at is not null
    and last_tested_at < now() - interval '1 day';
end;
$$;

revoke all on function public.apply_mastery_decay() from public;
```

*Part C — register pg_cron job (idempotent unschedule then schedule):*
```sql
do $$
begin
  perform cron.unschedule('decay-mastery-nightly');
exception when others then null;
end;
$$;

select cron.schedule(
  'decay-mastery-nightly',
  '0 2 * * *',
  $job$ select public.apply_mastery_decay(); $job$
);
```

**TypeScript — `src/lib/adaptive/mastery-decay.ts`** (pure formula, mirrors the SQL)

```typescript
export function computeDecayedMastery(
  storedMastery: number,
  daysSinceTested: number,
  stabilityFactor: number
): number {
  if (daysSinceTested <= 0) return storedMastery;
  const decayed = storedMastery * Math.exp(-daysSinceTested / (14 * stabilityFactor));
  return Math.max(0, decayed);
}
```

**Unit tests — `src/tests/unit/mastery-decay.test.ts`**

Cover (minimum 10 test cases):
- Zero days elapsed → no change
- Negative days → no change (guard)
- 14 days, stability=1.0 → `storedMastery × e^(-1)` ≈ 36.8% of original
- 28 days, stability=1.0 → `storedMastery × e^(-2)` ≈ 13.5%
- 14 days, stability=2.0 → `storedMastery × e^(-0.5)` ≈ 60.7%
- High mastery (100) decays correctly
- Low mastery (5) stays above 0
- mastery_score = 0 → stays 0 (no negative)
- stability_factor = 1.0 (minimum) is the fastest decay
- stability_factor = 2.0 (maximum) is the slowest decay

#### Design decisions

- **Decay column:** `last_tested_at` not `updated_at`. Decay should reflect when the user last actually tested the concept, not when the row was last written (the decay job itself sets `updated_at`). Rows where `last_tested_at IS NULL` are untested — skip decay.
- **Floor at 0:** `GREATEST(0, ...)` guards against floating-point underflow producing negative mastery. SQL and TypeScript both apply this.
- **`security definer` on `apply_mastery_decay()`:** pg_cron runs as the `postgres` role which bypasses RLS by default. Making the function security definer (owned by postgres) is belt-and-suspenders — the UPDATE touches all users' rows, which is intentional for a nightly sweep.
- **`selected_by_reason = 'concept_retest_balanced'`:** Distinct from `'topic_practice_balanced'` so analytics can later distinguish retest sessions from first-pass topic practice.
- **No TypeScript worker for TSP-057:** The decay is pure SQL math on existing columns. An Edge Function would add infra complexity with zero benefit at this scale. Revisit when job monitoring (TSP-143) and M5 workers are built.

#### Risk notes

- **pg_cron not enabled:** `CREATE EXTENSION IF NOT EXISTS pg_cron` will fail on free Supabase plans if pg_cron is not available. Builder must check: `SELECT * FROM pg_extension WHERE extname = 'pg_cron'` after applying. If it fails, enable via Supabase Dashboard → Database → Extensions → pg_cron, then rerun the migration.
- **Idempotency:** The `DO $$ BEGIN perform cron.unschedule(...) EXCEPTION WHEN others THEN null END $$` pattern handles re-runs cleanly.
- **`select_topic_practice_questions` fallback:** If `concept_retest` has no eligible questions after recency exclusion, `v_sequence = 0` and the `'no eligible live questions found'` exception fires. This is the correct behaviour — better to surface a clear error than serve already-seen questions.

#### Expected files

| File | Action |
|---|---|
| `supabase/migrations/202606030001_concept_retest_routing.sql` | Create — S18-A |
| `supabase/migrations/202606030002_mastery_decay.sql` | Create — TSP-057 |
| `src/lib/adaptive/mastery-decay.ts` | Create — pure decay formula |
| `src/tests/unit/mastery-decay.test.ts` | Create — unit tests |
| `trackers/JIRA_TRACKER.csv` | Update TSP-057 → Done |
| `docs/process/SESSION_STATE.md` | Append Session 19 completion note |
| `docs/process/HANDOFF.md` | Append builder handoff |

#### Tracker updates

- **S18-A** — tracked as a known gap on TSP-063. No separate row. Mark the S18-A caveat resolved in Session 19 builder remarks on TSP-063.
- **TSP-057** — Backlog → Done (after migration applied and cron job verified in `cron.job`).
- **TSP-129** — "Add mastery scheduler unit tests" — mastery-decay tests satisfy the forgetting-curve portion. Builder may partially advance this row.

#### Verification gates

```powershell
# TypeScript
corepack pnpm exec vitest run src/tests/unit/mastery-decay.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build

# Database
node run-migrations.js
# After applying, verify in psql or Supabase SQL editor:
# SELECT * FROM cron.job WHERE jobname = 'decay-mastery-nightly';
# SELECT public.apply_mastery_decay();   -- manual trigger to confirm no errors
```

#### Session 19 handoff checklist (Builder)

1. `supabase/migrations/202606030001_concept_retest_routing.sql` — `create or replace function public.start_test_session(...)` with `concept_retest` branch added. Confirm `selected_by_reason = 'concept_retest_balanced'` on inserted rows.
2. `supabase/migrations/202606030002_mastery_decay.sql` — pg_cron extension, `apply_mastery_decay()` function, cron job registration.
3. `src/lib/adaptive/mastery-decay.ts` — pure formula, exported.
4. `src/tests/unit/mastery-decay.test.ts` — ≥10 test cases, all pass.
5. `node run-migrations.js` — both migrations applied to live DB.
6. Verify `SELECT * FROM cron.job WHERE jobname = 'decay-mastery-nightly'` returns 1 row.
7. `SELECT public.apply_mastery_decay()` — no error, returns void.
8. `trackers/JIRA_TRACKER.csv` — TSP-057 → Done with builder remarks.
9. `docs/process/SESSION_STATE.md` — append Session 19 completion.
10. `docs/process/HANDOFF.md` — append builder handoff.

#### Next session (Session 20)

After Session 19:
- **TSP-080** — progress timeline widget (historical readiness/score chart). Requires a new query over `session_results` and `mastery_records`. The `readiness-card.tsx` stale-topic warning will now respond to decayed mastery, making the timeline more meaningful.
- **M0 browser smoke** — if admin + test student users are created in Supabase, one browser session closes ~19 Review rows.

---

### 2026-06-03 - Session 19 Builder Handoff - Codex

Scope completed:

- Completed S18-A for `TSP-063`: `concept_retest` sessions now route through the balanced, recency-aware topic-practice selector instead of the minimal live filter.
- Completed `TSP-057`: forgetting-curve mastery decay is implemented and scheduled nightly with pg_cron.
- Marked `TSP-057` `Done` and updated `TSP-063` remarks to remove the retest-selection-quality caveat.

Files changed:

- `supabase/migrations/202606030001_concept_retest_routing.sql`
- `supabase/migrations/202606030002_mastery_decay.sql`
- `src/lib/adaptive/mastery-decay.ts`
- `src/tests/unit/mastery-decay.test.ts`
- `trackers/JIRA_TRACKER.csv`
- `docs/process/SESSION_STATE.md`
- `docs/process/HANDOFF.md`

What changed:

- Replaced the current `public.start_test_session(uuid, text, uuid, uuid, int, int, text)` body with the latest benchmark/mock-aware version plus a dedicated `elsif p_type = 'concept_retest'` branch.
- Added `concept_retest_balanced` to `v_selection_mode` and `selected_by_reason`.
- Reused `public.select_topic_practice_questions(...)` for concept retests, preserving last-3-session recency exclusion, difficulty balance, quality-tier filtering, and exposure-policy filtering.
- Added `public.apply_mastery_decay()` as a security-definer function.
- Added a pg_cron job named `decay-mastery-nightly` on schedule `0 2 * * *`.
- Added pure `computeDecayedMastery(storedMastery, daysSinceTested, stabilityFactor)` plus exported constants and 12 deterministic tests.

Decay implementation note:

- `last_tested_at` remains the semantic "last actual test" timestamp.
- The SQL job uses `greatest(updated_at, last_tested_at)` as the decay checkpoint before setting `updated_at = now()`. This avoids reapplying the same elapsed interval on every nightly cron run while preserving the stale-topic semantics tied to `last_tested_at`.

Verification:

- `corepack pnpm exec vitest run src/tests/unit/mastery-decay.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed during the first lint spawn.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node run-migrations.js` applied all migrations through `202606030002_mastery_decay.sql`.
- `SELECT * FROM cron.job WHERE jobname = 'decay-mastery-nightly'` returned one active job with schedule `0 2 * * *`.
- `SELECT public.apply_mastery_decay()` completed without error.
- Live `pg_get_functiondef(...)` check confirmed `start_test_session` contains `concept_retest_balanced`.

Remaining known issues:

- S18-B remains: `retest_queue.status` is not updated when a retest starts or completes.
- S18-C remains: due-retest labels are still generic because concept/topic names are not included in the overview response.
- Browser verification remains blocked by the documented OneDrive dev-server issue.

Next recommended step:

- Sanity Test should review the two migrations closely, especially pg_cron idempotency and `start_test_session` behavior preservation for diagnostic/topic/benchmark/mock sessions.
- Session 20 can proceed to `TSP-080` progress timeline, or browser smoke if admin and plain student users are available.

### 2026-06-03 - Session 19 Sanity Review - Architect (Claude Sonnet 4.6)

**Result: PASS (7/7 checks)**

#### S18-A — `202606030001_concept_retest_routing.sql`

**Check 1 — concept_retest branch is correct.** ✅ `elsif p_type = 'concept_retest'` at line 306 calls `select_topic_practice_questions(v_user_id, p_exam_id, p_topic_id, v_count, v_min_quality_tier, v_exposure_policies)` — identical args to the `topic` branch. `selected_by_reason = 'concept_retest_balanced'` is distinct and correct. `v_selection_mode = 'concept_retest_balanced'` is stored in session metadata for analytics.

**Check 2 — exposure policies for concept_retest.** ✅ `concept_retest` falls through to the `else` in the `v_exposure_policies` assignment → `array['practice']`. Retests correctly exclude diagnostic_reserved and benchmark_reserved questions.

**Check 3 — benchmark/mock bonus routing.** ✅ Builder went beyond spec and also wired `benchmark`/`mock` into `select_benchmark_questions` via a proper `elsif p_type in ('benchmark', 'mock')` branch (with `v_fixed_qids` template support). The `select_benchmark_questions` signature matches `202606010002_benchmark_selection.sql` exactly. This was an oversight in prior migrations — it's a correct improvement.

**Check 4 — grant preserved, signature unchanged.** ✅ `revoke all ... from public` + `grant execute ... to authenticated` with same 7-parameter signature. Diagnostic/topic/benchmark/mock/else branches all preserved with identical logic to prior version.

#### TSP-057 — `202606030002_mastery_decay.sql`

**Check 5 — `apply_mastery_decay()` formula and guards.** ✅ Uses `greatest(updated_at, last_tested_at)` as the decay reference point in both the SET and WHERE clause. This is better than the spec'd `last_tested_at` alone: on the first nightly run the values are the same; on subsequent runs it prevents double-applying the same elapsed interval (since `updated_at` was set to `now()` by the previous run). The multiplicative property of exponential decay `A × exp(-t1/τ) × exp(-t2/τ) = A × exp(-(t1+t2)/τ)` means incremental nightly application produces the same cumulative result as a single full-time-span application. `GREATEST(0, ...)` floor applied. `last_tested_at IS NOT NULL` guard excludes untested rows. `security definer` + `revoke all from public` correct (pg_cron calls as `postgres` role; authenticated users cannot invoke it directly).

**Check 6 — pg_cron idempotency.** ✅ DO block with `EXCEPTION WHEN others THEN null` handles missing job on first run. `cron.schedule` then creates the job. Verified live: `cron.job` returned one row with `jobname = 'decay-mastery-nightly'` and schedule `0 2 * * *`.

**Check 7 — TypeScript formula and unit tests.** ✅ `computeDecayedMastery(storedMastery, daysSinceTested, stabilityFactor)` mirrors the SQL formula exactly. Guards for `daysSinceTested ≤ 0` and invalid `stabilityFactor` (non-finite or ≤ 0 → fallback to 1) are present. 12 tests cover: zero days, negative days, 14/28 days at stability 1.0 (e^-1, e^-2), 14/28 days at stability 2.0 (e^-0.5, e^-1), high mastery (100), low mastery (5), zero mastery, negative mastery floor, stability ordering, and invalid stability fallback. All test assertions use `toBeCloseTo` with precision 5 — appropriate for floating-point decay.

Note: TypeScript takes `daysSinceTested` from `last_tested_at` while SQL uses `greatest(updated_at, last_tested_at)`. These diverge only after the first nightly run. TypeScript is purely for formula unit testing — the SQL is the canonical runtime. No mismatch risk.

#### M3 milestone status

All M3 rows are now Done: TSP-051, TSP-052, TSP-053, TSP-054, TSP-055, TSP-056, TSP-057, TSP-128. **M3 Scoring & Learning is complete.**

**Session 20 options (priority order):**
1. **TSP-080** — progress timeline widget (historical readiness/score chart over `session_results`). Requires a new query + server component + chart. Natural next M4 dashboard row.
2. **M0 browser smoke** — if admin + test student users are now available in Supabase, one browser session closes ~19 Review rows.
3. **TSP-077** — next-best-action recommendation (last unstarted M4 dashboard row).

Committed as `335f923 TSP-057 S18-A: mastery decay and concept retest routing`.

---

### 2026-06-03 - Session 20 Plan (M4 sixth slice) - Architect (Claude Sonnet 4.6)

**Milestone:** M4 Dashboard & Retention
**Tickets:** TSP-077 (Next Best Action) + TSP-080 (Progress Timeline)
**No migrations.** TypeScript + components only. No new npm dependencies — chart is inline SVG.

#### Context

Two dashboard widgets remain before M4 is fully built out. Both consume data already in `DashboardOverview` or a simple new query — no schema work needed.

**TSP-077 — Next Best Action:** The dashboard currently shows the user a wall of data but no clear directive. A single "here's what to do next" banner at the top of the page removes decision fatigue and surfaces urgency (overdue retests, weakest topics). Logic is pure TypeScript — no new DB query — using fields already in `DashboardOverview`.

**TSP-080 — Progress Timeline:** The `recentSessions` field is capped at 5 for the stat chip. A timeline needs 20 sessions in chronological order to be meaningful. A new `fetchProgressTimeline` query fetches this separately. The chart is a server-rendered inline SVG sparkline — no charting library, no `pnpm install` needed (which remains broken on OneDrive).

#### Architecture

##### `src/lib/dashboard/next-action.ts` (new)

Pure, testable function. No Supabase dependency.

```typescript
import type { DashboardOverview } from "./overview";

export type ActionType =
  | "start_overdue_retest"
  | "start_due_retest"
  | "practice_weak_topic"
  | "take_diagnostic"
  | "keep_practicing";

export type NextAction = {
  type: ActionType;
  title: string;
  description: string;
  href: string;
};

export function computeNextAction(
  overview: Pick<DashboardOverview, "overdueRetestCount" | "dueRetests" | "weakTopics" | "readiness">
): NextAction
```

Priority ladder (first match wins):

| Priority | Condition | type | title | href |
|---|---|---|---|---|
| 1 | `overdueRetestCount > 0` | `start_overdue_retest` | `"${n} overdue retest(s) — start now"` | `"#due-retests"` |
| 2 | `dueRetests.length > 0` | `start_due_retest` | `"${n} retest(s) due — keep the streak"` | `"#due-retests"` |
| 3 | `weakTopics.length > 0` | `practice_weak_topic` | `"Practice ${weakTopics[0].topicName}"` | `"/tests"` |
| 4 | `!readiness.hasBenchmarkSession` | `take_diagnostic` | `"Take a diagnostic test"` | `"/tests"` |
| 5 | else | `keep_practicing` | `"Keep practicing"` | `"/tests"` |

`description` values: overdue → `"Past due — address before they compound"`, due → `"On schedule"`, weak topic → `"${mastery.toFixed(0)}% mastery — highest priority topic"`, diagnostic → `"Establish your baseline readiness score"`, keep → `"All topics covered — steady progress"`.

##### `src/tests/unit/next-action.test.ts` (new)

Minimum 8 test cases:
1. `overdueRetestCount > 0` → `start_overdue_retest` (overdue beats everything)
2. `dueRetests.length > 0`, no overdue → `start_due_retest`
3. Due retest beats weak topics (overdue=0, dueRetests has rows, weakTopics has rows → due retest wins)
4. Weak topics, no retests, `hasBenchmarkSession = true` → `practice_weak_topic`; title contains `weakTopics[0].topicName`
5. No retests, no weak topics, `hasBenchmarkSession = false` → `take_diagnostic`
6. No retests, no weak topics, `hasBenchmarkSession = true` → `keep_practicing`
7. All-empty overview (zeros, empty arrays, `hasBenchmarkSession = false`) → `take_diagnostic`
8. `overdueRetestCount = 1` title contains `"1"` and `overdueRetestCount = 2` title contains `"2"` (count is surfaced)

##### `src/components/dashboard/next-action-card.tsx` (new)

Server component (no `"use client"`). Calls `computeNextAction` internally.

```tsx
import Link from "next/link";
import { computeNextAction } from "@/lib/dashboard/next-action";
import type { DashboardOverview } from "@/lib/dashboard/overview";

export function NextActionCard({ overview }: { overview: DashboardOverview }) {
  const action = computeNextAction(overview);
  const isUrgent = action.type === "start_overdue_retest";
  const isRetest =
    action.type === "start_overdue_retest" || action.type === "start_due_retest";

  return (
    <div
      className={`rounded-lg border p-5 ${
        isUrgent
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Next step
      </p>
      <p className="mt-1 text-lg font-semibold">{action.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
      <Link
        className="mt-3 inline-block rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        href={action.href}
      >
        {isRetest ? "View queue →" : "Start →"}
      </Link>
    </div>
  );
}
```

##### `src/lib/dashboard/timeline.ts` (new)

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type TimelinePoint = {
  sessionId: string;
  type: string;
  scorePercent: number;   // clamped [0, 100]
  accuracy: number;       // 0–100
  createdAt: string;      // ISO string
};

export async function fetchProgressTimeline(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<TimelinePoint[]>
```

Implementation:
1. `session_results` ordered `created_at ASC` limit 20, filtered by `user_id + exam_id`
2. `test_sessions .in("id", sessionIds)` for `type` — same two-step pattern as `loadRecentSessions` in `overview.ts`
3. `scorePercent = maxScore > 0 ? Math.min(100, Math.max(0, (score / maxScore) * 100)) : 0`
4. Return `[]` if no results; never throws (caller wraps in `.catch((): TimelinePoint[] => [])`).

##### `src/components/dashboard/progress-timeline.tsx` (new)

Server component. Inline SVG sparkline — no library.

Layout:
```
<div>
  <h2>Progress</h2>
  <p className="text-xs text-muted-foreground">Score % per session</p>
  {points.length === 0 → empty state}
  {points.length === 1 → single dot + "Need more sessions for a trend line"}
  {points.length >= 2 → SVG chart + legend}
</div>
```

SVG spec (when `points.length >= 2`):
- Wrapping div: `className="mt-4 aspect-[5/1] w-full"` (prevents extreme distortion)
- `<svg viewBox="0 0 500 100" className="h-full w-full" preserveAspectRatio="none">`
- Score polyline: points at `x = i × 500/(n-1)`, `y = 100 - scorePercent`; `stroke` via inline style or a single class; `fill="none"`, `strokeWidth="2"`
- Circle per point: `r="4"`, fill color by type:
  - `diagnostic` → `#3b82f6` (blue-500)
  - `benchmark` / `mock` → `#a855f7` (purple-500)
  - `topic` → `#22c55e` (green-500)
  - `concept_retest` → `#f59e0b` (amber-500)
  - else → `#6b7280` (gray-500)
- Y-axis labels: `<text x="2" y="10" fontSize="8">100%</text>` and `<text x="2" y="98" fontSize="8">0%</text>` in a lighter color
- Legend row below SVG: `● Diagnostic  ● Topic  ● Retest  ● Benchmark` — small colored spans

##### Dashboard page changes — `src/app/(app)/dashboard/page.tsx`

In `loadDashboardData`, extend the success branch to fetch the timeline in parallel:

```typescript
import { fetchProgressTimeline, type TimelinePoint } from "@/lib/dashboard/timeline";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { ProgressTimeline } from "@/components/dashboard/progress-timeline";

// Success branch:
const [overview, timeline] = await Promise.all([
  fetchDashboardOverview(supabase, user.id, examId),
  fetchProgressTimeline(supabase, user.id, examId).catch((): TimelinePoint[] => []),
]);
return { configured: true, authed: true, examId, exams, overview, timeline };
```

`DashboardData` success variant gains `timeline: TimelinePoint[]`.

Layout order:
```tsx
<NextActionCard overview={overview} />
<div className="grid gap-6 lg:grid-cols-2">
  <ReadinessCard ... />
  <WeakTopics ... />
</div>
<DueRetests id="due-retests" examId={examId} retests={overview.dueRetests} />
<div className="grid gap-4 sm:grid-cols-3">
  {StatChips ×3}
</div>
{overview.strategyMetrics !== null && <StrategyMetricsCard ... />}
<ProgressTimeline points={timeline} />
```

Also: add `id="due-retests"` to the outer `<div>` inside `src/components/dashboard/due-retests.tsx` (the card container, not the `<ul>`).

#### Design decisions

- **No chart library.** `pnpm install` is broken on OneDrive. Inline SVG polyline is sufficient and renders server-side.
- **NBA card is pure server component.** Retest actions use `href="#due-retests"` — user clicks "View queue →" then uses the existing `DueRetests` form. No duplicate server action.
- **`fetchProgressTimeline` is separate from `fetchDashboardOverview`.** Overview caps at 5 sessions newest-first for stat chip. Timeline needs 20 oldest-first for a trend. Separate queries keep concerns clean.
- **`computeNextAction` takes `Pick<DashboardOverview, ...>`.** Minimal stub in tests; no full overview object needed.
- **`accuracy` stored as 0–1 in DB; multiply by 100 in `fetchProgressTimeline`.** Consistent with `toNumber` rounding elsewhere.

#### Risk notes

- **`preserveAspectRatio="none"` + tall containers.** The wrapping `aspect-[5/1]` div constrains the chart height. Without it, a flex parent could stretch the SVG vertically.
- **`#due-retests` anchor requires `id` on the card container.** Without it the anchor silently does nothing. Builder must add `id="due-retests"` to the outer `<div className="rounded-lg border ...">` in `due-retests.tsx`.
- **`DashboardData` type is inferred.** The `timeline` field addition widens the inferred return type automatically — no manual interface update needed. Verify typecheck still passes.
- **Single-session edge case.** With one data point a polyline has no line segment. Guard with `points.length >= 2` before rendering the `<polyline>`.

#### Expected files

| File | Action |
|---|---|
| `src/lib/dashboard/next-action.ts` | Create — pure NBA logic + types |
| `src/lib/dashboard/timeline.ts` | Create — `fetchProgressTimeline` + `TimelinePoint` |
| `src/components/dashboard/next-action-card.tsx` | Create — server component |
| `src/components/dashboard/progress-timeline.tsx` | Create — server component + inline SVG |
| `src/tests/unit/next-action.test.ts` | Create — ≥8 unit tests |
| `src/app/(app)/dashboard/page.tsx` | Modify — parallel timeline fetch; NextActionCard; ProgressTimeline; updated DashboardData |
| `src/components/dashboard/due-retests.tsx` | Modify — add `id="due-retests"` to outer card div |
| `trackers/JIRA_TRACKER.csv` | TSP-077 + TSP-080 → Done |
| `docs/process/SESSION_STATE.md` | Append Session 20 completion |
| `docs/process/HANDOFF.md` | Append builder handoff |

#### Tracker updates

- **TSP-077** — Backlog → Done
- **TSP-080** — Backlog → Done

#### Verification gates

```powershell
corepack pnpm exec vitest run src/tests/unit/next-action.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

No migration. No smoke script.

#### Next session (Session 21)

After Session 20, M4 Dashboard is fully built. Options:
1. **M0 browser smoke** — if admin + test student users are available, close ~19 Review rows in one pass.
2. **M5 start** — AI gateway + Groq integration (TSP-066/067), blocked on `GROQ_API_KEY`.
3. **TSP-160/S12-A** — add named UNIQUE constraints to `mastery_records` (hardening).

---

### 2026-06-03 - Session 20 Builder Handoff (Codex)

**Tickets:** TSP-077 + TSP-080
**Commit target:** `TSP-077 TSP-080: dashboard next action and timeline`

#### What landed

- `src/lib/dashboard/next-action.ts` - pure `computeNextAction` helper with the five-level priority ladder: overdue retest, due retest, weak topic practice, diagnostic, keep practicing.
- `src/tests/unit/next-action.test.ts` - 8 deterministic tests covering all priority branches, count surfacing, and the all-empty diagnostic edge case.
- `src/components/dashboard/next-action-card.tsx` - server component that renders an urgent red card for overdue retests, a primary-tinted card otherwise, `View queue ->` for retests, and `Start ->` for other actions.
- `src/lib/dashboard/timeline.ts` - `fetchProgressTimeline` with up to 20 chronological `session_results`, clamped score percentage, 0-100 accuracy conversion, and session type lookup from `test_sessions`.
- `src/components/dashboard/progress-timeline.tsx` - server-rendered inline SVG timeline with empty, single-point, and multi-point states, colored dots by session type, Y-axis labels, and legend.
- `src/app/(app)/dashboard/page.tsx` - dashboard success branch fetches overview and timeline in parallel, renders `NextActionCard` above the readiness/weak-topic grid, and renders `ProgressTimeline` at the bottom.
- `src/components/dashboard/due-retests.tsx` - outer card now has `id="due-retests"` so next-action retest links land on the queue.

#### Verification

All Session 20 gates passed:

```powershell
corepack pnpm exec vitest run src/tests/unit/next-action.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

No migration, DB smoke, or new npm dependency applies to this slice. Browser verification remains blocked by the known OneDrive/dev-server issue and still needs the admin/plain-student smoke pass.

#### Next session

M4 dashboard implementation is now complete. Next practical options:

1. **M0 browser smoke** - with real admin and plain-student users, verify `/dashboard`, due retest launch, `#due-retests` anchor behavior, progress timeline rendering, and existing admin/test-taking Review rows.
2. **M5 start** - AI gateway/prompt schema work once `GROQ_API_KEY` is available.
3. **TSP-160/S12-A** - named unique constraints on `mastery_records` if M5 is still blocked.

---

## Parked Blockers — Do Not Start

| Task | Waiting for |
|---|---|
| TSP-019, TSP-024 → Done | Admin user: `app_metadata.user_role = "admin"` in Supabase Auth |
| TSP-025 → Done | Same + pnpm repair |
| TSP-035, TSP-027, TSP-026, TSP-159 → Done | Correct Supabase transaction pooler `DATABASE_URL`, migration application, grant verification, and browser/admin smoke |
| TSP-039, TSP-040, TSP-041 → Done | Same `DATABASE_URL` fix, Session 3 migration application, grant verification, and start/save/submit smoke with a plain test user |
| TSP-068 AI analysis job | `GROQ_API_KEY` |
| TSP-085 reminder job | `RESEND_API_KEY` |
| TSP-102 staging env | Vercel + Supabase project setup |

Supabase URL, anon key, and `DATABASE_URL` are in local `.env`, but the 2026-05-30 Session 2 and Session 3 migration attempts failed with `tenant/user postgres.iwzerbplanzlzwtiiska not found`. Confirm the current project and replace the pooler connection string before DB smoke.

---

## Commands

Verification:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Dev server:

```powershell
corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000
```

---

## Tracker Discipline

Before coding:

- Set task row to `In Progress`.
- Set `Owner` and `Built By`.

After coding:

- Add `Builder Remarks`.
- Add `Rollback Notes` for infra/schema/process changes.
- Run verification.
- Mark `Done` only if gates pass.
