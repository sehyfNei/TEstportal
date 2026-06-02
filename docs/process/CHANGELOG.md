# Changelog

Human-readable implementation log.

---

## 2026-06-02

### Session 12 M3 Mastery Update Job

- Completed `TSP-055` for topic and concept mastery updates after scored sessions.
- Added `src/lib/jobs/handlers/update-mastery-supabase.ts`, a Supabase JS repository adapter for the repository-pattern mastery job handler.
- Wired `submitSessionAction` to run `updateMasteryJob` after successful first scoring, with mastery failures logged as non-fatal submit post-processing.
- Added an already-scored pre-check so duplicate submit calls do not double-blend mastery when the scoring RPC returns the existing `result_id`.
- Added `scripts/smoke-mastery-update.js` to seed fixed benchmark questions across 2 topics, submit, assert topic/concept mastery row shape, and verify duplicate-submit idempotency.

### Session 12 Verification

- `node --check scripts/smoke-mastery-update.js` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node run-migrations.js` applied all migrations through `202606010004_mastery_records.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs.
- `node scripts/smoke-mastery-update.js` passed live with 2 topic mastery rows, 2 concept mastery rows, owner/shape checks, and unchanged mastery rows on duplicate submit.

---

## 2026-06-01

### Session 11 M3 Result Aggregates And Strategy Metrics

- Implemented `TSP-053` and `TSP-054` for the second M3 scoring slice.
- Added `202606010003_result_aggregates.sql` with additive `difficulty_scores` and `source_scores` JSONB columns on `session_results`.
- Replaced `submit_test_session` so it now computes `difficulty_scores`, `source_scores`, `concept_scores`, and `strategy_metrics` while preserving owner checks, idempotency, scoring, and existing return shape.
- Added Drizzle schema fields for `difficultyScores` and `sourceScores` on `sessionResults`.
- Added `src/lib/scoring/result-types.ts` and `src/lib/scoring/strategy-metrics.ts`.
- Added `src/tests/unit/strategy-metrics.test.ts` for deterministic strategy metric coverage.

### Session 11 Verification

- `corepack pnpm exec vitest run src/tests/unit/strategy-metrics.test.ts` exited 0.
- `node --check scripts/check-rpc-grants.js` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node run-migrations.js` applied all migrations through `202606010003_result_aggregates.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs after the submit RPC replacement.
- Existing live `scripts/smoke-test-session.js` passed after loading `DATABASE_URL` from `.env`; start, answer save, submit, answer-key isolation, scoring, and idempotent resubmit still work.
- `TSP-053` and `TSP-054` remain in `Review` pending Sanity review.

### Session 10 M3 Scoring TypeScript Layer

- Implemented `TSP-051`, `TSP-052`, and `TSP-128` for the first M3 deterministic scoring slice.
- Added `src/lib/scoring/marking-rules.ts` with `DEFAULT_MARKING_RULE`, `applyMarkingRule`, and `buildMarkingRuleFromManifest`.
- Added manifest marking parsing for numeric strings/numbers and valid `noNegativeForTypes` string arrays; invalid, negative, or malformed numeric inputs fall back to the default rule.
- Added `src/lib/scoring/answer-eval.ts` with explicit evaluation for MCQ, MSQ, integer, statement, assertion, and match questions.
- Added `src/lib/scoring/score-session.ts` for `scoreQuestion` and session/topic aggregation.
- Kept `src/lib/test-session/scoring.ts` unchanged for backward compatibility.

### Session 10 Verification

