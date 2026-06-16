# Roadmap

**Owner:** Architect · **Created:** 2026-05-31 · **Status:** living document

> **READ THIS BEFORE ARCHITECTING ANY SESSION.** Every session plan must name the milestone it advances and respect the milestone ordering and the critical path below. If a requested session conflicts with this ordering, flag it to the founder before planning.

The milestone for every tracker row lives in the `Milestone` column of `trackers/JIRA_TRACKER.csv`. This file is the narrative; the tracker is the per-row source of truth. Keep them in sync — if a row's milestone changes, update both.

---

## Guiding principle

Build the **thinnest vertical slice a user can experience, then deepen it.** Work proceeds in "sessions" of ~3 tracker rows (Architect plan → Builder → Sanity review), one commit per row.

**Demo-ready ≈ end of M1 · genuinely valuable ≈ end of M4 · launchable ≈ M6.**

---

## Critical path (one line)

**M0 unblock → M1 playable demo → M2 quality/selection+content-pipeline → M3 learning model → M4 dashboard → (M5 AI+chat-companion ∥ M6 hardening) → M7 learning-paths.**

M5 (AI) and M6 (hardening) can run in parallel once M4 lands. Parts of M6 (accounts, infra) have no feature dependency and may be pulled forward if capacity exists.

---

## Milestones

### M0 — Unblock & Verify *(founder action; gates everything)*
Nothing built is *confirmed real* until the live database is verified. One credential fix unblocks 11 already-built rows.
- Fix `DATABASE_URL`, apply migrations, create an admin user + a test student.
- Smoke-test and close the in-Review rows: **TSP-019, 024, 025, 026, 027, 035, 039, 040, 041, 090, 159**.
- **Exit criteria:** those rows reach `Done`; start→save→submit and the admin review queue verified against a live DB.

### M1 — Playable Test *(the demo: login → take test → see score)*
Put a face on the test engine finished in Session 3.
- **TSP-043** shell+timer, **TSP-044** renderer, **TSP-045** navigator, **TSP-046** confidence, **TSP-047** mark-for-review, **TSP-048** autosave recovery, **TSP-049** tab-switch logging. (Epics: TSP-042, TSP-034.)
- **Architect decisions to lock:** server-authoritative timer (`expires_at` is the source of truth; client clock advisory); autosave-recovery conflict rule (server wins); fix revisit_count semantics (Sanity note N5).
- **Exit criteria:** a real user can take and submit a test on screen and see a score.

### M2 — Quality & Selection *(make tests meaningful)*
Selection currently grabs any live question. Make it quality-filtered and targeted.
- **TSP-029** quality tiers, **TSP-030** exposure policies *(unblock selection)* → **TSP-028** flags/quarantine, **TSP-031** admin search/filter, **TSP-032** semantic dedup, **TSP-033** PYQ metadata, **TSP-020** manifest export → **TSP-036** diagnostic, **TSP-037** topic-practice, **TSP-038** benchmark selection. (Epics: TSP-022, TSP-016.)
- **Founder decision needed:** admin-role model (single admin vs reviewer/approver split) — surfaces with flags/quarantine.
- **Phase A — Content Pipeline:** **TSP-166** guided bulk-upload wizard (replaces raw-textarea import with a 3-step exam/topic → paste → AI-preview flow), **TSP-167** AI-assisted question enrichment on import (Groq suggests difficulty/topic/explanation per row; advisory, admin overrides). Both build on TSP-025 and TSP-066.

### M3 — Scoring & Learning Model *(turn a score into insight)*
- **TSP-051** marking rules engine, **TSP-052** answer-eval by type, **TSP-053** result aggregates, **TSP-054** strategy metrics, **TSP-055** mastery update, **TSP-056** readiness score, **TSP-057** forgetting-curve decay, **TSP-128/129** scoring/mastery unit tests. (Epic: TSP-050.)
- Generalizes the basic marking hard-coded in Session 3 (resolves Sanity note N4, match-type scoring).
- **Founder decision needed:** the mastery/readiness formula (product-defining).

