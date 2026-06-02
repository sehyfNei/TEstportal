# Session State

**Last updated:** 2026-06-03
**Updated by:** Codex - Session 16 builder completion
**Project:** Modular AI-Powered Test Series And Self-Study Portal

---

## Current Implementation State

Phase 0 is underway.

Completed foundations:

- Product and technical final docs under `docs/final/`.
- Jira-style tracker at `trackers/JIRA_TRACKER.csv`.
- Multi-agent workflow guide under `docs/process/`.
- Organized artifact folders: `docs/final/`, `docs/process/`, `docs/agents/`, `docs/archive/`, and `trackers/`.
- Next.js + TypeScript + Tailwind scaffold.
- Supabase client/server scaffold.
- CI workflow.
- Vitest and Playwright smoke setup.
- Auth pages and protected route middleware.
- Profile and consent database schema/migration.
- Exam manifest database schema/migration.
- Exam manifest Zod validation.
- Exam manifest semantic import planning.
- UPSC Prelims seed manifest.
- Admin manifest validator/import page.
- Transactional Supabase RPC migration for exam manifest import.
- Supabase pooler connection verified and migrations applied through admin question CRUD.
- Direct RPC smoke test for UPSC manifest import.
- Question bank Drizzle schema and migration for versioned questions, concept links, flags, stats, RLS, FTS, and pgvector embeddings.
- Admin question CRUD RPC smoke test for create, update/version, retire, and cleanup.
- Question CRUD RPC execute grants re-applied and verified after review fix.
- Session 1 S1-A admin guard fix implemented locally: TypeScript admin checks no longer trust client-writable `user_metadata`.
- Session 2 implementation completed locally for test-session schema, lifecycle enforcement, status audit events, and admin review queue; live DB application is blocked by Supabase pooler credentials.
- Session 3 implementation completed and the start/submit session engine rows were live-smoked after the Supabase project was unpaused.
- Session 4 implementation completed locally for the M1 playable test UI: launcher, one-question runner, answer renderer, server-derived timer, autosave, submit, and inline score.
- Session 5 implementation completed locally for the M1 test navigator, confidence control, and mark-for-review flow.
- Session 6 implementation completed locally for M1 autosave recovery, integer debounce, revisit-count semantics, and tab-switch logging.
- Session 7 implementation completed locally and applied live for M2 quality tiers and exposure policies.
- Session 8 implementation completed locally and applied live for M2 admin search/filter and diagnostic weighted selection.
- Session 9 implementation completed locally and applied live for M2 topic practice and benchmark/mock selection.
- Session 10 implementation and Sanity review completed for the M3 first TypeScript scoring slice: marking rules engine, answer evaluation by type, and scoring unit tests (TSP-051, TSP-052, TSP-128).
- Session 11 implementation completed locally and applied live for M3 result aggregates and strategy metrics (TSP-053, TSP-054). Sanity review passed (11/11). TSP-053 and TSP-054 are Done.
- Session 12 completed for the M3 mastery update job (TSP-055): `mastery_records` migration/schema, deterministic formula, repository-pattern handler, Supabase adapter, submit action wire-up, and live mastery smoke are done.
- Session 13 completed for the M3 readiness score (TSP-056): pure formula, Supabase query helper, and 12 unit tests. All gates passed. TSP-056 is Done.
- Session 14 completed for the M4 mistake notebook foundation (TSP-059, TSP-060): `mistake_items` and `retest_queue` schema are live, `createMistakeItemsJob` runs non-fatally after mastery on first submit, and the live mistake-items smoke passed with duplicate-run/duplicate-submit idempotency.
- Session 15 completed for the M4 simple retest scheduler (TSP-062): pure scheduler functions, retest queue update job, submit action wire-up, 15 scheduler tests, and live retest queue smoke are done.
- Session 16 completed for the M4 dashboard overview API (TSP-076): backend aggregation now returns readiness, weak topics, due retests, recent scored sessions, unresolved mistake count, and most-recent strategy metrics through a guarded server action.

---

## Active Tracker Rows