- `corepack pnpm exec vitest run src/tests/unit/marking-rules.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- No DB migration or browser smoke gate applies to this TypeScript-only slice.
- `TSP-051`, `TSP-052`, and `TSP-128` remain in `Review` pending Sanity review.

### Session 9 M2 Topic Practice And Benchmark Selection

- Implemented `TSP-037` and `TSP-038` for the final M2 algorithmic selection slice.
- Added `computeDifficultyAllocations` pure helper and unit tests for 30/40/30 easy/medium/hard topic-practice allocation.
- Added private `select_topic_practice_questions` SQL helper with live-only filtering, quality/exposure filters, optional topic/subtopic scope, and recency exclusion from the user's last 3 topic/concept-retest sessions.
- Updated `start_test_session` so topic sessions use `topic_practice_balanced` before session insert and store matching `selected_by_reason`.
- Added private `select_benchmark_questions` SQL helper with fixed-template mode and gold-priority benchmark/mock mode.
- Updated `start_test_session` so benchmark/mock sessions resolve fixed template IDs before session insert and store `benchmark_fixed_template` or `benchmark_gold_priority` metadata.

### Session 9 Verification

- `corepack pnpm exec vitest run src/tests/unit/selection.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node --check scripts/check-rpc-grants.js` exited 0.
- `node run-migrations.js` applied all migrations through `202606010002_benchmark_selection.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs; `select_topic_practice_questions` and `select_benchmark_questions` were not in the grant-checker output.
- `TSP-037` and `TSP-038` remain in `Review` pending Sanity/browser smoke.

### Session 8 M2 Admin Search And Diagnostic Selection

- Implemented `TSP-031` and `TSP-036` for the next M2 quality/selection slice.
- Added `search_admin_questions` security-definer RPC with admin guard, nullable filters, FTS over current question text/stem, and paginated `{ total, questions }` results.
- Added URL-driven admin question filters and pagination to `/admin/questions`.
- Added `computeTopicAllocations` pure helper and unit tests for diagnostic topic allocation math.
- Added private `select_diagnostic_questions` SQL helper for weighted level-1 topic allocation, random-within-topic picks, and fillup slots.
- Updated `start_test_session` so diagnostic sessions use weighted selection first and fall back to `diagnostic_random_fallback` when no diagnostic rows are selected. Non-diagnostic selection remains live-only.
- Expanded `scripts/check-rpc-grants.js` to track `search_admin_questions`; the private diagnostic selector is intentionally not grant-checked.

### Session 8 Verification

- `corepack pnpm exec vitest run src/tests/unit/selection.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node --check scripts/check-rpc-grants.js` exited 0.
- `node run-migrations.js` applied all migrations through `202605310005_diagnostic_selection.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs; `select_diagnostic_questions` was not in the grant-checker output.
- Dev server did not stay running: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited 0 immediately with no output.
- `TSP-031` and `TSP-036` remain in `Review` pending Sanity/browser smoke.

---

## 2026-05-31

### Session 7 M2 Quality Tiers And Exposure Policies

- Implemented `TSP-029` and `TSP-030` for the first M2 quality/selection slice.
- Added `quality-tier.ts` with tier ranking, validation, and minimum-tier checks plus unit tests.
- Added `exposure-policy.ts` with session-type eligible policy pools plus unit tests; `hidden` is never returned.
- Added `set_question_quality_tier` and `set_question_exposure_policy` RPCs.
- Updated `start_test_session` to accept `p_min_quality_tier`, always exclude `quarantine`, and select exposure pools by session type.
- Added edit-mode admin controls for quality tier and exposure policy.
- Updated `startSessionAction` to validate optional `minQualityTier` and pass it to the RPC.
- Expanded `scripts/check-rpc-grants.js` to cover the two new RPCs and load the same local `.env` configuration path used by the migration runner.

### Session 7 Verification

- `corepack pnpm exec vitest run src/tests/unit/quality-tier.test.ts src/tests/unit/exposure-policy.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- `node --check scripts/check-rpc-grants.js` exited 0.
- `node run-migrations.js` applied all migrations through `202605310003_exposure_policies.sql`.
- `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 9 tracked RPCs.
- Dev server did not stay running: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited 0 immediately with no output.
- `TSP-029` and `TSP-030` remain in `Review` pending Sanity/browser smoke.

### Session 6 M1 Autosave Recovery And Tab Logging

- Implemented `TSP-048` and `TSP-049` locally for the final M1 test-taking UI slice.
- Moved `QuestionState` from the client runner into `src/lib/test-session/answer-shape.ts`.
- Added a persisted Zustand/localStorage session backup store with server-wins merge recovery.
- Added integer-answer debounce with flush-before-navigation and flush-before-submit behavior.
- Changed revisit counting so the runner sends `revisitIncrement` instead of incrementing on every save.
- Added non-blocking tab-switch logging through `logTabSwitchAction`, with local count display and persistence to `test_sessions.metadata.tabSwitches` plus `tab_switch_count`.

### Session 6 Verification

- `corepack pnpm exec vitest run src/tests/unit/session-backup.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint twice.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- Dev server did not stay running: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited 0 immediately, and `curl.exe -I http://127.0.0.1:3000/tests` could not connect.
- `TSP-048` and `TSP-049` remain in `Review` pending browser smoke with the M0 plain test student.

