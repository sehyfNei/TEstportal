# Final Product Requirements Document
## Modular AI-Powered Test Series And Self-Study Portal

**Version:** 1.0 Final Draft  
**Date:** 2026-05-05  
**Status:** Consolidated for founder review, polling, and implementation planning  
**Sources merged:** `PRD.md`, `TRD.md`, `agent_CT.md`, `agent_G.md`, `agent_S.md`, `PRD_agent_CT.md`, `PRD_agent_G.md`, `TRD_agent_CT.md`, `TRD_agent_G.md`  
**Contributors represented:** agent_CC baseline, agent_CT pedagogy and trust, agent_G AI/selection engine, agent_S data flywheel and moat

---

## 1. Executive Summary

The product is a modular test series portal for competitive exam aspirants. It helps users improve their chance of selection through diagnostic testing, targeted practice, AI-assisted analysis, structured retesting, and a continuously updated study dashboard.

Unlike static mock-test platforms, this product is designed as a closed learning loop:

```text
Select exam -> Diagnostic -> Weakness map -> Improvement plan -> Topic practice
-> Mistake review -> Concept retest -> Mastery update -> Benchmark mock -> Repeat
```

The long-term vision is a "selection engine": a self-improving platform that uses performance data, question quality signals, spaced repetition, psychometric calibration, and AI feedback to predict and improve readiness for any competitive exam.

Phase 1 must remain test-led. Courses, live classes, interactive articles, and AI tutor chat are later expansions.

---

## 2. Product Vision

### 2.1 Vision Statement

Build the most trusted self-study test platform for competitive exam aspirants, where every test attempt produces a clear diagnosis, a concrete next step, and measurable readiness improvement.

### 2.2 Product Differentiators

| Area | Differentiator |
|---|---|
| Diagnostic-first | Users begin with a baseline test and receive a structured improvement plan. |
| Closed improvement loop | Mistakes become retests; retests update mastery; mastery updates the plan. |
| Modular exam engine | Any exam can be configured using manifests, topic trees, marking rules, and question banks. |
| AI-assisted analysis | AI explains mistakes, distractors, concepts, and next actions, grounded in deterministic scoring. |
| Mistake Notebook | Wrong, guessed, skipped, and bookmarked questions become a permanent review system. |
| Confidence and metacognition | Users mark confidence and can reflect before seeing answers. |
| Data flywheel | User attempts improve question difficulty, adaptive selection, and plan quality. |
| Content quality moat | Questions are quality-tiered, flagged, calibrated, reviewed, and retired when needed. |
| Predictive readiness | Readiness score, readiness confidence, and later Probability of Selection help users understand exam preparedness. |

---

## 3. Problem Statement

Competitive exam aspirants face five recurring problems:

1. They do not know where they stand relative to exam requirements.
2. They practice randomly instead of following a structured improvement path.
3. They get scores but not actionable insight after tests.
4. They forget previously mastered topics because there is no retention system.
5. They lose motivation because progress is invisible or delayed.

Existing test platforms mostly provide question volume, mocks, video content, or leaderboards. They rarely close the loop between diagnostic evidence, targeted practice, mistake recovery, spaced retesting, and readiness prediction.

---

## 4. Target Users

### 4.1 Primary Users

- Self-study aspirants preparing for UPSC, JEE, NEET, SSC, Banking, CAT, GMAT, GRE, State PSCs, law entrance exams, and other competitive exams.
- Age range: roughly 18-32.
- Students, repeaters, fresh graduates, and working professionals.
- Users with limited daily preparation time who need targeted practice.

### 4.2 Secondary Users

- Admins and content reviewers managing question banks.
- Teachers or mentors who may later create exam packs.
- Coaching institutes using the portal for batches in Phase 2.

### 4.3 Personas

| Persona | Need |
|---|---|
| First-timer | Needs syllabus clarity, baseline, and structured path. |
| Repeater | Needs targeted attack on persistent weak areas and misconception patterns. |
| Working professional | Needs efficient, scheduled practice and quick feedback. |
| High-performing aspirant | Needs benchmark mocks, strategy metrics, and retention protection. |
| Admin/content reviewer | Needs fast import, review, tagging, quality control, and analytics. |

---

## 5. Product Principles