| Key | Status | Notes |
|---|---|---|
| `TSP-008` | In Progress | Auth/profile epic remains open. Auth shell, profile schema, and RLS are done. Editable profile settings, account export/delete, and real Supabase OAuth testing remain. |
| `TSP-016` | In Progress | Exam manifest epic remains open. Schema, migration, seed, validation, admin validator shell, and direct RPC import smoke are done. Browser admin-session smoke remains. |
| `TSP-019` | Review | Import code path is implemented with semantic validation, server action, and transactional RPC migration. Live migrations applied and direct RPC smoke imported UPSC seed counts correctly. Browser admin-session smoke remains before Done. |
| `TSP-022` | In Progress | Question Bank epic is open. `TSP-023` schema/migration is done; `TSP-024` is in Review after direct RPC smoke and grant verification; bulk import/review rows remain. |
| `TSP-024` | Review | Admin question CRUD UI/RPCs are implemented. Direct RPC smoke passed create version 1, update version 2, retire, and cleanup. Live authenticated execute grants are verified. Browser admin-session smoke remains before Done. |
| `TSP-025` | In Progress | Initial bulk JSON/CSV import parser, admin page, server action, and unit tests are added. Verification is blocked by broken pnpm/node_modules links and browser persistence smoke still needs admin auth. |
| `TSP-026` | Review | Admin review queue is implemented locally with approve, reject-to-draft, publish, restore-live, retire, and status history. Browser admin-session smoke remains before Done. |
| `TSP-027` | Done | Lifecycle transition map, `set_question_status` RPC, and content-edit/status separation are implemented and live migration/smoke gates are cleared. |
| `TSP-029` | Review | Quality tier helper/tests, `set_question_quality_tier`, `question_stats` tier upsert sync, min-quality start selection, and edit-mode admin tier control are implemented. Live migration and grant check passed; Sanity/browser smoke remain before Done. |
| `TSP-030` | Review | Exposure policy helper/tests, `set_question_exposure_policy`, type-based start selection pools, and edit-mode admin policy control are implemented. Live migration and grant check passed; Sanity/browser smoke remain before Done. |
| `TSP-031` | Review | Admin question search/filter is implemented with `search_admin_questions`, URL-driven filters, pagination, and live 10-RPC grant verification. Browser admin smoke remains before Done. |
| `TSP-034` | In Progress | Test Session Engine epic opened for Session 3 server-side loop. UI/timer, smart selection, and full marking engine remain separate rows. |
| `TSP-035` | Done | Test-session migration, Drizzle schema, RLS, and schema tests are implemented and live migration gate is cleared. |
| `TSP-036` | Review | Diagnostic weighted selection is implemented with pure allocation tests, private `select_diagnostic_questions`, approved/live diagnostic status scope, fallback mode, and live migration verification. Browser/student smoke remains before Done. |
| `TSP-037` | Review | Topic practice selection is implemented with pure difficulty allocation tests, private `select_topic_practice_questions`, last-3-session recency exclusion, and `topic_practice_balanced` metadata. Browser/student smoke remains before Done. |
| `TSP-038` | Review | Benchmark/mock selection is implemented with private `select_benchmark_questions`, gold-priority ordering, fixed-template support, and same-exam fixed question enforcement. Browser/student smoke remains before Done. |
| `TSP-039` | Done | `start_test_session`, `startSessionAction`, and prompt snapshot allowlist are implemented and live smoke has verified answer isolation. |
| `TSP-040` | Review | `saveAnswerAction` is implemented with owner/status/expiry validation and no scoring during autosave. Browser plain-student autosave/RLS smoke remains before Done. |
| `TSP-041` | Done | `submit_test_session`, `submitSessionAction`, and pure scoring tests are implemented and live smoke has verified scoring and idempotency. |
| `TSP-042` | In Progress | Test Taking UI epic opened for M1 playable test work. M1 child rows TSP-043 through TSP-049 are now implemented locally and in Review pending browser smoke. |
| `TSP-043` | Review | Test shell, server-derived countdown, autosave-on-change/navigation, auto-submit, and inline score panel are implemented locally. Browser smoke remains before Done. |
| `TSP-044` | Review | Question renderer and shared answer-shape helper are implemented locally for MCQ/MSQ/integer, with statement/assertion/match read-only fallback. Browser smoke remains before Done. |
| `TSP-045` | Review | Question navigator is implemented locally with answered/open/review/current state and save-before-jump behavior. Browser smoke remains before Done. |
| `TSP-046` | Review | Confidence control is implemented locally and saves/rehydrates `sure`, `unsure`, and `guessed` through the unified runner state. Browser smoke remains before Done. |
| `TSP-047` | Review | Mark-for-review toggle is implemented locally, saves immediately, and appears in the navigator and summary counts. Browser smoke remains before Done. |
| `TSP-048` | Review | Autosave recovery is implemented locally with Zustand/localStorage backup, server-wins merge, integer save debounce, flush-before-navigation/submit, and revisitIncrement semantics. Browser smoke remains before Done. |
| `TSP-049` | Review | Tab-switch logging is implemented locally with visibilitychange capture, non-blocking server action, local count display, and metadata/tab_switch_count persistence. Browser smoke remains before Done. |
| `TSP-050` | In Progress | M3 scoring parent epic is open. TSP-051/TSP-052/TSP-053/TSP-054/TSP-055/TSP-128 are Done; readiness/decay rows remain backlog. |
| `TSP-051` | Done | New TypeScript marking-rules module is implemented with default UPSC rule, negative marking, skipped handling, manifest parsing, and valid `noNegativeForTypes` support. Sanity review passed. |
| `TSP-052` | Done | New TypeScript answer evaluator and scoring aggregator are implemented for MCQ, MSQ, integer, statement, assertion, and match. Sanity review passed. |
| `TSP-053` | Done | Result aggregates (difficulty_scores, source_scores, concept_scores) added to submit_test_session RPC and Drizzle schema. Sanity review passed 11/11. |
| `TSP-054` | Done | Strategy metrics (negativeMarksLost, highConfidenceWrong, correctGuessed, totalRevisits, timeOnWrong/SkippedSec) implemented in SQL and TypeScript with full unit coverage. Sanity review passed 11/11. |
| `TSP-055` | Done | Mastery update job is complete. Added the Supabase repository adapter, wired `submitSessionAction` to run mastery non-fatally after first scoring, skipped already-scored duplicate submits, applied the `mastery_records` migration, and passed live smoke with topic and concept mastery rows plus duplicate-submit idempotency. |
| `TSP-059` | Done | Mistake notebook schema is complete. Added `mistake_items` and `retest_queue` with owner RLS, authenticated grants, required indexes, idempotent mistake item uniqueness, and topic/concept XOR for retest queue. |
| `TSP-060` | Done | Mistake item creation is complete. Added pure classification, Supabase job handler, submit-action non-fatal wiring after mastery, 12 classification tests, and live smoke for four mistake types plus idempotency. |
| `TSP-062` | Done | Simple retest scheduler is complete. Added pure schedule computation, retest queue update job, submit-action non-fatal wiring after mistake creation, 15 scheduler tests, and live smoke for due queue rows plus idempotency. |
| `TSP-076` | Done | Dashboard overview API is complete. Added backend aggregation for readiness, weak topics, due retests, recent sessions, unresolved mistakes, and strategy metrics, plus server action wrapper and 16 pure unit tests. |
| `TSP-128` | Done | Session 10 scoring unit tests cover all six question types, marking rules, manifest parsing, malformed single-choice selections, and session/topic aggregation. Sanity review passed. |
| `TSP-090` | Review | S1-A is fixed: admin guard trusts only `app_metadata.user_role` and JWT role claims, not `user_metadata`. Browser admin/non-admin smoke still needs a real admin user and reachable Supabase session. |
| `TSP-159` | Done | `question_status_events` migration/schema and review-history integration are implemented and live migration gate is cleared. |