### Session 5 M1 Test Navigation And Metacognition

- Implemented `TSP-045`, `TSP-046`, and `TSP-047` locally for the next test-taking UI slice.
- Added a question navigator with current, answered, unanswered, marked-for-review, and answered-review states.
- Added a confidence control for `sure`, `unsure`, and `guessed`.
- Refactored the runner from an answer-only map to a unified per-question state containing answer, confidence, and mark-for-review state.
- Updated session resume loading to rehydrate saved confidence and review flags from `session_answers`.

### Session 5 Verification

- `corepack pnpm typecheck` exited 0.
- `corepack pnpm lint` exited 0 after elevated rerun because the Windows sandbox failed to spawn lint twice.
- `corepack pnpm test` exited 0.
- `corepack pnpm build` exited 0.
- Dev server did not stay running: `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited 0 immediately, and `curl.exe -I http://127.0.0.1:3000/tests` could not connect.
- `TSP-045`, `TSP-046`, and `TSP-047` remain in `Review` pending browser smoke with the M0 plain test student.

### Session 4 M1 Playable Test

- Implemented `TSP-044` and `TSP-043` locally for the browser take-a-test loop.
- Added `src/lib/test-session/answer-shape.ts` plus unit tests so UI answer JSON matches scorer expectations for MCQ, MSQ, and integer questions.
- Added `QuestionRenderer` for answer-free prompt snapshots. MCQ, MSQ, and integer support answer entry; statement, assertion, and match render read-only without crashing.
- Added `/tests` launcher and `/tests/[sessionId]` runner under the existing protected app group.
- Added a one-question-at-a-time test shell with server-derived countdown, answer autosave, auto-submit at zero, and inline score display.

### Session 4 Verification

- `corepack pnpm exec vitest run src/tests/unit/answer-shape.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0 after elevated rerun.
- `corepack pnpm lint` exited 0 after elevated rerun.
- `corepack pnpm test` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm build` exited 0 after elevated rerun.
- `TSP-043` and `TSP-044` remain in `Review` pending browser smoke with the M0 plain test student.

---

## 2026-05-30

### Session 3 Test Session Engine Core

- Implemented `TSP-039`, `TSP-040`, and `TSP-041` locally for the server-side take-a-test loop.
- Added `start_test_session` and `submit_test_session` security-definer RPCs in `202605310001_test_session_engine.sql`.
- Added SQL and TypeScript prompt snapshot builders that copy only allowlisted safe fields; match question `pairs` are never included in prompt snapshots.
- Added scoring helpers and tests for MCQ, MSQ exact match, integer, match, skipped handling, negative marking, and topic aggregation. The SQL evaluator treats malformed option arrays as invalid/skipped instead of breaking submit.
- Added `src/app/test/actions.ts` with `startSessionAction`, `saveAnswerAction`, and `submitSessionAction`.
- Updated RPC grant verification coverage to include `start_test_session` and `submit_test_session`.