1. **Test-first:** The user home should always guide the next useful test, review, or retest.
2. **Trust over novelty:** AI must explain and coach; deterministic systems must score and update mastery.
3. **Benchmark and practice are different:** Benchmark mocks measure progress; adaptive practice improves weak areas.
4. **Concepts beat broad topics:** Topic dashboards help scanning, but retests should target specific concepts.
5. **No black-box scores:** Readiness and selection predictions must explain drivers and confidence.
6. **Question quality is the product:** Poor questions destroy trust faster than missing features.
7. **Behavior matters:** The portal must help users return tomorrow, not only perform today.
8. **Data compounds:** Every attempt should improve calibration, recommendations, and content operations.
9. **Config first:** New exams should be created through manifests and admin tools, not code changes.

---

## 6. Core User Journeys

### 6.1 Onboarding And Diagnostic

```text
Register -> Select target exam -> Enter exam date and study availability
-> View exam overview -> Start diagnostic -> Submit -> See score
-> Receive AI-assisted improvement plan -> Dashboard unlocked
```

Diagnostic output includes:

- Overall score.
- Topic and concept weakness map.
- Time-management signals.
- Confidence mismatch.
- Mistake pattern summary.
- Readiness score.
- Readiness confidence.
- Recommended next test path.

### 6.2 Daily Study Loop

```text
Open dashboard -> See next best action -> Take test/retest/review
-> Submit -> See score -> Review AI analysis -> Mistake Notebook updates
-> Mastery and readiness update -> Next action generated
```

### 6.3 Mistake Recovery Loop

```text
Wrong/guessed/skipped/flagged item -> Mistake Notebook
-> Explanation and trap review -> Concept retest scheduled
-> User passes retest -> Mistake resolved -> Mastery confidence increases
```

### 6.4 Scheduling And Commitment Loop

```text
Plan recommends test -> User schedules test block
-> Reminder and calendar event -> User takes or misses test
-> Schedule keep/miss signal updates future plan
```

### 6.5 Benchmark Progress Loop

```text
Monthly benchmark mock -> Fixed/equated scoring
-> Progress compared to diagnostic and prior benchmarks
-> Readiness and later Probability of Selection updated
```

---

## 7. Complete Feature Catalog

Priorities:

- **P0:** Required for Phase 1 MVP.
- **P1:** Phase 1.5 / early scale.
- **P2:** Phase 2 ecosystem.

### 7.1 User Account And Profile

| ID | Feature | Priority |
|---|---|---|
| UM-01 | Email/password registration and login. | P0 |
| UM-02 | Google OAuth login. | P0 |
| UM-03 | Password reset. | P0 |
| UM-04 | User profile with name, avatar, target exams, prep start date. | P0 |
| UM-05 | Exam date, daily study time, and preferred test days. | P0 |
| UM-06 | AI processing consent. | P0 |
| UM-07 | Account export and deletion. | P0 |
| UM-08 | Study commitment profile and weekly pledge. | P1 |

### 7.2 Exam Configuration And Template Store

| ID | Feature | Priority |
|---|---|---|
| EC-01 | Admin creates exams with slug, name, description, sections, duration, marking rules. | P0 |
| EC-02 | Admin creates topic tree: section -> topic -> subtopic. | P0 |
| EC-03 | Admin creates concept tags and concept clusters. | P0 |
| EC-04 | Exam manifest JSON import/export. | P0 |
| EC-05 | Manifest includes syllabus, weights, marking, sections, languages, question types, AI persona, historical cutoffs. | P0 |
| EC-06 | Multiple exams active simultaneously. | P0 |
| EC-07 | Institutes can fork/customize exam templates. | P2 |

### 7.3 Question Bank

| ID | Feature | Priority |
|---|---|---|
| QB-01 | Admin creates and edits individual questions. | P0 |
| QB-02 | Bulk CSV/JSON import with validation report. | P0 |
| QB-03 | Question types: MCQ, MSQ, integer, statement, assertion-reasoning, match the following. | P0 |
| QB-04 | Sources: PYQ, AI-generated, manual upload. | P0 |
| QB-05 | Metadata: exam, topic, subtopic, concept, difficulty, source, source year, language, tags, media. | P0 |
| QB-06 | Content lifecycle: draft -> validated -> reviewed -> approved -> live -> flagged -> retired. | P0 |
| QB-07 | Review queue for AI-generated questions. | P0 |
| QB-08 | Question version history and reviewer notes. | P0 |
| QB-09 | Question flag/report workflow. | P0 |
| QB-10 | Quality tiers: Gold, Silver, Bronze, Quarantine. | P0 |
| QB-11 | Question exposure rules for practice, diagnostic, and benchmark pools. | P0 |
| QB-12 | Full-text admin search. | P0 |
| QB-13 | Semantic search and near-duplicate detection. | P1 |
| QB-14 | Auto-tagging using NLP/embedding models. | P1 |
| QB-15 | Vision/PDF ingestion for scanned PYQs. | P1 |
| QB-16 | PYQ contested-answer tagging and official-source reference. | P1 |