---

## Dev Server

No dev server is running at handoff.

2026-05-29 Builder note:

- Attempted to start Next dev server on `http://127.0.0.1:3000`; process exited immediately.
- `curl.exe -I http://127.0.0.1:3000/admin` could not connect.
- Direct `node_modules\.bin\next.CMD --version` failed with `The cloud file provider exited unexpectedly`, so OneDrive/node_modules hydration remains an environment blocker.

2026-05-31 Session 4 Builder note:

- Attempted to start Next dev server for `/tests`.
- `corepack pnpm dev --hostname 127.0.0.1 --port 3000` exited immediately through the pnpm shim.
- Running the direct Next binary printed `http://127.0.0.1:3000`, then exited with `UNKNOWN: unknown error, read`; `curl.exe -I http://127.0.0.1:3000/tests` could not connect.

2026-05-31 Session 5 Builder note:

- Attempted to start Next dev server for `/tests` after the navigator/confidence/review UI work.
- Background `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited immediately with code 0.
- Foreground `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` also exited 0 with no server left listening; `curl.exe -I http://127.0.0.1:3000/tests` could not connect.

2026-05-31 Session 6 Builder note:

- Attempted to start Next dev server for `/tests` after autosave recovery and tab-switch logging work.
- Background `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited immediately with code 0.
- `curl.exe -I http://127.0.0.1:3000/tests` could not connect.