### Session 3 Verification

- `corepack pnpm exec vitest run src/tests/unit/prompt-snapshot.test.ts src/tests/unit/scoring.test.ts` exited 0.
- `corepack pnpm typecheck` exited 0 after elevated rerun.
- `corepack pnpm lint` exited 0 after elevated rerun.
- `corepack pnpm test` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm build` exited 0 after elevated rerun.
- `node --check scripts\check-rpc-grants.js` exited 0 after elevated rerun.
- `node run-migrations.js` still fails with `PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found`; Session 3 rows are in `Review`, pending corrected Supabase pooler credentials plus RPC/browser smoke.

### Session 2 Test Sessions And Question Review

- Fixed Session 1 Sanity finding `S1-A`: admin role detection no longer trusts client-writable `user_metadata.user_role`.
- Added `TSP-035` test-session schema migration and Drizzle schema for `test_templates`, `test_sessions`, `session_questions`, `session_answers`, and `session_results`.
- Added answer-key isolation for `session_questions.prompt_snapshot`; correct answers and explanations remain server/admin-only in `question_versions`.
- Added `TSP-027` lifecycle transition map and `set_question_status` RPC enforcement.
- Added `TSP-159` `question_status_events` audit table with admin-read RLS and event writes from the lifecycle RPC.
- Refactored admin question edits so `update_admin_question` no longer mutates lifecycle status.
- Added `TSP-026` review queue at `/admin/questions/review` with approve, reject-to-draft, publish, restore-live, retire, and status-history display.

### Verification

- `corepack pnpm exec vitest run src/tests/unit/session-schema.test.ts src/tests/unit/question-lifecycle.test.ts src/tests/unit/question-schema.test.ts` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm typecheck` exited 0 after elevated rerun.
- `corepack pnpm lint` exited 0 after elevated rerun.
- `corepack pnpm test` exited 0 after elevated rerun, but Vitest printed no summary in this workspace.
- `corepack pnpm build` exited 0 after elevated rerun.
- `corepack pnpm exec tsc --noEmit --pretty false` exited 0 after elevated rerun.
- `node --check scripts\check-rpc-grants.js` exited 0 after elevated rerun.
- `node run-migrations.js` failed with `PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found`; Session 2 rows are in `Review`, not `Done`, pending corrected Supabase pooler credentials and browser/admin smoke.

---

## 2026-05-29

### Session 1 Admin Guard And Shell

- Completed Builder pass for `TSP-149`, `TSP-090`, and `TSP-091`.
- Expanded `.env.example` with `DATABASE_URL` and source/purpose comments for Phase 1 secrets.
- Added shared admin authorization helpers for Server Component redirects and server action typed errors, including `app_metadata.user_role`, top-level JWT `user_role`, and `user_metadata.user_role` fallback detection.
- Guarded admin layout and all admin write actions for manifests, question CRUD, and bulk import.
- Added active admin navigation, including the bulk import route, and expanded `/admin` to 8 operational sections.

### Verification

- `corepack pnpm install` still fails with `UNKNOWN: unknown error, read` while pnpm reads its modules manifest.
- `corepack pnpm typecheck` passed after elevated rerun.
- `corepack pnpm lint` passed after elevated rerun.
- `corepack pnpm test` passed after elevated rerun.
- `corepack pnpm build` passed after elevated rerun.
- Dev server startup failed: background `next dev` exited immediately and direct `node_modules\.bin\next.CMD --version` returned `The cloud file provider exited unexpectedly`.
- Tracker rows remain in `Review` pending Sanity Test agent review.

---

## 2026-05-18 (Review)

### Code Review — TSP-019 and TSP-024

- Reviewed full implementation: migrations, RPCs, server actions, admin pages, components, Drizzle schema, form validation, and smoke scripts.

**Critical bug found and fixed:**