### 7.4 AI Question Generation

| ID | Feature | Priority |
|---|---|---|
| QG-01 | Admin requests AI questions by exam, topic, concept, difficulty, and count. | P0 |
| QG-02 | AI-generated questions remain inactive until admin approval. | P0 |
| QG-03 | Schema validation and duplicate detection. | P0 |
| QG-04 | Factual accuracy check using second-pass review. | P0 |
| QG-05 | Syllabus alignment check. | P0 |
| QG-06 | Distractor quality check. | P0 |
| QG-07 | Adversarial distractors based on common misconceptions. | P1 |
| QG-08 | Concept-cluster-aware generation. | P1 |

### 7.5 Diagnostic Test

| ID | Feature | Priority |
|---|---|---|
| DT-01 | Diagnostic generated from high-quality topic-balanced pool. | P0 |
| DT-02 | Question distribution follows exam topic weights. | P0 |
| DT-03 | Diagnostic uses fixed/equated selection, not adaptive practice logic. | P0 |
| DT-04 | Timer and negative marking follow exam config. | P0 |
| DT-05 | Auto-save and resume. | P0 |
| DT-06 | User cannot retake diagnostic too frequently. | P0 |
| DT-07 | Diagnostic creates baseline topic and concept mastery. | P0 |
| DT-08 | Short diagnostic option for beta to reduce onboarding drop-off. | P1 |

### 7.6 Test Engine

| ID | Feature | Priority |
|---|---|---|
| TE-01 | Supports diagnostic, topic test, concept retest, sectional test, full mock, custom test. | P0 |
| TE-02 | Question navigation panel. | P0 |
| TE-03 | Mark for review. | P0 |
| TE-04 | Answer confidence: sure, unsure, guessed. | P0 |
| TE-05 | Timer, auto-submit, negative marking. | P0 |
| TE-06 | Per-question timing and time-to-first-answer. | P0 |
| TE-07 | Auto-save on answer change and periodic sync. | P0 |
| TE-08 | Resume interrupted session. | P0 |
| TE-09 | Image rendering in questions and options. | P0 |
| TE-10 | Tab switch logging, no hard blocking in Phase 1. | P0 |
| TE-11 | Practice tests can adapt by difficulty and mastery. | P0 |
| TE-12 | Flow adjuster inserts confidence-builder questions after repeated failures in practice mode. | P1 |
| TE-13 | Metacognitive reflection prompt for unsure/guessed answers. | P1 |
| TE-14 | Offline test attempt and sync. | P2 |

### 7.7 Improvement Plan

| ID | Feature | Priority |
|---|---|---|
| IP-01 | Plan generated after diagnostic. | P0 |
| IP-02 | Prioritizes topics using weakness, exam weight, recency, readiness gap, and study time. | P0 |
| IP-03 | Shows visual path: topic tests -> retests -> sectional -> mocks. | P0 |
| IP-04 | Each plan item links to take now or schedule. | P0 |
| IP-05 | Plan dynamically updates after every session. | P0 |
| IP-06 | Plan explains why each item is recommended. | P0 |
| IP-07 | User can skip, reorder, or reschedule items. | P0 |
| IP-08 | Plan diversity cap prevents one topic from dominating recommendations. | P1 |
| IP-09 | Plan optimization learns which sequences improve outcomes. | P2 |

### 7.8 Mistake Notebook And Retest Queue