### M4 — Dashboard & Retention *(a reason to return)*
Two parallel tracks once M3 lands:
- **Dashboard:** TSP-076 overview API, 077 next-best-action, 078 readiness card, 079 weak topics, 080 progress timeline, 081 strategy metrics. (Epic: TSP-075.)
- **Mistake Notebook & retests:** TSP-059 schema, 060 create-on-submit, 061 page, 062 retest scheduler, 063 concept retests, 064 FSRS. (Epic: TSP-058.)
- **Scheduling/streaks/reminders/digest:** TSP-083–088 (needs jobs from M5 + `RESEND_API_KEY`). (Epic: TSP-082.)
- **Event capture:** TSP-096/097 (start logging signals now to feed later analytics).

### M5 — AI & Workers *(the differentiator)*
Build the worker layer first — AI runs in the background.
- **Jobs/workers:** TSP-116 schema, 117 runner, 118 notifications, 119 escalation, 143 alerting. (Epic: TSP-115.)
- **AI:** TSP-066 gateway, 067 prompt schemas, 068 analysis job, 069 result UI, 070 ratings, 071 improvement plan, 072–074 question generation. (Epic: TSP-065.)
- **Admin ops on top:** TSP-092 flagged queue, 093 job monitor, 094 audit viewer. (Epic: TSP-089.)
- **Phase B — AI Study Companion:** **TSP-168** chat schema, **TSP-169** AI chat server action + streaming (Groq, context-injected), **TSP-170** chat UI (`/study/chat`), **TSP-171** context injector (grounds chat in each student's mastery/mistakes/plan). Entry from dashboard weak-topics + diagnostic result page.
- **Blockers:** `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. **Founder decision:** AI grounding/safety guardrails + per-user cost caps (before generation goes live); per-user/day chat cost cap and cap-hit behavior required before TSP-169 goes live.

### M6 — Hardening & Launch *(safe for real users; parallelizable with M4/M5)*
- **Finish accounts:** TSP-010 Google login, 012 profile, 013 AI consent, 014 export/delete. (Epic: TSP-008.)
- **Infra:** TSP-102 staging/prod, 103 pooling, 104 rate limiting, 105 security headers, 106 admin MFA, 107 backups, 108 observability, 109 alerts, 110 runbooks, 111 feature flags, 112 load test, 113 rollback playbook, 114 cost monitoring, 141/142/145/146/147/148. (Epic: TSP-101.)
- **Confidence:** TSP-130 session integration, 131 admin import tests, 132/133 Playwright journeys, 134 security/authz tests, 144 post-deploy smoke. (Epic: TSP-127.)

### M7 — Phase 1.5 & Phase 2 *(beyond MVP)*
- **Advanced intelligence:** TSP-121 peer benchmark, 122 probability-of-selection, 123 selection dial, 124 auto-tagging, 125 vision PDF ingestion, 126 worker extraction. (Epic: TSP-120.)
- **Advanced analytics:** TSP-098 nightly stats, 099 A/B testing, 100 quality dashboard. (Epic: TSP-095.)
- **Ecosystem:** Phase 2 expansion. (Epic: TSP-135.)
- **Phase C — Learning Paths:** **TSP-172** schema (learning_paths + path_milestones), **TSP-173** path generator job (Groq, week-by-week syllabus plan), **TSP-174** progress tracker (nightly milestone auto-completion vs mastery targets), **TSP-175** path UI (`/study/path`), **TSP-176** goal-setting wizard (3-step: exam → date → aspiration). Combines exam syllabus, mastery, mistakes, and AI to produce a fully personalised study roadmap.
- **Founder decision needed (Phase C):** definition of "cracking an exam" for TSP-176 wizard framing; per-path AI generation cost model.
- Deliberately last — these compound on real user data we won't have until M1–M4 are live.

---

## Standing founder decisions (Architect will bring a focused options doc when each milestone arrives)
1. **M2** — admin-role model (single `is_admin()` vs reviewer/approver segregation of duties).
2. **M3** — mastery & readiness formula.
3. **M5** — AI grounding/safety guardrails and per-user cost caps (before TSP-068 goes live).
4. **M5 Phase B** — per-user/day AI chat cost cap and cap-hit behavior (pause vs notify vs throttle); required before TSP-169 ships.
5. **M7 Phase C** — definition of "cracking an exam" for the goal-setting wizard (TSP-176); per-path AI generation cost model.

## Credential/infra blockers by milestone
- **M0:** correct `DATABASE_URL` (transaction pooler); admin + test users.
- **M4 (reminders) / M5:** `RESEND_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **M6:** Vercel + Supabase staging/prod projects.
