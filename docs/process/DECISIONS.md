# Decisions

Architecture and product decisions made during implementation.

---

## 2026-05-06 - Manual Scaffold Instead Of Generator

**Decision:** Create the app scaffold manually instead of using `create-next-app`.

**Reason:** The final TRD defines a specific production repo structure. Manual scaffold avoided generator drift and network dependency during setup.

**Alternatives rejected:** Use `create-next-app` and then reshape folders.

---

## 2026-05-06 - pnpm Via Corepack

**Decision:** Use pnpm through Corepack.

**Reason:** `pnpm` was not globally available, but Corepack was present. This keeps package manager reproducible through `packageManager`.

**Notes:** Native dependency builds required approval/rebuild on the Windows workspace.

---

## 2026-05-06 - Supabase No-Config Mode

**Decision:** Auth pages, middleware, and profile shell compile and render when Supabase env values are missing.

**Reason:** The project needs to continue building before real Supabase credentials are available.

**Tradeoff:** Real auth behavior cannot be verified until `.env` is configured.

---

## 2026-05-06 - Disable Next Typed Routes For Now

**Decision:** Disable `typedRoutes` in `next.config.mjs`.

**Reason:** Early auth server actions use dynamic redirect strings. Typed routes created friction during scaffold stage.

**Revisit:** Re-enable later when route structure stabilizes and dynamic redirect handling is typed safely.

---

## 2026-05-06 - Manifest Validation Before DB Import

**Decision:** Build client/admin manifest validation first; keep transactional DB import as a separate task.

**Reason:** Validation can be implemented and tested without Supabase credentials. DB persistence needs real backend connection and should not be faked as complete.

**Tracker impact:** `TSP-019` remains `In Progress`.

---

## 2026-05-06 - Admin Role Via JWT Claim

**Decision:** Use `public.is_admin()` helper checking JWT `app_metadata.user_role` or `user_role`.

**Reason:** Matches Supabase Auth claim-based access and keeps admin RLS policies centralized.

**Tradeoff:** Admin role assignment process must be finalized before production.

---

## 2026-05-06 - Planning Artifact Folder Structure

**Decision:** Keep current source files at the repo root, final docs in `docs/final/`, process docs in `docs/process/`, agent drafts in `docs/agents/`, original drafts in `docs/archive/`, and tracker CSV files in `trackers/`.

**Reason:** Multi-agent sessions need stable entry points and a clean root so source/config files are not mixed with brainstorming and planning artifacts.

**Tradeoff:** Existing tracker `Source` cells still reference document titles like `FINAL_TRD`; the canonical paths are documented in `README.md` and `docs/process/AGENT_WORKFLOW.md`.

---

## 2026-05-15 - Groq As First AI Provider

**Decision:** Use Groq as the first AI inference provider behind the future AI gateway abstraction.

**Reason:** Founder direction for the implementation. The provider abstraction remains required so AI workflows can swap models without changing product logic.

**Tradeoff:** The final TRD previously named Anthropic as the first implementation default. AI gateway tasks should follow this newer decision and update the final TRD when TSP-066 begins.

---

## 2026-05-15 - Question Version Content Is Admin/Server Only

**Decision:** Keep `question_versions` answer-bearing content readable only by admins for now. Authenticated users may read live question metadata, concept mappings, and stats, but not version content through direct client reads.

**Reason:** `question_versions.content` includes correct answers and explanations. Future test session APIs should create sanitized session snapshots so answer keys are never exposed before submit.

**Tradeoff:** Early public question browsing is intentionally constrained until `TSP-035`/`TSP-039` define safe session payloads.

---

## 2026-05-30 - Session Question Snapshots Exclude Answer Keys

**Decision:** `session_questions.prompt_snapshot` stores an answer-stripped copy of the prompt shown to the user at session start. Correct answers and explanations remain only in admin/server-readable `question_versions` and are read server-side during scoring.

**Reason:** Sessions need stable prompt content even if the source question is edited mid-test, but users must never receive answer-bearing data before submit.

**Tradeoff:** Session start and scoring must coordinate through server-side code: start writes sanitized snapshots, while scoring reads the authoritative answer key from `question_versions`.

---

## 2026-05-30 - Prompt Snapshots Use Allowlists

**Decision:** Session start builds prompt snapshots by allowlisting safe fields per question type, both in `src/lib/test-session/prompt-snapshot.ts` and in the `build_session_prompt_snapshot` SQL helper used by `start_test_session`.

**Reason:** Answer-bearing fields can be nested inside question content, especially `pairs` for match questions. A blacklist is not a reliable security boundary.

**Tradeoff:** New prompt fields must be explicitly added to both the TypeScript helper and SQL helper. This is slower than generic copying, but prevents accidental answer leakage.

---

## 2026-05-30 - Scoring Uses Frozen Session State

**Decision:** `start_test_session` freezes `question_version_id` and marking metadata on the session. `submit_test_session` scores from those frozen values instead of current question versions or current manifest config.

**Reason:** Mid-test edits, retirements, or marking-rule changes must not alter the score for an already-started attempt.

**Tradeoff:** Later marking-rule improvements must handle already-started sessions as historical attempts. `TSP-051` can generalize the marking engine without changing this immutability rule.

---

## 2026-05-31 - Playable Test UI Uses Snapshots And Shared Answer Shape

**Decision:** The `/tests` UI reads only owner-visible `session_questions.prompt_snapshot` rows and uses `src/lib/test-session/answer-shape.ts` for selected-answer JSON.

**Reason:** Prompt snapshots preserve the answer-key isolation guarantee in the UI layer, and a shared answer-shape helper prevents silent scorer mismatches such as `{selected: 1}` instead of `{options: [1]}`.

**Tradeoff:** M1 supports MCQ, MSQ, and integer answer entry first. Statement, assertion, and match prompts render safely, but full answer entry waits for a follow-up snapshot/renderer amendment.

---

## 2026-05-31 - Test Timer Is Server-Derived

**Decision:** The client countdown is derived from `test_sessions.expires_at` and server render time, while the server remains authoritative for expired saves and submit scoring.

**Reason:** A local-only timer can be extended by client clock tampering. The UI can display time, but `saveAnswerAction` and `submit_test_session` decide what is accepted.

**Tradeoff:** The first M1 runner uses a straightforward one-question shell. Rich recovery, tab-switch logging, and navigator-grid behavior stay in later M1 rows.