| ID | Feature | Priority |
|---|---|---|
| MN-01 | Wrong, skipped, guessed, bookmarked, and high-confidence wrong answers enter Mistake Notebook. | P0 |
| MN-02 | Notebook groups by exam, topic, concept, mistake type, and status. | P0 |
| MN-03 | User can retest unresolved mistakes and related concepts. | P0 |
| MN-04 | Retest uses similar questions/concepts, not only repeated same question. | P0 |
| MN-05 | Resolved status requires successful retest or explicit user action. | P0 |
| MN-06 | Retest queue uses spaced repetition. | P0 |
| MN-07 | FSRS scheduling for concept review. | P1 |
| MN-08 | Forgetting-curve alerts for topics not tested recently. | P1 |

### 7.9 Post-Test Analysis

| ID | Feature | Priority |
|---|---|---|
| AI-01 | Immediate deterministic score after submission. | P0 |
| AI-02 | Async AI analysis with progress state. | P0 |
| AI-03 | Question-wise explanation for correct, wrong, skipped, and guessed answers. | P0 |
| AI-04 | Distractor explanation: why chosen wrong option was tempting. | P0 |
| AI-05 | Topic and concept summaries. | P0 |
| AI-06 | Mistake classification: conceptual gap, time pressure, silly mistake, not attempted, overconfidence, lucky guess. | P0 |
| AI-07 | Strategy analysis: time lost, skip discipline, negative marks, attempt order. | P0 |
| AI-08 | Top action items and retest recommendations. | P0 |
| AI-09 | User can rate or report AI explanation. | P0 |
| AI-10 | Flagged analysis enters admin review. | P0 |
| AI-11 | Surprise insight cards and weekly progress insights. | P1 |
| AI-12 | Peer option/time distribution shown after sufficient data. | P1 |

### 7.10 Dashboard

| Widget | Priority | Description |
|---|---|---|
| Next Best Action | P0 | Recommended test, retest, or review. |
| Readiness Score | P0 | Weighted 0-100 exam readiness. |
| Readiness Confidence | P0 | Low/medium/high based on data volume, recency, and topic coverage. |
| Score Explanation | P0 | Why readiness changed. |
| Topic Mastery | P0 | Topic cards/radar/heatmap. |
| Concept Weaknesses | P0 | Weak concepts and due retests. |
| Mistake Notebook Summary | P0 | Unresolved mistakes and due review. |
| Recent Tests | P0 | Last sessions with score and quick insight. |
| Upcoming Tests | P0 | Scheduled and overdue tests. |
| Strategy Metrics | P0 | Time waste, overconfidence, skip discipline, negative marking loss. |
| Progress Timeline | P0 | Score/readiness over time. |
| Streak And Weekly Pledge | P1 | Habit and commitment tracking. |
| Mastery Map Milestones | P1 | Visual progress and earned achievements. |
| Selection Dial / Probability of Selection | P1 | Likelihood estimate using mastery, cutoffs, consistency, and peer benchmarks. |
| Peer Benchmarks | P1 | Aggregate comparison after enough data. |

### 7.11 Scheduling And Behavioral Design

| ID | Feature | Priority |
|---|---|---|
| SC-01 | User schedules tests and retests. | P0 |
| SC-02 | System suggests optimal schedule based on plan and retest queue. | P0 |
| SC-03 | Email and in-app reminders. | P0 |
| SC-04 | Overdue test handling. | P0 |
| SC-05 | Weekly pledge: user commits to number of tests. | P1 |
| SC-06 | Calendar block/reservation integration. | P1 |
| SC-07 | Streak tracker with meaningful activity definition. | P1 |
| SC-08 | Streak freeze and comeback challenge. | P1 |
| SC-09 | Weekly digest email. | P1 |
| SC-10 | Ethical social proof using aggregate stats. | P1 |

### 7.12 Admin Panel

| ID | Feature | Priority |
|---|---|---|
| AP-01 | Role-based admin access. | P0 |
| AP-02 | Exam and manifest management. | P0 |
| AP-03 | Topic and concept management. | P0 |
| AP-04 | Question CRUD, search, filter, sort. | P0 |
| AP-05 | Bulk import with validation report. | P0 |
| AP-06 | AI generation queue and review. | P0 |
| AP-07 | Flagged question and explanation review. | P0 |
| AP-08 | Quality tier dashboard. | P0 |
| AP-09 | Question usage heatmap. | P0 |
| AP-10 | Audit logs. | P0 |
| AP-11 | Psychometric question stats dashboard. | P1 |
| AP-12 | A/B experiment management. | P1 |

### 7.13 Analytics And Intelligence

