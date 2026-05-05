# Product Requirements Document - agent_CT Version
## Test Series Portal - Unified Phase 1 Draft

**Owner:** agent_CT  
**Date:** 2026-05-05  
**Status:** Draft for polling and owner comments  
**Inputs merged:** `PRD.md`, `TRD.md`, `agent_CT.md`, `agent_G.md`, `PRD_agent_G.md`

---

## 1. Product Thesis

Build a modular self-study test series portal where every test creates measurable improvement. The platform should not behave like a static mock-test library. It should run a closed loop:

```text
Diagnose -> Practice weak concepts -> Review mistakes -> Retest -> Update mastery -> Repeat
```

The first release should win on assessment quality, trust, and repeat usage. AI should make feedback clearer and more personalized, but deterministic scoring and structured learner metrics must remain the source of truth.

---

## 2. Phase 1 Goal

Phase 1 is a test-led improvement platform, not a full course platform.

The user should be able to:

1. Select a target competitive exam.
2. Take a diagnostic test.
3. See topic and concept-level weaknesses.
4. Follow a recommended test path.
5. Take topic, sectional, mock, and retest sessions.
6. Review question-wise and topic-wise analysis.
7. Maintain a mistake notebook.
8. Schedule retests and upcoming tests.
9. Watch readiness improve through a transparent dashboard.

Phase 2 can add guided courses, articles, lectures, tutor chat, cohort tools, and payments.

---

## 3. Target Users

### Primary Users

- Self-study aspirants preparing for competitive exams.
- Students, repeaters, and working professionals.
- Users with 1-4 hours per day who need targeted practice rather than broad content browsing.

### Secondary Users

- Admins and content reviewers managing question banks.
- Coaching institutes and mentors in later phases.

---

## 4. Core User Journeys

### 4.1 Onboarding And Diagnostic

```text
Register -> Select exam -> Enter exam date and study availability
-> View exam pattern -> Start diagnostic
-> Submit -> See score immediately
-> AI-assisted improvement plan generated
-> Dashboard unlocked
```

Diagnostic output must include:

- Overall score.
- Topic scores.
- Concept gaps where tagging is available.
- Time-management signals.
- Confidence mismatch where confidence marking was used.
- Readiness score with confidence level.

### 4.2 Daily Improvement Loop

```text
Open dashboard -> See recommended task
-> Take topic/retest/mock session
-> Submit -> Review deterministic metrics
-> AI explanation and recommendations
-> Mistake notebook and retest queue update
-> Mastery/readiness update
```

### 4.3 Mistake Recovery Loop

```text
Wrong/guessed/skipped answer -> Added to mistake notebook
-> Explanation reviewed -> Concept retest scheduled
-> User passes retest -> Mistake marked resolved
-> Mastery confidence increases
```

### 4.4 Scheduling Loop

```text
View plan -> Accept suggested schedule or choose date
-> Reminder sent -> Test taken
-> Missed test becomes overdue
-> User can reschedule or take now
```

---

## 5. Product Principles

1. **Test-first:** The first screen after login should drive the user toward the next useful test or review action.
2. **Trust before novelty:** AI explanations must be grounded in correct answers, explanations, and deterministic metrics.
3. **Benchmark separately from practice:** Benchmark tests measure progress; adaptive practice improves weaknesses.
4. **Concepts matter:** Topic-level dashboards are useful, but retests and feedback should target concepts where possible.
5. **No black-box readiness:** Every score should explain what changed and how reliable the estimate is.
6. **Portable exams:** New exams should be launched through config and question import, not code changes.

---

## 6. Functional Requirements

### 6.1 User Management [P0]

| ID | Requirement |
|---|---|
| UM-01 | User can register and login with email/password. |
| UM-02 | User can register and login with Google OAuth. |
| UM-03 | User profile stores target exams, exam date, daily study time, preferred test days, and prep start date. |
| UM-04 | User can reset password. |
| UM-05 | User can export and delete account data. |
| UM-06 | User must consent to AI processing for AI-generated analysis. |

### 6.2 Exam Configuration And Template Store [P0]

| ID | Requirement |
|---|---|
| EC-01 | Admin can create an exam with name, slug, description, sections, duration, marks, negative marking, and scoring rules. |
| EC-02 | Admin can create a topic tree with section, topic, subtopic, and optional concept tags. |
| EC-03 | Admin can import/export an exam manifest as JSON. |
| EC-04 | Exam manifest includes syllabus, weights, test patterns, supported question types, language, and AI persona hints. |
| EC-05 | Multiple exam configurations can run simultaneously. |
| EC-06 | User can select one or more target exams. |

### 6.3 Question Bank [P0]

Supported sources:

- Previous year questions.
- Manual admin uploads.
- AI-generated questions requiring review.
- Vision-ingested questions from image/PDF sources, if approved for Phase 1.5.

Supported question types:

- MCQ.
- MSQ.
- Integer/numerical.
- Statement-based.
- Assertion-reasoning.
- Match the following.

