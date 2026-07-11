# Session State

**Last updated:** 2026-07-12 — Session 51 BUILT: rate limiting + schedule auto-completion + session/admin integration tests — gates green (405/405) → Review
**Updated by:** Claude (Architect/Builder)

---

## Session 51 (2026-07-12) — Architect: second multi-story big slice (4 rows)

**Status:** Built — TSP-104/180/130/131 in Review (commits `428c89a`, `eb0d725`, `b54633f`+`b4a5051`+`1e3f17c`, `d249735`); **TSP-025 also → Review** (its stalled verification is superseded by TSP-131's passing import tests)

**Builder result (2026-07-12):** all gates green in Test_Portal @ `1e3f17c` — typecheck 0 err · lint 0 err/6 pre-existing warn · **test 405/405** (+33 new) · build clean (`ƒ Middleware` intact). DB gate: `202607130001_rate_limit.sql` applied live and verified — RLS on with zero policies (RPC-only by design), `consume_rate_limit` security definer, anon exec revoked, fixed window live-probed (2/60s → true,true,false). Remaining smoke needs an authenticated session: chat 21st message in 5 min → 429; export 4th in an hour → 429; scheduled test auto-completes via Start now → submit. **Founder: GitHub PAT is invalid — `git push` to the GitHub mirror fails (gates unaffected; Test_Portal pulls from the OneDrive repo).**

**Notable finding:** concurrent dynamic imports of the same specifier race vitest's mock interception (first call got the mock, second the real module) — submit side-effects now share one `import("@/lib/jobs/enqueue")` promise (`1e3f17c`, behavior-neutral in prod).

**Mandate alignment:** PRODUCT_VISION Phase 1 closure item 5 (TSP-180 closes the scheduling loop opened in Session 50) and item 6 (TSP-104 infra hardening; TSP-130/131 critical-path test coverage). Items 2/4 remain founder-gated. Side effect: TSP-131 supplies the verification the Codex-built TSP-025 import slice never got — if its tests pass, Builder moves TSP-025 → Review too.

**Rows (build order = commit order; full architecture in HANDOFF.md):**
- **TSP-104 (M6, rescoped):** DB-backed fixed-window rate limiting — `202607130001_rate_limit.sql` (`rate_limit_counters` + security-definer `consume_rate_limit` RPC, granted to authenticated only), pure `src/lib/security/rate-limit.ts` (DI, **fail-open**), applied to POST /api/study/chat (20/5min → 429) and /api/user/export (3/hour). No Upstash/external services (founder-gated). DB gate: apply live + verify anon cannot execute the RPC.
- **TSP-180 (new, High, M4):** schedule auto-completion — Start-now href carries `scheduleId` → hidden `scheduledItemId` in StartTest → `startSessionAction` links `scheduled_items.session_id` (owner-scoped, non-fatal) → `submitSessionAction` marks the linked planned item completed inside the existing `after()` block. No schema change.
- **TSP-130 (Critical, M6, rescoped):** session-flow integration tests — action-level, mocking `@/lib/supabase/server` with a contract-faithful stateful fake (auth-guard.test.ts pattern); mock `next/server`'s `after` to run inline so the analysis-enqueue assertion works. Rescope recorded in tracker: staging test DB is founder-gated (TSP-102), so AC is satisfied at the action layer.
- **TSP-131 (M6):** admin import integration tests — importQuestionsAction dry-run vs real-run vs row-validation failure, review/approve/flag actions, and non-admin rejection on every action.

**Key builder checks:** mirror real RPC names/arg shapes in fakes (drift must fail the test); rate limiting ≠ cost cap — `checkDailyUsageCap` stays a stub (Standing Decision #4); drop TSP-131 first under time pressure, never TSP-104's migration+wiring pairing.

---

## Session 50 (2026-07-12) — Architect: first multi-story "big slice" (4 rows)

**Status:** Built — TSP-179/083/084/105 in Review (commits `e93b827`+`79028de`, `d0f2534`, `d22a5e5`, `df2fe82`, plus fix `983d5d4`)

**Builder result (2026-07-12):** all gates green in Test_Portal @ `983d5d4` — typecheck 0 err · lint 0 err/6 pre-existing warn · **test 372/372** (+23 new) · build clean with `ƒ /schedule`, `ƒ /tests`, and `ƒ Middleware` in output. DB gate: `202607120001_scheduling.sql` applied to live DB (table + RLS + owner policy + trigger verified). Live prod-server probe: anon `/tests`, `/schedule`, `/dashboard` → **307 login redirect**; `/login` carries all six security headers, CSP Report-Only.

**⚠️ Launch-critical discovery (fixed `983d5d4`):** `middleware.ts` sat at the repo root but the app dir lives in `src/` — Next never bundled it, so the auth-redirect middleware **had never run in any build**; middleware-manifest.json was empty and anon users could render /dashboard, /tests, /mistakes shells (RLS still guarded data). Session 49's 307 probe was actually `/study/chat`'s page-level redirect. Moved to `src/middleware.ts`; first build ever with `ƒ Middleware`, redirects curl-verified. **Sanity/founder: logged-in navigation smoke matters — middleware now runs for authenticated users for the first time.**

**Driver:** `d9a31dd` added `docs/final/PRODUCT_VISION.md` + Phase 1 closure mandate to ROADMAP.md. This session takes the top agent-doable mandate items: #3 (student test catalog), #5 (target-date scheduling), and the founder-independent part of #6 (security headers).

**Rows (one commit per row, in order):**
- **TSP-179 (new, Critical, M2):** `/tests` becomes a mode catalog — diagnostic / topic practice / sectional / mock cards + retest link. The `start_test_session` RPC already supports all types with per-type exposure policies (TSP-036/037/038); the UI never exposed them. Pure `TEST_MODES` config + deep-link `?mode=&topicId=` preselect. UI + wiring only, no schema.
- **TSP-083 (M4, rescoped):** `scheduled_items` migration (`202607120001_scheduling.sql`) — owner-only RLS, planned/completed/cancelled, overdue derived at read time (no cron), additive-only, rollback = single drop. `weekly_pledges` rescoped to TSP-087.
- **TSP-084 (M4):** `/schedule` page (already in middleware protectedPrefixes) — Overdue/Upcoming/History, create/reschedule/cancel/complete server actions, "Start now" deep-links into the TSP-179 catalog. Completion is manual this session (auto-link on submit = named follow-up).
- **TSP-105 (M6, rescoped):** security headers via pure `src/lib/security/headers.ts` → next.config `headers()` — HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, **CSP Report-Only** (never enforcing this session). WAF deferred to TSP-102 (founder).

**Key builder checks:** RPC behavior when pool < p_count (before settling mock defaults); `/schedule` already protected — verify, don't re-add; drop TSP-105 first if time pressure, never split 083/084.

**Tracker:** TSP-179 added; TSP-179/083/084/105 → In Progress (179 rows × 18 cols verified).

---

## Session 49 (2026-07-12) — Architect: TSP-177 + TSP-178 (audit-driven hardening)

**Status:** Built — TSP-177 + TSP-178 in Review (commits `30e2019`, `5bc3b0d`)

**Builder result (2026-07-12):** gates green in Test_Portal @ `5bc3b0d` — typecheck 0 err · lint 0 err/6 pre-existing warn · **test 349/349** (+14 new) · build clean (`/api/jobs/run` + `/study/chat` in route table). Live prod-server probe: anon `/study/chat` → 307 login redirect (middleware fix confirmed); anon chat POST → 401. Remaining smoke needs an authenticated session: >4000-char POST → 400; submit → analysis resolves with no manual runner curl. **Founder action: set `CRON_SECRET` in Vercel env.**

**Audit findings that drove this session (full-project readiness review, 2026-07-12):**
- All 4 gates re-verified GREEN at `f866eb9` in Test_Portal (typecheck 0 err · lint 0 err/6 warn · **test 335/335** · build clean). Test_Portal was synced 086208b → f866eb9 (stale untracked Session-48 test-file copies removed first).
- Live DB probe (read-only): `chat_sessions`/`chat_messages` exist and `mastery_records` unique constraints are applied — the Session 42 "founder must run migrations" item is already done. All 32 migrations live.
- **Launch-critical defect:** nothing triggers `/api/jobs/run` in production (no vercel.json cron, no post-submit kick), and `submitSessionAction` fires side-effects with `void Promise.all` which Vercel serverless freezes after response → enqueued AI analysis/plan jobs would sit pending forever. → **TSP-177** (new).
- **Chat pre-launch gap:** no message length cap (unbounded Groq spend per request), unvalidated sessionId/examId, `/study` missing from middleware protectedPrefixes. Decision-independent of Standing Decision #4. → **TSP-178** (new).

**Session 49 plan (see HANDOFF.md for full architecture):**
- **TSP-177:** wrap submit side-effects in Next 15 `after()`, add non-fatal `kickJobRunnerNonFatal` helper (`src/lib/jobs/kick.ts`, DI pattern) running `runPendingJobs(adminClient, …, 3)` post-response, `vercel.json` daily cron sweeper (`0 3 * * *`, Hobby-compatible; Vercel sends `Bearer $CRON_SECRET` automatically — route already checks it), `CRON_SECRET` in `.env.example`, ~6 unit tests.
- **TSP-178:** pure `validateChatRequestBody` in chat-service (`MAX_CHAT_MESSAGE_CHARS = 4000`, UUID-shape id checks) → route returns 400 `message_too_long`/`invalid_id`; `/study` added to middleware; `maxLength` on composer textarea; ~8 unit tests.

**Tracker hygiene (Architect, this session):**
- Repaired 3 malformed rows: TSP-169 (19 cells — empty cell inserted at Agent S Comments), TSP-170 (19 cells — Agent S comment split across two cells), TSP-020 (17 cells — missing Rollback Notes). Milestones restored to the Milestone column. Full file now 178 rows × 18 columns, verified.
- Added TSP-177 + TSP-178 (both Critical, M5 AI&Workers, Backlog).

**Pending (founder action, unchanged):**
- Browser smoke for the 19 Review rows (checklist in earlier sessions) — biggest queue blocker.
- Standing Decision #4 (per-user/day chat cost cap) before chat goes live — TSP-178 covers the decision-independent guardrails only.
- `RESEND_API_KEY` for the M4 retention track.

---

## Session 42 (2026-06-18) — TSP-020 (Manifest Export) + TSP-168 (Chat Schema)

**Status:** Architect plan written — ready for Builder

**TSP-020 (M2 — last unbuilt M2 ticket):**
- Route Handler `src/app/api/admin/manifest/route.ts` — GET `?manifestId={uuid}`, returns stored manifest JSONB as file download
- Edit `src/app/admin/manifests/page.tsx` — add "Existing manifests" card with Download link per active manifest
- No migration; no new components; no grant-checker change

**TSP-168 (M5 Phase B — chat schema foundation):**
- New migration `supabase/migrations/202606180001_chat_schema.sql` — `chat_sessions` + `chat_messages` tables, owner-only RLS, updated_at trigger, indexes
- New `src/lib/chat/types.ts` — `ChatSession`, `ChatMessage`, `ChatRole` types
- No RPCs; no grant-checker change

**Verification gates (Test_Portal, 2026-06-18):**
- typecheck ✅ 0 errors (fixed TS2352: `exams` join returns array, not single object)
- lint ✅ 0 errors / 5 pre-existing warnings unchanged
- test ✅ 302/302
- build ✅ clean — `/api/admin/manifest` appears in route list

**Commit:** `5122e05`

**Pending (founder action):**
- `node run-migrations.js` in Test_Portal — applies `202606180001_chat_schema.sql` to live DB
- Browser smoke for TSP-020: visit `/admin/manifests` → Download manifest → paste into import form → verify round-trip
- Browser smoke for TSP-167: enrichment panel with GROQ_API_KEY set (deferred from Session 41)

---

## Session 41 (2026-06-17) — TSP-167: AI Enrichment on Import (Built) + M0/M1 Cleanup

**Status:** Review — pending manual browser smoke at `/admin/questions/import` with GROQ_API_KEY set

**What was built (TSP-167):**

4-file change; no migration; `importQuestionsAction` untouched.

- **`src/lib/ai/types.ts`** — added `"question_enrichment"` to `AiFeature` union (1 line)
- **`src/lib/ai/schemas/question-enrichment.ts`** (new) — `enrichmentInputSchema`, `enrichmentOutputSchema`, `buildEnrichmentMessages()`, `validateEnrichmentOutput()` following `analysis.ts` pattern
- **`src/app/admin/questions/import/actions.ts`** — `enrichQuestionsAction(questions)` server action; 30-row batch cap; graceful degradation on AI-disabled or call failure; cost logged to `llm_cost_ledger` via gateway
- **`src/components/admin/question-import-wizard.tsx`** — `EnrichmentPanel` sub-component; `handleAccept`/`handleDismiss`/`updateOverrides`; `applyOverrides()` pure fn; `effectivePayload` state replaces raw `payload` in import form hidden input. Fixed TS2322 (`nextRow[field] = value as never`).

**Verification gates (Test_Portal, 2026-06-17):**
- typecheck ✅ (0 errors — including fix for TS2322 in wizard)
- lint ✅ (0 errors, 5 pre-existing warnings — none from new code)
- test ✅ 302/302
- build ✅ clean

**Commit:** `281bebd`

**Manual smoke pending:**
1. `/admin/questions/import` → paste 3–5 questions with blank explanations → Step 3 dry-run passes
2. Click "✨ Enrich with AI" → spinner → `EnrichmentPanel` shows per-row difficulty + explanation suggestions
3. Accept 2 suggestions, dismiss 1 → Import → open question detail → confirm accepted values landed
4. Repeat with `GROQ_API_KEY` unset → inline error message, Import still enabled

**M0/M1 cleanup (this session):**
- M0 confirmed complete by founder (credentials, migrations, admin+test users, smoke all done)
- Closed to Done: TSP-019, 024, 026, 040, 090 (M0), TSP-043, 044, 045, 046, 047, 048, 049 (M1), TSP-166 (smoke confirmed)
- ROADMAP.md stale M0 items removed
- TSP-167 tracker → Review

---

## Session 40 (2026-06-17) — TSP-167: AI Enrichment on Import (Architect plan)

**Status:** Architect plan complete — ready for Builder

**What's planned (TSP-167):**

Optional AI enrichment panel added to Step 3 of the upload wizard. After a clean dry run, admin can click "Enrich with AI" to send the batch to Groq for per-question `difficulty` rating and `explanation` generation (blank rows only). Admin gets per-row accept/dismiss toggles. Accepted suggestions are merged client-side into the effective payload before the final import call. `importQuestionsAction` unchanged.

**4-file scope:**
- `src/lib/ai/types.ts` — add `"question_enrichment"` to `AiFeature` (1 line)
- `src/lib/ai/schemas/question-enrichment.ts` — new prompt schema (mirrors `analysis.ts`)
- `src/app/admin/questions/import/actions.ts` — add `enrichQuestionsAction` + result types
- `src/components/admin/question-import-wizard.tsx` — add enrichment panel + `applyOverrides` + `EnrichmentPanel` sub-component inside `PreviewStep`

**Key constraints:** 1 Groq call/batch, cap 30 rows, fully advisory, no migration, no route change, graceful degradation when GROQ_API_KEY absent.

**HANDOFF.md:** Session 40 Architect entry appended.

---

## Session 39 (2026-06-16) — TSP-166: Guided Bulk-Upload Wizard (Built)

**Status:** Review — pending manual browser smoke at `/admin/questions/import`

**What was built (TSP-166):**

3-file change; no migration; `importQuestionsAction` untouched.

- **`src/app/admin/questions/import/page.tsx`** — converted to server component; preloads all exams at render via `supabase.from("exams").select("id,name").order("name")`; renders `<QuestionImportWizard exams={exams} />`. Old raw-textarea `QuestionImporter` retired.
- **`src/app/admin/questions/import/actions.ts`** — added `TopicOption` type + `fetchExamTopicsAction(examId)` server action: queries `topics` by `exam_id` with `parent_id IS NULL` (top-level only), guarded by `requireAdminForAction`.
- **`src/components/admin/question-import-wizard.tsx`** (new) — 3-step wizard:
  - **Step 1 (Select):** cascading exam/topic dropdowns. Topics fetched via `startTransition → fetchExamTopicsAction` with `topicRequestId` race-condition guard. Continue gated on both selections.
  - **Step 2 (Compose):** JSON/CSV format toggle (smart — preserves user-edited payload); collapsible UUID-pre-filled template (`buildTemplate` pure fn); main textarea + 300ms debounced client-side `parseBulkQuestionImportPayload` → live row count / error count inline.
  - **Step 3 (Preview):** `PreviewStep` isolated component; auto-fires dry run via `requestSubmit()` on mount; dry-run result panel; Import button gated on `dryRunState.ok && dryRunState.validRows > 0`; error list capped at 25 rows with overflow note.

**Verification gates (Test_Portal, 2026-06-16):**
- typecheck ✅ (0 errors)
- lint ✅ (0 errors, 5 pre-existing warnings — none from wizard)
- test ✅ 302/302
- build ✅ clean

**Commit:** `f723757` — pushed to GitHub; Vercel auto-deploy triggered.

**Manual smoke still pending:**
1. `/admin/questions/import` renders wizard (not old textarea)
2. Step 1: exam select → topics load → topic select → Continue
3. Step 2: template shows UUIDs; paste → live error count updates
4. Step 3: Validate → row count shows → Import → rows in question list

---

## Session 38 (2026-06-16) — CI fix + Architect plan for TSP-166

**CI fixes shipped (commit `c3365df`):**
- `readiness.test.ts:228` — `last_tested_at` anchored to `Date.now() - DAY_MS` (was hardcoded `NOW - DAY_MS` where `NOW = June 2`; 15 days later stale threshold hit, `score = 73.99` not `75.5`).
- `readiness-query.ts` — removed unused `BenchmarkRow` type.
- `mistake-list.ts:115` — `catch (e)` → bare `catch`.
- `test-runner.tsx:285` — removed `flushDebouncedSave` from `submit` useCallback deps.

**Architect plan (Session 38):** TSP-166 guidance written to HANDOFF.md — 6 architectural decisions, 3-file scope, per-file implementation notes, verification gates.

---

## Session 37 (2026-06-16) — Perf fixes, revalidatePath purge, and feature expansion

**Performance fixes (shipped to Vercel):**
- **Navigation speed:** `jumpTo` in `test-runner.tsx` now switches `currentIndex` immediately and saves fire-and-forget — decoupled UI from network round-trips.
- **Submit speed:** `saveAnswerAction` 3 serial Supabase reads parallelised with `Promise.all`; analytics made fire-and-forget; flush+save collapsed to single save by cancelling debounce inline.
- **revalidatePath purge:** All `revalidatePath` calls removed from server actions (test/actions.ts, dashboard/actions.ts, mistakes/actions.ts, admin/questions/actions.ts, admin/questions/flag-actions.ts, admin/questions/import/actions.ts, admin/jobs/actions.ts). Root cause: Next.js 15 `revalidatePath` in a server action triggers an inline re-render as part of the action flight response; since all pages are fully dynamic (use `cookies()`), this provides zero cache benefit and crashed Vercel serverless on re-render failure. Fix: remove all `revalidatePath`, add `router.refresh()` in `useEffect` in client components that need list updates (mistake-item-row.tsx, resolve-flag-form.tsx, resolve-all-flags-form.tsx, question-status-controls.tsx).
- Pushed to GitHub → Vercel auto-deployed.

**Feature expansion decisions (Architect, 2026-06-16):**
11 new tickets across 3 phases added to tracker and roadmap:

- **Phase A — Content Pipeline (M2):** TSP-166 (guided upload wizard), TSP-167 (AI-assisted enrichment on import). Addresses admin pain uploading question banks per topic.
- **Phase B — AI Study Companion (M5):** TSP-168 (chat schema), TSP-169 (chat server action + streaming), TSP-170 (chat UI), TSP-171 (context injector). Delivers a personalised chatbot grounded in each student's mastery/mistake/plan data. Requires founder per-user cost cap decision before TSP-169 goes live.
- **Phase C — Learning Paths (M7):** TSP-172 (schema), TSP-173 (path generator job), TSP-174 (progress tracker), TSP-175 (path UI), TSP-176 (goal-setting wizard). Full syllabus-aware personalised study roadmap with weekly milestones, mastery targets, and auto-completion. Requires founder definition of "cracking an exam" for TSP-176.

**What's already built that these phases leverage:**
- Groq gateway (TSP-066) + cost ledger: reused for Phase A enrichment and Phase B chat.
- mastery_records (TSP-055) + improvement_plans (TSP-071): context injector (TSP-171) reads these directly.
- Job runner + backoff (TSP-117): Phase C path generator job (TSP-173) registers as a new job type.
- Exam manifest topic hierarchy: already in DB — TSP-173 reads it for syllabus coverage.

**Open founder decisions surfaced this session:**
1. Per-user/day AI chat cost cap and behavior when cap is hit (TSP-169 pre-launch).
2. Definition of "cracking an exam" (TSP-176 wizard framing).
3. Content ownership model for uploaded questions.

---

## Session 36 (2026-06-12) — Architect audit + frontend design pass

**Audit findings:**
- Gates re-verified GREEN at HEAD in Test_Portal after the undocumented 2026-06-07 fix burst (5 commits, `29efe69`…`10099b7`, 21:56–23:17 — looks like a live browser-smoke/debug session: 500s on session page + dashboard, broken question content repair script, `mastery_records` constraint fix, parallel post-submit side-effects). **No HANDOFF entry covers 06-07 — whoever ran it should backfill.**
- `202606070001_mastery_records_unique_constraints.sql` exists; no record found that it was applied live. Verify with `node run-migrations.js` before next smoke.
- Tracker CSV repaired: TSP-162 had 17 cells (missing `Built By` shifted Milestone into Rollback Notes); TSP-163 had 21 cells (Agent S scope list split, fragments spilled into Rollback Notes/Milestone). Both now well-formed 18-column rows; full-file re-quote via csv module.
- Still pending: M0 manual browser smoke (20 Review rows — checklist below), key rotation (`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`), founder AI guardrails/cost-cap decision, `RESEND_API_KEY`.

**TSP-165 (new, founder request):** styling-only frontend design pass — design tokens (accent/success/warning/destructive/ring), layered radial background, font stack, sticky translucent app/admin headers with brand marks, active-state `NavLink` client component, redesigned landing hero + auth layout, card containers → `rounded-xl shadow-card` across 29 files. Commit `d4da0c0` (37 files, +290/−120). No logic touched. Gates in Test_Portal: typecheck ✅ lint ✅ (0 err/7 warn) test ✅ 302/302 build ✅ (exit 0, full route table). **TSP-165 Done.**
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
- Session 17 completed for the first visible M4 dashboard widgets (TSP-078, TSP-079): `/dashboard` now server-renders active exam selection, readiness score, weak topics, and overview stats from `fetchDashboardOverview`.
- Session 18 completed for M4 strategy signals and dashboard retest launch (TSP-081, TSP-063): `/dashboard` now surfaces recent strategy metrics and lets users start due retests from the queue.
- Session 19 completed for M3 mastery decay and M4 concept-retest routing (TSP-057 + S18-A): `concept_retest` now uses the recency-aware balanced topic selector, and pg_cron schedules nightly mastery decay.
- Session 20 completed for M4 next best action card and timeline (TSP-077, TSP-080): computeNextAction logic, next best action dashboard widgets, progress timeline query, and inline SVG rendering are done.
- Session 21 completed for M5 AI gateway and schemas (TSP-066, TSP-067): native-fetch Groq gateway, llm_cost_ledger, grounded prompt builder, and Zod schemas for post-test analysis inputs/outputs are done.
- Session 22 completed for M5 post-test analysis job (TSP-068): async post-test analysis generation, ai_analyses table persistence, defensive question context extraction, and submit wire-up are done.
- Session 23 completed for M5 analysis result UI (TSP-069): client-safe AnalysisView types, server action fetching analysis, TestRunner rendering logic, and polling/refresh are done.
- Session 24 completed for M5 explanation rating and reporting (TSP-070): explanation_ratings table, user rating action, admin downvoted ratings queue, and user-facing feedback widgets are done.
- Session 25 completed for M5 AI study plan generation (TSP-071): prioritized study plan generated on diagnostic submit, improvement_plans table migration/RLS, and schema validation are done.
- Session 26 completed for M5 AI study plan result UI (TSP-160): improvement plan result UI, client-safe PlanView mapper, and TestRunner rendering logic are done.
- Session 27 completed for M5 jobs schema and enqueue utility (TSP-116): public.jobs table schema, index, triggers, and RLS (admin-select, authenticated-insert) applied live; types.ts discriminating 12 job types and payloads defined; enqueueJob utility with 23505 duplicate key resolution and generateIdempotencyKey helper added; and unit tests covering success, conflict, and error paths passing.
- Session 28 completed for the job runner (TSP-117): `claim_pending_jobs` and `finalize_job` security-definer RPCs using `FOR UPDATE SKIP LOCKED` implemented live; cookie-free admin client `admin.ts` created; `computeBackoffMs`, handlers for `generate_analysis`/`generate_improvement_plan`, and `runPendingJobs` in `runner.ts` created; run API route endpoint created; and 12 unit tests covering backoff math and runner execution paths passing.
- Session 29 completed for M5 job monitor (TSP-093): `retry_job` RPC security-definer function, server action `retryJobAction` with UUID guard, `/admin/jobs` overview page with filter tabs and retry forms, admin console cards and navigation links updated, and live migrations successfully applied.
- Session 30 completed for M5 async AI job wiring + status notification (TSP-118): Wired `submitSessionAction` to enqueue `generate_analysis` and `generate_improvement_plan` jobs asynchronously; added `get_my_job_status` security-definer RPC function; updated `getSessionAnalysisAction` and `getSessionPlanAction` to fallback to checking job status via RPC if output row is absent, defaulting to `running` or returning `failed`; optimized `<AnalysisPanel>` and `<PlanPanel>` polling to 20 attempts of 3s intervals (60s total auto-polling window), rendering Refresh button and actionable message on fail.
- Session 31 completed for M4 event capture foundation (TSP-096 + TSP-097): Deployed `user_events` table migration with indices, owner-insert / owner-admin-select RLS, and authenticated select/insert grants; added Drizzle schema mapping `analytics.ts` and registered it in `index.ts`; defined type-safe `EVENT_TYPES` allowlist and payloads; implemented non-fatal `logEvent` logger with 5 unit tests; wired `test_start` to `startSessionAction`, `test_submit` to `submitSessionAction`, `answer_save` to `saveAnswerAction`, and `analysis_view` to `AnalysisPanel` using a ref-guarded `logAnalysisViewAction` server action.
- Session 32 completed for the mistake notebook and retest gap closure (TSP-061 + TSP-063): Implemented fetchMistakeItems query helper (owner/exam scoped, topic/concept names batched, best-effort stem from prompt_snapshot via extractStem), resolveMistakeAction server action (direct owner .update() via owner-update RLS policy), /mistakes server page with exam/status/type filters grouped by topic, MistakeItemRow Client Component, Layout nav link, startRetestAction writing retestQueueId to metadata, and submitSessionAction updating retest_queue completed status.

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
| `TSP-057` | Done | Forgetting-curve decay is complete. Added pure `computeDecayedMastery`, 12 deterministic unit tests, a security-definer `apply_mastery_decay()` function, and an active pg_cron job named `decay-mastery-nightly` at `0 2 * * *`. |
| `TSP-059` | Done | Mistake notebook schema is complete. Added `mistake_items` and `retest_queue` with owner RLS, authenticated grants, required indexes, idempotent mistake item uniqueness, and topic/concept XOR for retest queue. |
| `TSP-060` | Done | Mistake item creation is complete. Added pure classification, Supabase job handler, submit-action non-fatal wiring after mastery, 12 classification tests, and live smoke for four mistake types plus idempotency. |
| `TSP-062` | Done | Simple retest scheduler is complete. Added pure schedule computation, retest queue job, submit-action non-fatal wiring after mistake creation, 15 scheduler tests, and live smoke for due queue rows plus idempotency. |
| `TSP-063` | Done | Concept retest sessions from dashboard are complete for MVP. Added `startRetestAction`, due retest client widget, redirect into the existing test runner, and Session 19 routing through the balanced recency-aware selector. Remaining known gaps: queue status updates and display names. |
| `TSP-066` | Done | Native-fetch Groq gateway, append-only `llm_cost_ledger`, cost/hash helpers, kill switch, tests, migration, and live smoke are complete. |
| `TSP-067` | Done | Versioned post-test analysis input/output schemas, validator, grounded prompt builder, and tests are complete. |
| `TSP-068` | Done | `ai_analyses` persistence, store-injected analysis job, defensive question context extraction, non-fatal submit hook, tests, and live migration verification are complete. |
| `TSP-069` | Done | Client-safe AnalysisView types, toAnalysisView server mapper, getSessionAnalysisAction polling action, AnalysisPanel UI with polling/refresh, and 8 unit tests are complete. |
| `TSP-070` | Done | Explanation rating schema, database table `explanation_ratings`, rateExplanationAction server action, ExplanationRating widget, and admin ratings feedback queue are complete. |
| `TSP-071` | Done | Priority study plan generation, database table `improvement_plans`, generatePlanJob runner, and 17 unit tests are complete. |
| `TSP-076` | Done | Dashboard overview API is complete. Added backend aggregation for readiness, weak topics, due retests, recent sessions, unresolved mistakes, and strategy metrics, plus server action wrapper and 16 pure unit tests. |
| `TSP-077` | Done | Dashboard next-best-action logic, unit tests, server card, and anchor link are complete. |
| `TSP-078` | Done | Readiness card is complete. The dashboard page loads active exams, calls `fetchDashboardOverview`, and renders score, confidence, coverage, stale-topic warning, and benchmark nudge. |
| `TSP-079` | Done | Weak topics widget is complete. The dashboard renders up to five weak topics with mastery bars, weight badges, `/tests` practice links, empty state, and overview stat chips. |
| `TSP-080` | Done | SVG timeline query and dashboard svg visual widget are complete. |
| `TSP-081` | Done | Strategy metrics widget is complete. The dashboard conditionally renders recent-session strategy signals and highlights negative marks lost or high-confidence wrong above threshold. |
| `TSP-116` | Done | Database table `public.jobs` with status/next_run_at index and trigger, RLS policies, JOB_TYPES/JobPayloads types, enqueueJob helper with 23505 conflict resolution, and unit tests are complete. |
| `TSP-117` | Done | claim_pending_jobs and finalize_job locking RPCs, createAdminClient config helper, computeBackoffMs backoff calculator, runPendingJobs engine, and API cron endpoint are complete. |
| `TSP-118` | Done | Async AI job wiring, get_my_job_status RPC, fallback actions, and polling panel UX improvements are complete. |
| `TSP-096` | Done | user_events schema migration, owner RLS, Drizzle mapping analytics.ts, EVENT_TYPES allowlist, logEvent logger, and 5 unit tests are complete. |
| `TSP-097` | Done | Core test events (test_start, test_submit, answer_save, analysis_view) wired to actions and UI. |
| `TSP-128` | Done | Session 10 scoring unit tests cover all six question types, marking rules, manifest parsing, malformed single-choice selections, and session/topic aggregation. Sanity review passed. |
| `TSP-090` | Review | S1-A is fixed: admin guard trusts only `app_metadata.user_role` and JWT role claims, not `user_metadata`. Browser admin/non-admin smoke still needs a real admin user and reachable Supabase session. |
| `TSP-159` | Done | `question_status_events` migration/schema and review-history integration are implemented and live migration gate is cleared. |
| `TSP-160` | Done | Client-safe study plan types, `toPlanView` mapper with schema revalidation, `getSessionPlanAction`, and `<PlanPanel>` polling widget are complete. |
| `TSP-093` | Done | Job monitor UI page with status filters and color-coded badges, server action for job retry, and security-definer retry RPC are complete. |

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
- 2026-06-03 Session 17 verification passed: `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0. Browser verification was not possible because the dev server remains blocked in this OneDrive workspace.
- 2026-06-03 Session 18 verification passed for both commits: `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0. No migration or smoke script applied. Browser verification was not possible because the dev server remains blocked in this OneDrive workspace.
- 2026-06-03 Session 19 verification passed: `corepack pnpm exec vitest run src/tests/unit/mastery-decay.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0. `node run-migrations.js` applied migrations through `202606030002_mastery_decay.sql`; `SELECT * FROM cron.job WHERE jobname = 'decay-mastery-nightly'` returned one active job; `SELECT public.apply_mastery_decay()` completed; live `start_test_session` source contains `concept_retest_balanced`.
- 2026-06-03 Session 20 verification passed: `corepack pnpm exec vitest run src/tests/unit/next-action.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0. No migration or smoke script applied.
- 2026-06-03 Session 21 verification passed: `corepack pnpm exec vitest run src/tests/unit/ai-cost.test.ts src/tests/unit/ai-gateway.test.ts src/tests/unit/analysis-schema.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, and `corepack pnpm build` all exited 0. `node run-migrations.js` applied `202606030003_llm_cost_ledger.sql`; `to_regclass('public.llm_cost_ledger')` returned `llm_cost_ledger`; live Groq smoke passed on `llama-3.3-70b-versatile` with 72 input tokens, 8 output tokens, 2686 ms latency, and estimated cost `$0.000049`.
- 2026-06-03 Session 22 verification passed: `corepack pnpm exec vitest run src/tests/unit/generate-analysis.test.ts`, `corepack pnpm typecheck`, `corepack pnpm lint` after elevated rerun, `corepack pnpm test`, and `corepack pnpm build` all exited 0. `node run-migrations.js` applied `202606030004_ai_analyses.sql`; `to_regclass('public.ai_analyses')` returned `ai_analyses`; the scored-session `question_versions` read policy exists. Live `question_versions` content-shape probe found zero rows, so extraction remains defensive.

---

## Next Recommended Work

**Session 32 completed (2026-06-05) for the mistake notebook and retest gap closure (TSP-061 + TSP-063): Implemented fetchMistakeItems query helper, resolveMistakeAction server action, unresolved mistakes page layout, MistakeItemRow Client Component, startRetestAction writing retestQueueId to metadata, and submitSessionAction updating retest_queue completed status.**

Session 4-6 M1 rows remain in Review pending browser smoke. Session 7-9 M2 rows are in Review after live DB verification. Session 8 and 9 Sanity reviews passed. Session 10 rows `TSP-051`, `TSP-052`, and `TSP-128` are Done. Session 11 rows `TSP-053` and `TSP-054` are Done after Sanity review. Session 12 row `TSP-055`, Session 13 row `TSP-056`, Session 14 rows `TSP-059`/`TSP-060`, Session 15 rows `TSP-062`/`TSP-063`, Session 16 row `TSP-076`, Session 17 rows `TSP-078`/`TSP-079`, Session 18 row `TSP-081`, Session 19 row `TSP-057`, Session 20 rows `TSP-077`/`TSP-080`, Session 21 rows `TSP-066`/`TSP-067`, Session 27 row `TSP-116`, Session 28 row `TSP-117`, and Session 29 row `TSP-093` are Done.

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
- **TSP-057** - Done; pure decay helper/tests, pg_cron scheduler, active nightly job, and manual decay trigger verification are complete.
- **TSP-059** - Done; mistake_items and retest_queue schema, RLS, grants, and indexes are live.
- **TSP-060** - Done; mistake item classifier/job, submit wire-up, tests, and live smoke are complete.
- **TSP-061** - Review; fetchMistakeItems query helper, resolveMistakeAction direct update action, server mistakes page with exam/status/type filters, and MistakeItemRow components are implemented and await browser smoke.
- **TSP-062** - Done; simple retest scheduler, retest queue job, submit wire-up, tests, and live smoke are complete.
- **TSP-063** - Done; due retest rows can start `concept_retest` sessions from the dashboard, and those sessions now route through balanced recency-aware selection. Closes the retest completion status gap.
- **TSP-076** - Done; dashboard overview aggregation, server action wrapper, and pure helper tests are complete.
- **TSP-077** - Done; dashboard next-best-action logic, unit tests, server card, and `#due-retests` anchor are complete.
- **TSP-078** - Done; readiness card and dashboard data loading are complete.
- **TSP-079** - Done; weak topics widget and dashboard overview stat chips are complete.
- **TSP-080** - Done; progress timeline query and server-rendered inline SVG timeline are complete.
- **TSP-081** - Done; strategy metrics widget is complete.
- **TSP-065** - In Progress as the M5 AI parent epic.
- **TSP-066** - Done; native-fetch Groq gateway, append-only `llm_cost_ledger`, cost/hash helpers, kill switch, tests, migration, and live smoke are complete.
- **TSP-067** - Done; versioned post-test analysis input/output schemas, validator, grounded prompt builder, and tests are complete.
- **TSP-068** - Done; `ai_analyses` persistence, store-injected analysis job, defensive question context extraction, non-fatal submit hook, tests, and live migration verification are complete.
- **TSP-128** - Done; scoring unit tests are implemented and sanity-passed.
- **TSP-116** - Done; jobs schema, indices, trigger, and RLS policies are applied live. Discriminator types and enqueue job utility with duplicate handler are verified.
- **TSP-117** - Done; background job runner, locking RPCs via FOR UPDATE SKIP LOCKED, backoff calculator, groq analysis/improvement plan generators, and cron API route endpoint are complete.
- **TSP-118** - Done; async AI job wiring, get_my_job_status RPC, status fallback in actions, and UI polling improvements are complete.
- **TSP-096** - Done; user_events schema, Drizzle schema, typescript allowlist, logEvent logger, and unit tests are complete.
- **TSP-097** - Done; core test events tracked in session actions and result UI.
- **TSP-093** - Done; job monitor UI page with status filters and color-coded badges, server action for job retry, and security-definer retry RPC are complete.

Next immediate steps:

1. **Session 33 - TSP-028 (DONE, 2026-06-05)** - question flags & quarantine (M2 critical-path). Two commits landed:
   - Commit 1 (schema + mechanism): `202606050001_question_flags_quarantine.sql` (partial unique index, `submit_question_flag` plpgsql security-definer RPC with auto-quarantine at 3 distinct open flags and inline `live->flagged` audit, `resolve_question_flag` admin-only RPC, grants); `flag-reasons.ts` allowlist; `flagQuestionAction` in `actions.ts`; `ReportQuestion` client widget; TestRunner wiring; `flag-reasons.test.ts` (6 unit cases, offline-verifiable); `smoke-question-flags.js` (4 assertions, gated on M0); `check-rpc-grants.js` updated 12→14 RPCs.
   - Commit 2 (admin surface): `flags/page.tsx`, `flag-actions.ts`, `resolve-flag-form.tsx` (useActionState), admin-nav Flagged link, admin overview card.
   - typecheck + lint + build pass. TSP-028 → Review pending M0 live-DB/browser smoke. Unblocks TSP-092.
2. **Session 34+ candidate - TSP-092** - rich triage queue (bulk actions, filters, per-reason analytics) — unblocked by TSP-028.
3. **Session 34+ candidate - TSP-098** - compute question stats nightly (deferred until live attempts accumulate post-M0).
4. **Founder config & wiring** - configure `SUPABASE_SERVICE_ROLE_KEY` in `.env` and wire cron trigger to `GET /api/jobs/run`.
5. **Founder decision before TSP-068 user-facing release** - per-user/day cost cap, cap behavior, grounding strictness, model choice, and monthly AI ceiling.
6. **Browser smoke** — now unblocked (users + content exist); pick up tomorrow per the checklist below.

---

## M0 Unblock — Status & Resume Checklist (2026-06-05 late, Architect)

**Backend M0 is DONE. Only the manual browser smoke (click-through) remains — resuming tomorrow.**

Done today:
- `DATABASE_URL` confirmed already correct (transaction pooler, port 6543). The old "fix the URL" item was stale — migrations always used it.
- `SUPABASE_SERVICE_ROLE_KEY` added to `.env`.
- **Admin + student users created & verified live** via `scripts/create-test-users.js`:
  - `admin@example.com` — `app_metadata.user_role=admin`, email-confirmed, identity row present (login-ready). Password printed at creation.
  - `student@example.com` — plain, confirmed.
- **Anon key fix:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` had the wrong project ref (`iwzb…` vs `iwzerb…`) → "Invalid API key" on login; founder replaced it with the correct anon/public key.
- **Repo cloned OFF OneDrive** to `C:\Users\Rakesh\Documents\Test_Portal`; dev server runs there. The OneDrive copy (`…\OneDrive\Documents\Business\TEST`) stays the **canonical git repo + Builder/Architect workspace**. Test_Portal's git `origin` = the OneDrive repo; sync via `git pull` (commit in OneDrive first — pull only moves committed work). OneDrive Files-On-Demand was the root cause of the dev-server `errno -4094`.
- **2026-07-05 smoke-runner update:** If `C:\Users\Rakesh\Documents\Test_Portal` or another helper clone is dirty and blocks `git pull`, do not stash/reset/force it unless the user explicitly asks. Create a fresh local smoke clone from the committed OneDrive repo, for example `C:\Users\Rakesh\Documents\Test_Portal_Smoke`, install with `corepack pnpm install --offline --frozen-lockfile`, then run gates and route probes there. Use `node_modules\.bin\next.CMD start -p 3000` plus `http://127.0.0.1:3000/...` probes when `next dev` or `localhost` are unreliable. Record commit SHA, clone path, route status, and server PID in `HANDOFF.md`.
- **Do not use `C:\Users\Rakesh\Videos\TEST` as a trusted TEST gate clone** unless it is explicitly repaired first; as of 2026-07-05 it was dirty, had no upstream configured for `master`, and pointed at a HuggingFace Space remote rather than the normal TEST workflow.
- Fixed a `"use server"` runtime error (illegal object exports in `src/app/test/actions.ts`) — committed.
- **Seeded 18 live demo MCQs** (1 per UPSC topic) via `scripts/seed-demo-questions.js` so tests/flagging have content.
- **TSP-028 Sanity: PASS** with blocking fix **S33-A** (ON CONFLICT arbiter predicate didn't match the partial index → would throw on every flag). Fixed in migration + re-applied live. Commit `ca7e92c`.

⚠️ **Security to-do (founder):** real `SUPABASE_SERVICE_ROLE_KEY` and `GROQ_API_KEY` were briefly pasted into the TRACKED `.env.example` (reverted before any commit — never hit git history). **Rotate both keys**, and keep `.env.example` placeholders-only going forward.

**Uncommitted at end of session (commit tomorrow):**
- `scripts/seed-demo-questions.js` (new)
- `trackers/JIRA_TRACKER.csv` — **TSP-161** added (fixed test-paper authoring; M2/Backlog)
- doc updates (this file + `HANDOFF.md`)

**Resume checklist (tomorrow):**
1. Commit the uncommitted items above; `git pull` in Test_Portal (if it flags local `actions.ts`, run `git checkout -- src/app/test/actions.ts` then pull).
2. Rotate `SUPABASE_SERVICE_ROLE_KEY` + `GROQ_API_KEY`; update `.env` in both copies.
3. **Admin smoke:** `/admin/questions` (list/search/filter/edit + tier/policy), `/admin/questions/review` (lifecycle + history), `/admin/questions/import` (bulk JSON), `/admin/questions/flags` (resolve/reject), `/admin/manifests` (validate; import only a **new-slug** exam — do NOT re-import `upsc-prelims` over the seeded questions).
4. **Student smoke:** `/tests` diagnostic → answer / confidence / mark-for-review / navigate / tab-switch → submit → score; `/dashboard`; `/mistakes`; "Report this question" flag.
5. Flip smoked rows to **Done**: TSP-019/024/025/026/031/090, TSP-036/037/038/040/043–049, TSP-029/030, TSP-061, TSP-028.
6. Optional: `node scripts/smoke-question-flags.js` (verifies 3-distinct-user auto-quarantine); trigger `GET /api/jobs/run` to exercise AI analysis jobs.

---

Still parked (need external inputs):

- **Repair pnpm install** — the OneDrive copy still has broken top-level symlinks; the off-OneDrive Test_Portal clone got a clean `pnpm install`. Prefer Test_Portal for running.
- **Smoke clone fallback** — if Test_Portal is dirty, prefer a fresh clone such as `C:\Users\Rakesh\Documents\Test_Portal_Smoke` over pulling into or resetting the dirty helper clone.
- **TSP-019, TSP-024, TSP-025, TSP-026, TSP-090, TSP-040, TSP-043–049, TSP-029, TSP-030, TSP-031, TSP-036, TSP-037, TSP-038, TSP-061, TSP-028 → Done** — admin + student users now EXIST and content is seeded; these just await the manual browser-smoke pass (checklist above).
- **TSP-068 AI analysis user-facing release** - needs founder guardrails and per-user cost-cap decision.
- **TSP-085 reminders** â€” blocked on `RESEND_API_KEY`.

---

## Important Handoff Notes

- **Grant fix applied and verified** - `202605170001_admin_question_crud.sql` was missing `grant execute` for all question CRUD RPCs. The fixed migration has been re-applied to the live DB and authenticated execute grants are verified.
- Real Supabase browser smoke remains blocked until an admin user and plain test student are available.
- Local verification commands pass after elevated reruns, but clean dependency repair is still open. Offline install failed because `isomorphic-dompurify@2.36.0` is missing from the local store; network repair attempt timed out.
- 2026-05-31 resolved: the Supabase `tenant/user not found` failure was caused by a paused project. After unpause, migrations, grant checks, and direct smoke passed live.
- Needed now: admin user with `app_metadata.user_role = "admin"` or equivalent `user_role` claim, plus a plain test student for `/tests` smoke.
- 2026-05-18 migration update: pooler URI/password works, migrations applied, direct RPC smoke passed.
- 2026-05-18 review: grant bug in `202605170001` found and fixed; DB re-migration completed and grants verified.
- Needed later: `SUPABASE_SERVICE_ROLE_KEY` for server-side admin jobs. `GROQ_API_KEY` is now live and Session 21 smoke passed.
- `trackers/JIRA_TRACKER.csv` is the task source of truth.
- Add `Built By` and `Builder Remarks` for every completed builder row.
- Do not mark a row `Done` if the real backend step is not implemented.

---

## 2026-06-03 — Session 22 Sanity Review (TSP-068)

**Architect Sanity: PASS**

All 15 gates green. 12 tests (5 extractQuestionContext + 1 buildAnalysisInput + 6 job paths) all offline and deterministic. Migration correct: UNIQUE on `session_result_id`, RLS select/insert/update (no delete), `question_versions_read_scored_session` bonus policy for server-action content reads. `generateAnalysisJob` idempotent via 23505 code, user-mismatch guard, non-fatal `callAiSafely` wrapper, status machine correct, `truncateError` at 1000 chars. Dynamic import wired in `submitSessionAction` inside `!wasAlreadyScored`. Two latent flags, both non-blocking: stuck `running` rows if `finalizeRow` throws (outer try/catch still catches); zero question_versions rows (defensive fallbacks correct, self-resolves on seeding).

**State after Session 22:** TSP-068 Done. M5 continues — TSP-069 (analysis result UI) is next. Founder guardrails decision required before AI output is user-visible.