- `202605170001_admin_question_crud.sql` was missing `grant execute` for `create_admin_question`, `update_admin_question`, `retire_admin_question`, and `assert_question_topic_scope`. The manifest import migration (`202605060003`) correctly had its grants; the question CRUD migration did not. PostgREST enforces function permissions, so every browser `supabase.rpc()` call would have returned `permission denied` even for authenticated admin users. The Node smoke scripts bypassed this because they use a direct Postgres connection. Added `revoke all` and `grant execute to authenticated` for all four functions at the end of `202605170001`. **Migration must be re-applied to the live DB before browser smoke (`node run-migrations.js`).**

**Known gaps noted (not blocking, tracked as follow-ups):**

- Topics and subtopics dropdown in `QuestionEditor` loads all topics across all exams. RPC validates scope and will reject cross-exam assignments, but the UX is confusing. Track under TSP-031 or a new task.
- No admin role check in Server Component pages or admin layout. Any authenticated user can reach `/admin/*` routes; data fetches return empty/errors via RLS, but the page renders. TSP-090 is the proper fix.
- No form reset after successful question create. Admin must reload to clear fields.
- `retireQuestionAction` does not pre-validate `questionId` as UUID; non-UUID strings reach the RPC which will reject them, but the error is a raw Postgres message.
- `auth.uid()` returns NULL in Node smoke scripts because `set_config` for JWT claims does not populate `auth.uid()`. `created_by`, `changed_by`, and `imported_by` columns will be NULL after smoke runs. Correct behaviour in real browser sessions.
- `summarizeManifest` calls `flattenTopics` a second time; minor inefficiency at manifest scale.
- Fallback `require` path in smoke scripts (`node_modules/.pnpm/postgres@3.4.9/...`) is brittle if `postgres` package version changes.

**TSP-019 assessment:** RPC, server action, and component reviewed clean. No issues blocking Done once browser smoke passes.

**TSP-024 assessment:** Grant bug fixed. Remaining gaps are UX/polish, not correctness. Ready for browser smoke after DB re-migration.

### Follow-up Verification

- Re-ran `node run-migrations.js` after the grant fix.
- Added and ran `scripts/check-rpc-grants.js`; authenticated execute privilege is now verified for `assert_question_topic_scope`, `create_admin_question`, `update_admin_question`, and `retire_admin_question`.
- Reran `scripts/smoke-manifest-import.js`; UPSC seed import succeeded with expected row counts.
- Reran `scripts/smoke-question-crud.js`; create version 1, update version 2, retire, and cleanup passed.
- Re-migration is no longer pending. Remaining gate is browser/server-action smoke with a real admin user session.

---

## 2026-05-20

### Question Bank Bulk Import

- Started `TSP-025` while browser smoke for `TSP-019` and `TSP-024` is on hold pending a real Supabase admin user.
- Added `src/lib/question-bank/bulk-question-import.ts` for JSON array and CSV payload parsing with row-level validation.
- Added admin import server action at `src/app/admin/questions/import/actions.ts`.
- Added admin UI at `/admin/questions/import` and linked it from `/admin/questions`.
- Added unit tests in `src/tests/unit/bulk-question-import.test.ts`.

### Verification

- `node --check scripts/check-rpc-grants.js` passed.
- `corepack pnpm test -- src/tests/unit/bulk-question-import.test.ts src/tests/unit/admin-question-schema.test.ts` could not run because the local pnpm install is broken.
- `corepack pnpm install --offline --force --ignore-scripts --config.confirmModulesPurge=false` failed because `isomorphic-dompurify@2.36.0` is missing from the local store.
- Network repair attempt timed out and left `node_modules` without top-level package links such as `zod`, `typescript`, `postgres`, and `vitest`.
- `TSP-025` remains `In Progress` until dependency repair allows typecheck/tests and admin browser persistence smoke can run.

---

## 2026-05-18

### Supabase Integration