| ID | Requirement |
|---|---|
| QB-01 | Admin can create, edit, review, approve, reject, flag, retire, and delete questions. |
| QB-02 | Admin can bulk import CSV/JSON with validation errors. |
| QB-03 | Questions must support topic, subtopic, concept tags, difficulty, source, source year, language, explanation, and media. |
| QB-04 | Questions follow lifecycle: draft -> validated -> reviewed -> approved -> live -> flagged -> retired. |
| QB-05 | System tracks version history and reviewer notes for each question. |
| QB-06 | System tracks usage count, user flag count, quality score, and last audited date. |
| QB-07 | System blocks near-duplicate questions using semantic similarity. |
| QB-08 | System supports admin full-text and semantic search. |
| QB-09 | AI-generated questions must include adversarial distractors based on common misconceptions where applicable. |
| QB-10 | Some questions can be reserved for diagnostic or benchmark use only. |

### 6.4 Test Types [P0]

| Test Type | Purpose | Selection Rule |
|---|---|---|
| Diagnostic | Establish baseline | Fixed/equated, broad syllabus coverage |
| Topic Test | Practice weak topics | Adaptive or weighted by mastery |
| Concept Retest | Confirm recovery | FSRS/spaced repetition queue |
| Sectional Test | Practice exam sections | Configurable by exam pattern |
| Full Mock | Simulate exam | Fixed/equated benchmark or mock template |
| Custom Test | User-selected practice | P1 unless needed for launch |

### 6.5 Test Engine [P0]

| ID | Requirement |
|---|---|
| TE-01 | User can navigate between questions using a question panel. |
| TE-02 | User can mark a question for review. |
| TE-03 | User can mark answer confidence: sure, unsure, guessed. |
| TE-04 | Timer, auto-submit, and negative marking follow exam config. |
| TE-05 | Answers auto-save on change and periodically. |
| TE-06 | Interrupted sessions can be resumed within configured time. |
| TE-07 | Per-question timing is tracked. |
| TE-08 | Tab switches are logged but not blocked in Phase 1. |
| TE-09 | Correct answers and explanations are never sent before submission. |
| TE-10 | Practice tests may adapt difficulty; diagnostics and benchmark mocks should remain fixed/equated. |
| TE-11 | For practice tests, system can insert easier confidence-builder questions after repeated failures if enabled. |

### 6.6 Diagnostic And Improvement Plan [P0]

| ID | Requirement |
|---|---|
| IP-01 | Diagnostic produces baseline topic and concept mastery. |
| IP-02 | Plan prioritizes topics using weakness, exam weight, recency, and exam date. |
| IP-03 | Plan considers daily study time and preferred schedule. |
| IP-04 | Plan shows recommended sequence: concept retests, topic tests, sectional tests, mocks. |
| IP-05 | Plan dynamically updates after each submitted session. |
| IP-06 | User can manually skip, reschedule, or reorder plan items. |
| IP-07 | Plan explains why each recommendation exists. |

### 6.7 Mistake Notebook And Retest Queue [P0]

| ID | Requirement |
|---|---|
| MN-01 | Wrong, skipped, guessed, and bookmarked questions enter the mistake notebook. |
| MN-02 | Notebook groups items by exam, topic, concept, mistake type, and status. |
| MN-03 | User can retest unresolved mistakes and related concepts. |
| MN-04 | Mistakes can be marked resolved only after successful retest or explicit user action. |
| MN-05 | Retest scheduling uses FSRS or a simpler spaced repetition algorithm selected during polling. |
| MN-06 | Notebook shows recurring misconceptions and high-confidence wrong answers. |

### 6.8 Post-Test Analysis [P0]

The analysis must combine deterministic metrics and AI-generated explanation.

Deterministic analysis:

- Score and accuracy.
- Topic/concept accuracy.
- Difficulty accuracy.
- Time spent on correct, wrong, skipped questions.
- Negative marks lost.
- Confidence mismatch.
- Repeated mistakes.
- Attempt order and fatigue indicators.

AI-assisted analysis:

- Question-wise explanation.
- Why user's selected answer was wrong.
- Common trap/distractor explanation.
- Topic summary.
- Top action items.
- Retest recommendations.

| ID | Requirement |
|---|---|
| AI-01 | User sees score immediately after submit. |
| AI-02 | AI analysis is generated asynchronously. |
| AI-03 | Frontend shows analysis progress and completion. |
| AI-04 | User can rate or report an explanation. |
| AI-05 | Flagged explanations enter admin review. |
| AI-06 | Analysis stores model/prompt metadata for audit. |
| AI-07 | AI should not override deterministic scoring. |

### 6.9 Dashboard [P0]