2026-05-31 Session 7 Builder note:

- Attempted to start Next dev server after the quality-tier/exposure-policy admin UI work.
- Background `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited immediately with code 0.
- Foreground `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` also exited 0 with no output and no server left listening.

2026-06-01 Session 8 Builder note:

- Attempted to start Next dev server after the admin search/filter UI work.
- Background `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` exited immediately with code 0.
- Foreground `corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000` also exited 0 with no output and no server left listening.

To start:

```powershell
corepack pnpm exec next dev --hostname 127.0.0.1 --port 3000
```

Useful URLs:

- `http://127.0.0.1:3000`
- `http://127.0.0.1:3000/login`
- `http://127.0.0.1:3000/admin/manifests`
- `http://127.0.0.1:3000/admin/questions`
- `http://127.0.0.1:3000/admin/questions/review`
- `http://127.0.0.1:3000/tests`

---

## Verification Status

Last known full baseline from the previous completed slice:

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Current 2026-05-15 manifest-import changes:

- `corepack pnpm lint` passed.
- `corepack pnpm test` passed after elevated rerun for Windows esbuild worker spawn.
- `corepack pnpm typecheck` passed.
- `corepack pnpm build` was interrupted twice after long runtime and remains unverified for the current changes.

Current 2026-05-15 question-bank schema changes:

- `corepack pnpm typecheck` passed.
- `corepack pnpm lint` passed.
- `corepack pnpm test` passed after elevated rerun for Windows esbuild worker spawn.

Current 2026-05-18 Supabase integration:

- Supabase pooler connection succeeded with the new URI/password.
- `node run-migrations.js` applied all migrations through `202605170001_admin_question_crud.sql`.
- `node scripts\smoke-manifest-import.js` passed: UPSC seed manifest imported with 18 topics, 4 concepts, 2 clusters, and 2 cutoffs.
- `node scripts\smoke-question-crud.js` passed: create, update/version, retire, and cleanup.
- Review grant fix was re-applied with `node run-migrations.js`.
- `node scripts\check-rpc-grants.js` verified authenticated execute privilege for `assert_question_topic_scope`, `create_admin_question`, `update_admin_question`, and `retire_admin_question`.
- Post-grant smoke reruns passed: manifest import produced manifest version 3 with expected counts; question CRUD create/update/retire/cleanup passed.
- `run-migrations.js` now falls back to pnpm's installed package path when top-level symlinks are missing, treats `dotenv` as optional, and reads `DATABASE_URL` from `.env` when needed.

Notes:

- `typecheck` runs `next typegen && tsc --noEmit`.
- On this Windows workspace, Next/Vitest/pnpm native tooling may require elevated execution because workers spawn local processes.
- 2026-05-29 Session 1 Builder verification passed after elevated reruns: `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build`.
- 2026-05-29 dependency repair note: `corepack pnpm install` still fails with `UNKNOWN: unknown error, read` while reading pnpm's modules manifest; direct Next CLI access also hits a OneDrive cloud file provider error.
- 2026-05-30 Session 2 local verification passed by exit status after elevated reruns: targeted Vitest files, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, direct `tsc --noEmit`, and `node --check scripts\check-rpc-grants.js`. Vitest printed no summary despite exit 0 in this workspace.
- 2026-05-30 `node run-migrations.js` failed before applying Session 2 migrations with `PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found`.
- 2026-05-30 Session 3 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/prompt-snapshot.test.ts src/tests/unit/scoring.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, and `node --check scripts\check-rpc-grants.js`.
- 2026-05-30 `node run-migrations.js` still fails before applying Session 2/3 migrations with `PostgresError: (ENOTFOUND) tenant/user postgres.iwzerbplanzlzwtiiska not found`.
- 2026-05-31 Supabase project was unpaused; all Session 2/3 migrations applied, grant verification passed, and direct manifest/question/session smoke passed live.
- 2026-05-31 Session 4 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/answer-shape.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build`.
- 2026-05-31 dev server could not stay running because Next exited with `UNKNOWN: unknown error, read` after printing the local URL.
- 2026-05-31 Session 5 local verification passed by exit status: `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint twice, `corepack pnpm test`, and `corepack pnpm build`.
- 2026-05-31 Session 5 dev server could not stay running; the Next dev command exited 0 immediately and `curl.exe -I http://127.0.0.1:3000/tests` could not connect.
- 2026-05-31 Session 6 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/session-backup.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint twice, `corepack pnpm test`, and `corepack pnpm build`.
- 2026-05-31 Session 6 dev server could not stay running; the Next dev command exited 0 immediately and `curl.exe -I http://127.0.0.1:3000/tests` could not connect.
- 2026-05-31 Session 7 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/quality-tier.test.ts src/tests/unit/exposure-policy.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint, `corepack pnpm test`, `corepack pnpm build`, and `node --check scripts/check-rpc-grants.js`.
- 2026-05-31 Session 7 DB verification passed: `node run-migrations.js` applied all migrations through `202605310003_exposure_policies.sql`, and `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 9 tracked RPCs.
- 2026-05-31 Session 7 dev server could not stay running; the Next dev command exited 0 immediately with no output.
- 2026-06-01 Session 8 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/selection.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint, `corepack pnpm test`, `corepack pnpm build`, and `node --check scripts/check-rpc-grants.js`.
- 2026-06-01 Session 8 DB verification passed: `node run-migrations.js` applied all migrations through `202605310005_diagnostic_selection.sql`, and `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs. The private `select_diagnostic_questions` helper is not in the grant-checker output.
- 2026-06-01 Session 8 dev server could not stay running; the Next dev command exited 0 immediately with no output.
- 2026-06-01 Session 9 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/selection.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint, `corepack pnpm test`, `corepack pnpm build`, and `node --check scripts/check-rpc-grants.js`.
- 2026-06-01 Session 9 DB verification passed: `node run-migrations.js` applied all migrations through `202606010002_benchmark_selection.sql`, and `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs. The private `select_topic_practice_questions` and `select_benchmark_questions` helpers are not in the grant-checker output.
- 2026-06-01 Session 10 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/marking-rules.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint, `corepack pnpm test`, and `corepack pnpm build`. No DB migration or browser smoke gate applies to this TypeScript-only slice.
- 2026-06-01 Session 10 Sanity passed and `TSP-051`, `TSP-052`, and `TSP-128` are Done.
- 2026-06-01 Session 11 local verification passed by exit status: `corepack pnpm exec vitest run src/tests/unit/strategy-metrics.test.ts`, `node --check scripts/check-rpc-grants.js`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun because the sandbox could not spawn lint, `corepack pnpm test`, and `corepack pnpm build`.
- 2026-06-01 Session 11 DB verification passed: `node run-migrations.js` applied all migrations through `202606010003_result_aggregates.sql`; `node scripts/check-rpc-grants.js` verified authenticated execute privilege for all 10 tracked RPCs; the existing live test-session smoke passed after loading `DATABASE_URL` from `.env`.
- 2026-06-01 Session 11 Sanity passed (11/11 focus items). TSP-053 and TSP-054 are Done.
- 2026-06-02 Session 12 local verification passed: `node --check scripts/smoke-mastery-update.js`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0.
- 2026-06-02 Session 12 DB verification passed: `node run-migrations.js` applied all migrations through `202606010004_mastery_records.sql`; `node scripts/check-rpc-grants.js` verified the unchanged 10 RPC grants; `node scripts/smoke-mastery-update.js` passed with 2 topic mastery rows, 2 concept mastery rows, owner/user shape checks, and duplicate-submit idempotency.
- 2026-06-02 Session 14 DB/local verification passed: `node run-migrations.js` applied all migrations through `202606020001_mistake_notebook.sql`; `node --check scripts/smoke-mistake-items.js`, `corepack pnpm exec vitest run src/tests/unit/mistake-classification.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, and `node scripts/smoke-mistake-items.js` all exited 0. Live smoke created 4 mistake rows and verified overconfidence, conceptual_gap, not_attempted, lucky_guess, owner/status/topic/concept shape, and idempotency.
- 2026-06-02 Session 15 verification passed: `node --check scripts/smoke-retest-queue.js`, `corepack pnpm exec vitest run src/tests/unit/simple-scheduler.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, and `node scripts/smoke-retest-queue.js` all exited 0. Live smoke created 4 due retest rows, verified simple scheduler state, overconfidence as highest priority, and idempotent rerun behavior.
- 2026-06-03 Session 16 verification passed: `corepack pnpm exec vitest run src/tests/unit/dashboard-overview.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0. No migration or smoke script applied to this backend TypeScript-only slice.