| ID | Feature | Priority |
|---|---|---|
| AN-01 | Capture answer selections, timing, confidence, review flags, revisits, abandonment, analysis views. | P0 |
| AN-02 | Compute question difficulty index and quality metrics. | P1 |
| AN-03 | Compute distractor distribution. | P1 |
| AN-04 | Compute discrimination and point-biserial metrics. | P1 |
| AN-05 | Detect schedule keep/miss and churn risk. | P1 |
| AN-06 | A/B testing framework for analysis format, plan layout, diagnostic length, and reminder timing. | P1 |
| AN-07 | IRT parameter estimation for adaptive selection. | P2 |

---

## 8. Question Quality Policy

### 8.1 Quality Tiers

| Tier | Label | Criteria | Usage |
|---|---|---|---|
| Gold | Verified | PYQ or expert-reviewed, strong stats, low flags. | Diagnostic, benchmark mocks, high-stakes tests. |
| Silver | Validated | Admin-approved and statistically acceptable. | Topic and sectional tests. |
| Bronze | Pending validation | New approved question with limited usage data. | Low-stakes practice. |
| Quarantine | Under review | High flags, poor discrimination, disputed, or ambiguous. | Removed from active pool. |

### 8.2 Question Retirement And Review

Questions should be flagged or retired when:

- Flag count crosses threshold.
- Difficulty index is too high or too low for intended use.
- Discrimination is poor.
- Distractor distribution shows dead options.
- Question is outdated or contested.
- User reports indicate ambiguity or wrong answer key.

### 8.3 PYQ Policy

- Prefer official exam body sources.
- Track source year and reference.
- Mark contested PYQs as contested.
- Do not import private coaching material without rights.

---

## 9. Learning Science And Adaptive Strategy

The product should combine:

- Retrieval practice as the core learning mechanic.
- Spaced repetition for retest scheduling.
- FSRS for concept review where feasible.
- Forgetting curve adjustment for stale mastery.
- Interleaving to prevent shallow pattern matching.
- Mastery gates before advanced mocks.
- Confidence marking to separate knowledge from luck.
- Metacognitive prompts to identify why users chose a distractor.
- Worked-example style explanations after failure.

---

## 10. Phase Plan

### 10.1 Phase 0: Private Beta

Recommended scope:

- One anchor exam, preferably UPSC Prelims.
- 200-500 high-quality questions minimum; 5,000 ideal for public launch.
- Diagnostic test.
- Basic topic mastery dashboard.
- Manual/admin question import.
- Basic AI explanation.
- Mistake Notebook v1.

Gate to Phase 1:

- At least 50% of diagnostic completers take a second test within 7 days.
- Question flag rate stays below acceptable threshold.
- AI explanation helpfulness is above 70% positive among beta users.

### 10.2 Phase 1: Public MVP

Recommended scope:

- UPSC Prelims plus one second exam when content quality is sufficient.
- Modular exam manifest engine.
- Diagnostic, topic tests, sectional tests, full mocks, concept retests.
- Confidence marking.
- Mistake Notebook.
- Retest queue.
- Scheduling and reminders.
- AI post-test analysis.
- Dashboard with readiness, confidence, weak topics, next action, and strategy metrics.
- Admin question quality workflow.

### 10.3 Phase 1.5: Scale, Trust, And Intelligence

- FSRS production tuning.
- Semantic duplicate UI.
- Psychometric question stats dashboard.
- Benchmark mocks and percentiles.
- Peer option/time distribution.
- Concept clusters.
- Vision/PDF ingestion.
- HuggingFace or specialized NLP auto-tagging.
- Weekly digest, streak freeze, pledge.
- A/B testing framework.
- Probability of Selection / Selection Dial.

### 10.4 Phase 2: Learning Ecosystem

- Guided courses.
- Topic explanations.
- Interactive articles.
- AI tutor chat with retrieval grounding.
- Teacher/cohort portal.
- Payments.
- Native apps.
- Live tests and leaderboards.
- Full institute template marketplace.

---

## 11. Launch Recommendation

Recommended launch sequence:

1. **Private beta, Month 1-2:** UPSC Prelims, invited users, focus on diagnostic -> plan -> test -> analysis loop.
2. **Public launch, Month 3-4:** UPSC plus one second exam, free access, build data flywheel.
3. **Scale and monetization, Month 6+:** More exams, paid plans, teacher portal, advanced analytics.