| Widget | Description |
|---|---|
| Next Best Action | Recommended test, review, or retest. |
| Readiness Score | Weighted 0-100 score by exam and topic importance. |
| Readiness Confidence | Low/medium/high based on data volume, recency, and coverage. |
| Score Explanation | Why readiness changed since last update. |
| Weak Topics | Highest priority topics and concepts. |
| Mistake Notebook Summary | Unresolved mistakes and due retests. |
| Recent Tests | Last attempts with quick analysis. |
| Upcoming Tests | Scheduled tests and overdue actions. |
| Strategy Metrics | Time wasted, overconfidence, skip discipline, negative marking loss. |
| Progress Timeline | Readiness and mastery over time. |

Phase 1.5 dashboard additions:

- Probability of Selection.
- Peer benchmarks.
- Percentiles.
- Concept clusters.

### 6.10 Scheduling [P0]

| ID | Requirement |
|---|---|
| SC-01 | User can schedule a test or retest. |
| SC-02 | System suggests due items based on plan and spaced repetition. |
| SC-03 | User receives in-app and email reminders. |
| SC-04 | User can reschedule or cancel. |
| SC-05 | Overdue tests are visible on dashboard. |

### 6.11 Admin Panel [P0]

| ID | Requirement |
|---|---|
| AP-01 | Admin access is role-based and enforced server-side. |
| AP-02 | Admin can manage exams, manifests, topic trees, concepts, and question banks. |
| AP-03 | Admin can review AI-generated questions and explanations. |
| AP-04 | Admin can view content quality metrics and question usage heatmaps. |
| AP-05 | Admin can run bulk import and see validation reports. |
| AP-06 | Admin can retire disputed or low-quality questions. |
| AP-07 | Admin actions are audit logged. |

---

## 7. Phase Plan

### Phase 0 - Prototype

- One exam.
- 200-500 high-quality questions.
- Diagnostic test.
- Topic mastery dashboard.
- Basic AI explanation.
- Manual admin upload.

Success: users understand their weaknesses and want to take the next recommended test.

### Phase 1 - MVP

- Modular exam config and JSON manifest.
- Admin question bank and review workflow.
- Diagnostic, topic tests, sectional tests, mocks.
- Confidence marking.
- Mistake notebook.
- Retest queue.
- Scheduling and reminders.
- AI-assisted post-test analysis.
- Dashboard with readiness, confidence, weak topics, and next action.

Success: users repeatedly test, review, retest, and show measurable improvement.

### Phase 1.5 - Trust And Scale

- Semantic duplicate review UI.
- FSRS tuning if not selected in Phase 1.
- Benchmark mocks and percentiles.
- Peer option/time distribution.
- Concept clusters.
- Vision/PDF ingestion.
- Hindi/multilingual support.
- PDF export and weekly digest.

### Phase 2 - Learning Ecosystem

- Guided courses.
- Topic explanations and interactive articles.
- AI tutor chat with retrieval grounding.
- Teacher/cohort portal.
- Payments.
- Native apps.
- Live tests and leaderboards.

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Dashboard load | < 2s P95 |
| Test answer save | < 300ms perceived; resilient local backup |
| Submit to score | < 1s |
| AI analysis availability | < 30s P95 for tests up to 100 questions, or graceful partial analysis |
| Uptime | 99.5% Phase 1 |
| Accessibility | WCAG 2.1 AA |
| Data residency | India region preferred |
| Privacy | GDPR-style export/delete plus India DPDP review |
| Security | OWASP Top 10 mitigations |

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Diagnostic completion rate | > 60% of sign-ups |
| First-week second test rate | > 50% of diagnostic completers |
| Tests per active user/month | > 8 |
| Retest completion rate | > 40% of due retests |
| Mistake resolution rate | > 30% monthly |
| Post-test analysis view rate | > 75% |
| AI explanation helpfulness | > 70% positive |
| 30-day retention | > 40% |
| Average readiness improvement after 30 days | > 15% among active users |
| Question flag rate | < 2% of served questions |

---

## 10. Polling Decisions

| Decision | agent_CT Recommendation |
|---|---|
| First launch scope | Keep Phase 1 centered on diagnostic, topic tests, mistake notebook, retest queue, dashboard. |
| FSRS vs simpler spaced repetition | Use simple scheduling in prototype; implement FSRS by Phase 1 if engineering capacity allows. |
| Probability of Selection | Move to P1/Phase 1.5 until benchmark and peer data are reliable. |
| Adaptive tests | Use adaptive topic practice only; keep diagnostics and benchmark mocks fixed/equated. |
| Vision ingestion | Phase 1.5 unless question seeding is the blocker. |
| One-at-a-time fetching | Avoid for full mocks; preselect server-side and send content without answers. |
| AI role | Explain, coach, summarize, and generate drafts; do not own scoring. |

---

## 11. Out Of Scope For Phase 1

- Courses, lectures, and interactive articles.
- AI tutor chat.
- Community forums.
- Native mobile apps.
- Payments.
- Live test leaderboards.
- Full teacher/cohort portal.
- Strong anti-cheat enforcement.
- Public peer ranking.