---

## Next Recommended Work

**Session 16 Sanity PASS (2026-06-03). TSP-076 Done. Dashboard overview API complete: readiness, weak topics, due retests, recent sessions, unresolved mistake count, strategy metrics — all via Promise.allSettled with per-source fallbacks. S16-A resolved by Builder. Next: Session 17 — TSP-078 + TSP-079 readiness card + weak topics widget, first visible /dashboard page.**

Session 4–6 M1 rows remain in Review pending browser smoke. Session 7–9 M2 rows are in Review after live DB verification. Session 8 and 9 Sanity reviews passed. Session 10 rows `TSP-051`, `TSP-052`, and `TSP-128` are Done. Session 11 rows `TSP-053` and `TSP-054` are Done after Sanity review. Session 12 row `TSP-055`, Session 13 row `TSP-056`, Session 14 rows `TSP-059`/`TSP-060`, Session 15 row `TSP-062`, and Session 16 row `TSP-076` are Done.

Status outcome:

- **TSP-042** - In Progress as the Test Taking UI parent epic.
- **TSP-043** - Review; shell/timer/autosave/submit UI is implemented locally and awaits plain-student browser smoke.
- **TSP-044** - Review; renderer and answer-shape helper are implemented locally and await plain-student browser smoke.
- **TSP-040** - Review; browser autosave/RLS smoke remains and can be covered by the Session 4 playable-test pass.
- **TSP-045** - Review; navigator grid is implemented locally and awaits plain-student browser smoke.
- **TSP-046** - Review; confidence control is implemented locally and awaits plain-student browser smoke.
- **TSP-047** - Review; mark-for-review toggle is implemented locally and awaits plain-student browser smoke.
- **TSP-048** - Review; autosave recovery, integer debounce, and revisit-count semantics are implemented locally and await plain-student browser smoke.
- **TSP-049** - Review; tab-switch logging is implemented locally and awaits plain-student browser smoke.
- **TSP-029** - Review; quality tiers, min-quality selection, quarantine exclusion, and edit-mode tier control are implemented and await browser smoke.
- **TSP-030** - Review; exposure policies, type-based selection pools, hidden exclusion, and edit-mode policy control are implemented and await browser smoke.
- **TSP-031** - Review; admin search/filter RPC, URL filters, and pagination are implemented and await browser smoke.
- **TSP-036** - Review; diagnostic weighted selection and fallback are implemented and await browser smoke.
- **TSP-037** - Review; topic practice difficulty balancing and recency exclusion are implemented and await browser smoke.
- **TSP-038** - Review; benchmark/mock gold-priority and fixed-template selection are implemented and await browser smoke.
- **TSP-050** - In Progress as the M3 scoring parent epic.
- **TSP-051** - Done; marking rules engine and manifest bridge are implemented and sanity-passed.
- **TSP-052** - Done; answer evaluation by type and score aggregation are implemented and sanity-passed.
- **TSP-053** - Done; result aggregates implemented and sanity-passed.
- **TSP-054** - Done; strategy metrics implemented and sanity-passed.
- **TSP-055** - Done; mastery records, formula, Supabase adapter, submit wire-up, and live smoke are complete.
- **TSP-059** - Done; mistake_items and retest_queue schema, RLS, grants, and indexes are live.
- **TSP-060** - Done; mistake item classifier/job, submit wire-up, tests, and live smoke are complete.
- **TSP-062** - Done; simple retest scheduler, retest queue job, submit wire-up, tests, and live smoke are complete.
- **TSP-076** - Done; dashboard overview aggregation, server action wrapper, and pure helper tests are complete.
- **TSP-128** - Done; scoring unit tests are implemented and sanity-passed.