- Verified the new Supabase pooler URI/password with a direct PostgreSQL query.
- Patched `run-migrations.js` to tolerate missing top-level pnpm symlinks for `postgres` and optional `dotenv` when `DATABASE_URL` is supplied by the shell.
- Applied all migrations through `202605170001_admin_question_crud.sql`.
- Added and ran `scripts/smoke-manifest-import.js`; the UPSC seed manifest imported through `public.import_exam_manifest` with 18 topics, 4 concepts, 2 clusters, and 2 cutoffs.
- Added and ran `scripts/smoke-question-crud.js`; create, update/version, retire, and cleanup passed against Supabase.
- Moved `TSP-019` and `TSP-024` to Review pending browser/server-action verification with a real admin user session.

## 2026-05-15

### Exam Manifest Engine

- Added semantic manifest import planning for duplicate slug and reference validation.
- Added transactional Supabase RPC migration for manifest import.
- Wired admin manifest page to run database import through a server action.
- Kept `TSP-019` In Progress until Supabase migration application and admin import smoke test can run with real credentials.

### Question Bank Core

- Added Drizzle schema for `questions`, `question_versions`, `question_concepts`, `question_flags`, and `question_stats`.
- Added SQL migration with lifecycle/source/difficulty/exposure/quality checks, pgvector embedding support, FTS/vector indexes, RLS, and updated-at triggers.
- Kept answer-bearing `question_versions` admin-only until future session APIs serve sanitized snapshots.
- Marked `TSP-023` Done and opened `TSP-022` Question Bank epic.

### AI Provider Direction

- Recorded Groq as the first AI inference provider for future AI gateway work.
- Added `GROQ_API_KEY` to environment/blocker documentation.

### Verification

- `corepack pnpm lint` passed.
- `corepack pnpm test` passed after elevated rerun for Windows esbuild worker spawn.
- `corepack pnpm typecheck` passed.
- `corepack pnpm build` remains unverified for current changes because it was interrupted twice after long runtime.
- Supabase migration application was attempted after URL/anon key and DB password were added to local `.env`, but direct and pooler connection attempts still failed. The anon token project ref differs from the provided REST URL, so the exact Supabase Project Settings connection string is still needed.

## 2026-05-06

### Documentation And Planning

- Created `docs/final/FINAL_PRD.md`.
- Created `docs/final/FINAL_TRD.md`.
- Created `trackers/JIRA_TRACKER.csv`.
- Added production-readiness details to final TRD.
- Created `docs/process/AGENT_WORKFLOW.md`.
- Created handoff/context harness files:
  - `docs/process/SESSION_STATE.md`
  - `docs/process/HANDOFF.md`
  - `docs/process/DECISIONS.md`
  - `docs/process/BLOCKERS.md`
  - `docs/process/CHANGELOG.md`
- Organized historical agent and draft docs under `docs/agents/` and `docs/archive/`.

### Phase 0 Scaffold

- Created Next.js App Router scaffold.
- Added TypeScript strict mode.
- Added Tailwind and UI foundation.
- Added pnpm lockfile.
- Added CI workflow.
- Added Vitest and Playwright smoke setup.
- Added Supabase client/server scaffolding.

### Auth/Profile Foundation

- Added auth middleware.
- Added login/register/reset-password pages.
- Added auth callback route.
- Added protected dashboard/profile shells.
- Added `user_profiles` and `user_consents` Drizzle schema.
- Added Supabase migration for profile/consent tables, trigger, and RLS.

### Exam Manifest Engine

- Added `exams`, `exam_manifests`, `topics`, `concept_clusters`, `concepts`, and `historical_cutoffs` schema.
- Added Supabase migration with RLS and indexes.
- Added manifest Zod schema.
- Added manifest parsing and topic flattening helpers.
- Added UPSC Prelims seed manifest.
- Added admin manifest validator page.
- Added manifest unit tests.

### Verification

Last known passing:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```