Recommended second exam after UPSC:

- Banking PO if speed and simpler question generation are priorities.
- JEE Mains if high-value users and parent-paid market are priorities, but requires stronger domain validation.

---

## 12. Success Metrics

### 12.1 Product Metrics

| Metric | Target |
|---|---|
| Diagnostic completion rate | > 60% of sign-ups |
| Second test within 7 days | > 50% of diagnostic completers |
| Tests per active user/month | > 8 |
| Retest completion rate | > 40% of due retests |
| Mistake resolution rate | > 30% monthly |
| Post-test analysis view rate | > 75% |
| 30-day retention | > 40% |
| NPS | > 40 |

### 12.2 Learning Metrics

| Metric | Target |
|---|---|
| Average readiness improvement after 30 days | > 15% among active users |
| Topic mastery improvement in weak areas | > 20% over 45 days |
| Retention after spaced retests | Better than non-retested topics |
| High-confidence wrong answer reduction | Downward trend over 30 days |

### 12.3 Content And AI Metrics

| Metric | Target |
|---|---|
| AI explanation helpfulness | > 70% positive |
| Question flag rate | < 2% of served questions |
| AI-generated question approval rate | > 80% initially, > 90% after tuning |
| Quarantined question resolution SLA | < 72 hours |
| Analysis generation success rate | > 98% |
| Analysis P95 time | < 30 seconds or graceful partial result |

### 12.4 Strategic Metrics

| Metric | Target |
|---|---|
| Prediction calibration for readiness/PoS | Validate after enough benchmark data |
| Improvement plan adherence | > 50% of recommended actions completed |
| Schedule keep rate | > 60% |
| First-month active users taking 5+ tests | > 40% |

---

## 13. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Dashboard load | < 2s P95 |
| Test question load | < 300ms P95 |
| Answer autosave | < 300ms perceived, resilient local backup |
| Submit to score | < 1s |
| AI analysis | < 30s P95 for <=100 questions, with partial fallback |
| Uptime | 99.5% Phase 1 |
| Accessibility | WCAG 2.1 AA |
| Mobile | Responsive PWA in Phase 1 |
| Data residency | India region preferred |
| Privacy | Export/delete, consent, India DPDP review |
| Security | OWASP Top 10 mitigations |

---

## 14. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI hallucinated explanations | Trust loss | Ground AI in correct answers and deterministic metrics; add report/review flow. |
| Poor question quality | Trust loss | Quality tiers, flags, quarantine, admin review, stats calibration. |
| Phase 1 scope creep | Slow launch | Keep MVP centered on diagnostic, testing, notebook, retest, dashboard. |
| Diagnostic drop-off | No baseline | Offer short beta diagnostic and strong readiness-score motivation. |
| Adaptive tests reduce comparability | Misleading progress | Keep diagnostics and benchmark mocks fixed/equated. |
| LLM costs grow | Margin pressure | Batch prompts, cache context, use smaller models, track cost ledger. |
| Scheduler too aggressive | User churn | Use schedule-keep signals and adjust recommendations. |
| Question leakage | Content erosion | Reserve pools, exposure controls, retirement workflow. |
| PYQ disputes/legal issues | Trust/legal risk | Official sources, contested flags, copyright policy. |
| Analysis stuck generating | Bad UX | Hard timeout, partial analysis, retry jobs. |

---

## 15. Out Of Scope For Phase 1

- Full video courses.
- Live classes.
- Community forums.
- Native mobile apps.
- Payment gateway.
- Full teacher/cohort portal.
- AI tutor chat.
- Public user rankings for new users.
- Strong anti-cheat enforcement.
- Live simultaneous test leaderboard.

---

## 16. Final Product Recommendation

Build Phase 1 as a high-trust, test-led improvement engine. Include the following as non-negotiable MVP features:

- Modular exam manifest.
- High-quality question bank and admin workflow.
- Diagnostic test.
- Confidence marking.
- Mistake Notebook.
- Retest queue.
- Deterministic scoring and mastery update.
- AI-assisted analysis.
- Readiness score with confidence.
- Scheduling and reminders.

Use Phase 1.5 to add the more advanced moat-building layers:

- FSRS production scheduler.
- Psychometric question calibration.
- A/B testing.
- Peer benchmarks.
- Selection Dial.
- Vision ingestion.
- HuggingFace/Railway heavy services.