Next immediate steps:

1. **Session 17 - TSP-078/TSP-079 dashboard widgets** - build the readiness card and weak topics widget using the new `getDashboardOverviewAction` data layer.
2. **Browser smoke when users are available** — admin checks filters/pagination and edit-tier/edit-policy saves; student checks `/tests` diagnostic sessions plus topic/benchmark/mock starts once UI exposure exists.
3. **Founder creates two users** (whenever available) — admin with `app_metadata.user_role = "admin"` and one plain test student — unblocks all pending browser-smoke rows.

Still parked (need external inputs):

- **Repair pnpm install** — main verification commands pass after elevated reruns, but `corepack pnpm install` still fails and should be repaired before later dependency work.
- **TSP-019, TSP-024, TSP-025, TSP-026, TSP-090 -> Done** — blocked on admin user creation (`app_metadata.user_role = "admin"`) for browser smoke.
- **TSP-040, TSP-043, TSP-044, TSP-045, TSP-046, TSP-047, TSP-048, TSP-049, TSP-029, TSP-030, TSP-031, TSP-036, TSP-037, TSP-038 -> Done** — blocked on browser smoke with the admin/plain test users.
- **TSP-068 AI analysis** — blocked on `GROQ_API_KEY`.
- **TSP-085 reminders** — blocked on `RESEND_API_KEY`.

---

## Important Handoff Notes

- **Grant fix applied and verified** - `202605170001_admin_question_crud.sql` was missing `grant execute` for all question CRUD RPCs. The fixed migration has been re-applied to the live DB and authenticated execute grants are verified.
- Real Supabase browser smoke remains blocked until an admin user and plain test student are available.
- Local verification commands pass after elevated reruns, but clean dependency repair is still open. Offline install failed because `isomorphic-dompurify@2.36.0` is missing from the local store; network repair attempt timed out.
- 2026-05-31 resolved: the Supabase `tenant/user not found` failure was caused by a paused project. After unpause, migrations, grant checks, and direct smoke passed live.
- Needed now: admin user with `app_metadata.user_role = "admin"` or equivalent `user_role` claim, plus a plain test student for `/tests` smoke.
- 2026-05-18 migration update: pooler URI/password works, migrations applied, direct RPC smoke passed.
- 2026-05-18 review: grant bug in `202605170001` found and fixed; DB re-migration completed and grants verified.
- Needed later: `SUPABASE_SERVICE_ROLE_KEY` for server-side admin jobs and `GROQ_API_KEY` for AI gateway work.
- `trackers/JIRA_TRACKER.csv` is the task source of truth.
- Add `Built By` and `Builder Remarks` for every completed builder row.
- Do not mark a row `Done` if the real backend step is not implemented.
