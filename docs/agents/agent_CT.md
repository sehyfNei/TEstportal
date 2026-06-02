# agent_CT Review Notes
## Test Series Portal - PRD/TRD Additions

**Reviewer:** agent_CT  
**Date:** 2026-05-05  
**Input reviewed:** `PRD.md`, `TRD.md`, and original product brainstorm prompt  
**Review stance:** Additive review. Keep agent_CC documents as baseline; use this file as CT's complementary ideas, risks, and proposed refinements.

---

## 1. Overall Assessment

The PRD and TRD define a solid diagnostic-first test portal with a modular exam engine, question bank, scheduling, AI analysis, and dashboard loop. The core product thesis is strong: users do not just take tests; every test updates a learning plan.

My main recommendation is to sharpen Phase 1 around a smaller, highly reliable learning loop:

```text
Select Exam -> Diagnostic -> Weakness Map -> Topic Test Plan -> Test -> Review -> Retest -> Mastery Update
```

The documents include many correct features, but Phase 1 risks becoming broad before the main loop proves its value. The first release should win on high-quality assessment, trustworthy feedback, and visible improvement.

---

## 2. Product Ideas To Add

### 2.1 Readiness Should Be Explainable, Not Just A Score

Add a `Readiness Score Explanation` section to the dashboard:

- What changed since last test.
- Which topics most affected the score.
- Whether improvement is from accuracy, speed, fewer skipped questions, or better hard-question performance.
- Confidence level of the readiness score based on sample size.

Example:

```text
Readiness: 62/100
Confidence: Medium
Main reason for improvement: Polity accuracy rose from 42% to 58% across 40 recent questions.
Main limiter: Modern History has low confidence because only 8 recent questions were attempted.
```

This avoids users blindly trusting a number.

### 2.2 Add "Confidence Marking" During Tests

For each answer, optionally let users mark confidence:

- Sure
- Unsure
- Guessed

This creates better mistake classification:

- Correct + Sure = mastered
- Correct + Guessed = lucky, needs reinforcement
- Wrong + Sure = dangerous misconception
- Wrong + Unsure = expected gap

This is high-value and low-complexity compared with pure AI inference.

### 2.3 Add A Mistake Notebook

Every wrong, guessed, or bookmarked question should flow into a personal `Mistake Notebook`.

Phase 1 version:

- Auto-group by topic, subtopic, and mistake type.
- Allow retest from notebook.
- Show "same concept asked again" history.
- Let users mark a mistake as resolved after passing a short retest.

This will make the product feel like a self-study system, not only a mock-test platform.

### 2.4 Add Retest Loops As First-Class Objects

The current docs mention topic tests and plan updates, but retesting should be explicit.

Recommended requirements:

- After each test, system creates a `retest queue`.
- Retest contains concepts/questions similar to wrong answers, not the same question only.
- Retest timing follows spaced repetition rules.
- A topic is not considered improved until the user performs well on a later retest.

This is important because immediate post-test review can create false confidence.

### 2.5 Add Exam Strategy Metrics

Competitive exams are not only knowledge checks. They are also strategy and time-management tests.

Add dashboard metrics:

- Accuracy by attempted order: early vs. middle vs. late questions.
- Time lost on wrong answers.
- Skip discipline: skipped hard questions vs. wasted time.
- Negative marking loss.
- Attempt selection quality: "questions you should have skipped".
- Overconfidence index: high-confidence wrong answers.

These metrics are especially valuable for UPSC, SSC, banking, CAT, JEE, NEET, and similar high-pressure exams.

### 2.6 Add User Goal Constraints

Improvement plans should account for:

- Exam date.
- Daily available study time.
- Target score/rank/percentile.
- Preferred test days.
- Weakness tolerance: balanced prep vs. high-weight topic focus.

Without these, the plan may be academically correct but practically unrealistic.

---

## 3. SOTA / Learning Science Ideas To Fold In

Current AI tutoring and personalized learning work points toward combining LLM-based feedback with structured learner models, retrieval practice, and adaptive sequencing. Recent 2025 research also supports personalized feedback and AI tutoring, but the safest product design is still to keep scoring and mastery deterministic, while using LLMs for explanation, diagnosis suggestions, and coaching language.

Recommended additions:

- Use retrieval practice as the core learning mechanic: users improve by repeatedly recalling under test conditions.
- Use spaced repetition for retest scheduling, but apply it at topic/concept level, not only question level.
- Use mastery learning gates: do not advance a user to full mocks until critical high-weight topics cross minimum thresholds.
- Use interleaving: after a topic improves, mix it with adjacent topics so the user learns discrimination, not pattern memorization.
- Use worked-example feedback after failure: show solution reasoning, common trap, and how to recognize the concept next time.
- Use metacognitive prompts: ask "why did you choose this?" or confidence marking for selected high-value questions.

References checked:

- Generating In-Context, Personalized Feedback for Intelligent Tutors with Large Language Models, International Journal of Artificial Intelligence in Education, 2025: https://link.springer.com/article/10.1007/s40593-025-00505-6
- AI tutoring outperforms in-class active learning, Scientific Reports, 2025: https://www.nature.com/articles/s41598-025-97652-6
- A systematic review of AI-driven intelligent tutoring systems in K-12 education, npj Science of Learning, 2025: https://www.nature.com/articles/s41539-025-00320-7
- The role of large language models in personalized learning, Discover Sustainability, 2025: https://link.springer.com/article/10.1007/s43621-025-01094-z

---

## 4. PRD Gaps / Refinements

### 4.1 MVP Scope Needs A Harder Boundary

Suggested Phase 1 MVP:

- User auth.
- One exam configuration.
- Admin question upload and tagging.
- Diagnostic test.
- Topic mastery dashboard.
- Topic tests and full mocks.
- Post-test explanation and mistake classification.
- Basic schedule/reminder.
- Admin review queue for AI-generated questions.

Suggested move to Phase 1.5:

- Custom tests.
- Radar chart polish.
- Advanced adaptive testing.
- Semantic duplicate detection UI.
- Percentiles.
- Offline mode.
- Detailed calendar view.

Reason: launch quality depends on trusted tests and trusted analysis, not breadth of dashboards.

### 4.2 Add Content Quality Workflow

The question bank is the product's foundation. Add a quality lifecycle:

```text
Draft -> Validated -> Reviewed -> Approved -> Live -> Flagged -> Retired
```

Each question should have:

- Reviewer status.
- Reviewer notes.
- Version history.
- Quality score.
- User flag count.
- Dispute status.
- Last audited date.

For PYQs, also track source proof/document reference where possible.

### 4.3 Add Question Exposure Controls

The TRD mentions usage count, but the product also needs exposure rules:

- Avoid showing same question too often to the same user.
- Avoid overusing high-quality questions across the user base.
- Keep some questions reserved for diagnostics and benchmark mocks.
- Mark leaked/compromised questions as retired.

This matters once the platform has repeated users and shared screenshots.

### 4.4 Add "Benchmark Mock" Concept

Separate practice tests from benchmark tests:

- Practice tests can be adaptive and personalized.
- Benchmark mocks should be fixed or statistically equivalent, so progress comparison is meaningful.

Diagnostic and monthly readiness checks should be benchmark-style, not fully adaptive.

### 4.5 Add AI Trust And Dispute UX

AI analysis can be wrong. Add:

- "Report explanation issue" button.
- User feedback categories: wrong answer, unclear explanation, outdated fact, ambiguous question.
- Admin review queue for flagged AI explanations.
- Regenerate explanation only after admin or model confidence trigger.

This protects trust.

---

## 5. TRD Gaps / Technical Refinements

### 5.1 Separate Attempt Sessions From Tests

Current schema has `tests` and `test_attempts`, but it may confuse reusable test definitions with user-specific attempts.

Recommended model:

- `test_templates`: reusable diagnostic/topic/mock definitions.
- `test_sessions`: a user's scheduled or active instance.
- `session_questions`: selected questions for that attempt.
- `session_answers`: user responses and timing.
- `session_results`: scoring output.

This makes benchmark mocks, retakes, scheduled sessions, and shared test libraries cleaner.

### 5.2 Add Concept-Level Model

Topics can be too broad. Add a `concepts` layer or explicit concept tags:

- Topic: Polity
- Subtopic: Parliament
- Concept: Money Bill, Joint Sitting, Speaker powers

AI feedback and spaced repetition should operate on concepts where possible. Topic-level mastery is useful for dashboards, but concept-level mastery drives better learning.

### 5.3 Store AI Outputs With Versioning

Add fields to AI tables:

- `prompt_version`
- `rubric_version`
- `model_provider`
- `model_name`
- `model_parameters`
- `input_hash`
- `output_schema_version`
- `confidence`
- `review_status`

This helps debugging, audits, and future migration across AI providers.

### 5.4 Use Structured Rubrics Before LLM Summaries

Before calling an LLM, compute deterministic features:

- Accuracy by topic.
- Accuracy by difficulty.
- Average time by correct vs. wrong.
- Negative marks lost.
- Confidence mismatch.
- Repeated concept failures.
- Recent trend.

Then pass those features to the LLM. The LLM should explain and coach; it should not be the source of truth for scoring.

### 5.5 Add Job Queue Robustness

Supabase Edge Functions can work for MVP, but AI jobs need retry and idempotency design.

Add:

- `jobs` table with `idempotency_key`.
- Retry count and exponential backoff.
- Dead-letter state.
- Partial output handling.
- Admin retry button.
- Cost tracking per job.

This is especially important for 100-question tests where analysis may fail halfway.

### 5.6 Reconsider "Questions Served One At A Time"

Serving one question at a time reduces leakage but may hurt test UX and reliability under network issues.

Alternative:

- Preselect all questions server-side.
- Send question content page-wise or section-wise.
- Never send correct answers/explanations until submit.
- Use signed session tokens and server-side access checks.

For real exams, users expect fast navigation between questions. One-at-a-time fetching can make the test feel slow.

### 5.7 Add Privacy And Data Governance Details

The system stores sensitive learning behavior. Add:

- Data retention policy.
- Export user data.
- Delete account and all attempts.
- Admin access audit log.
- PII separation from learning analytics where practical.
- Consent for AI processing.

If targeting India, also evaluate DPDP Act obligations, not only GDPR.

---

## 6. Recommended Additional Requirements

### Product Requirements

| ID | Requirement | Priority |
|---|---|---|
| CT-PRD-01 | User can mark confidence per question: sure, unsure, guessed. | P0 |
| CT-PRD-02 | System creates a Mistake Notebook from wrong, guessed, skipped, and bookmarked questions. | P0 |
| CT-PRD-03 | System schedules retests for weak concepts using spaced repetition. | P0 |
| CT-PRD-04 | Dashboard shows readiness score confidence level based on data volume and recency. | P0 |
| CT-PRD-05 | Post-test report separates knowledge gaps, exam strategy issues, and time-management issues. | P0 |
| CT-PRD-06 | User can report a wrong or unclear AI explanation. | P0 |
| CT-PRD-07 | Benchmark mocks are fixed/equated and separate from adaptive practice tests. | P1 |
| CT-PRD-08 | Improvement plan considers exam date and daily available study time. | P1 |
| CT-PRD-09 | Users can retest only their unresolved mistakes/concepts. | P1 |
| CT-PRD-10 | Admin can retire low-quality, leaked, or disputed questions. | P1 |

### Technical Requirements

| ID | Requirement | Priority |
|---|---|---|
| CT-TRD-01 | Split reusable test templates from user test sessions. | P0 |
| CT-TRD-02 | Add concept-level tagging or concept mastery separate from topic mastery. | P0 |
| CT-TRD-03 | AI analysis must be generated from deterministic performance features plus LLM explanation. | P0 |
| CT-TRD-04 | AI outputs must store model, prompt, schema, input hash, and review status. | P0 |
| CT-TRD-05 | Background AI jobs must be idempotent and retryable. | P0 |
| CT-TRD-06 | Add admin audit logs for question changes, role changes, and result corrections. | P0 |
| CT-TRD-07 | Add content versioning for questions and explanations. | P1 |
| CT-TRD-08 | Add exposure controls to prevent overuse of questions. | P1 |
| CT-TRD-09 | Add cost ledger for LLM calls by feature and user/test. | P1 |
| CT-TRD-10 | Add data retention and consent tracking for AI processing. | P1 |

---

## 7. Suggested Revised Phase Plan

### Phase 0 - Prototype

- One exam.
- 200-500 questions.
- Diagnostic test.
- Basic scoring.
- Static AI analysis from structured prompt.
- Simple topic mastery dashboard.

Goal: prove users find the diagnostic and review useful.

### Phase 1 - MVP

- Modular exam config.
- Admin upload/review flow.
- Diagnostic, topic tests, mocks.
- Mistake Notebook.
- Confidence marking.
- Retest scheduling.
- AI post-test report.
- Dashboard with readiness and weak topics.

Goal: prove repeat usage and measurable improvement.

### Phase 1.5 - Scale And Trust

- Semantic duplicate detection.
- Question quality workflow.
- Benchmark mocks.
- Percentiles.
- Advanced calendar.
- Hindi/multilingual support.
- PDF export and weekly digest.

Goal: improve content scale, trust, and retention.

### Phase 2 - Learning Platform

- Guided courses.
- Interactive articles.
- AI tutor chat with RAG.
- Teacher/cohort portal.
- Payments.
- Native apps.

Goal: expand from test-led improvement to full preparation ecosystem.

---

## 8. Key Risks

| Risk | Why It Matters | Mitigation |
|---|---|---|
| AI hallucinated explanations | Destroys trust in exam prep context. | Ground outputs in stored correct answers, explanations, and deterministic metrics. Add report/review flow. |
| Poor question tagging | Mastery and plans become wrong. | Admin validation, bulk import checks, concept tags, audit workflow. |
| Too much Phase 1 scope | Delays launch and weakens quality. | Lock MVP around diagnostic, test, review, retest, dashboard. |
| Adaptive testing too early | Can make scores hard to compare. | Use adaptive topic practice; keep diagnostics/benchmarks fixed or equated. |
| LLM cost growth | Frequent test analysis can become expensive. | Batch by topic, cache, use smaller models for first-pass explanations, track cost ledger. |
| User distrust of readiness score | Users may not understand why score changed. | Explain score drivers and confidence level. |
| Network issues during tests | Bad test experience and lost answers. | Local autosave plus server sync, clear recovery flow, avoid over-fragmented question fetching. |

---

## 9. Highest-Value Next Decisions

1. Pick first target exam for prototype. A modular platform still needs one concrete exam to validate UX and data model.
2. Decide whether Phase 1 includes confidence marking and Mistake Notebook. My recommendation: include both.
3. Decide scoring philosophy: fixed benchmark tests for progress measurement, adaptive topic tests for practice.
4. Define question quality workflow before building bulk import at scale.
5. Decide AI provider abstraction early so Claude/OpenAI/local models can change without rewriting product logic.

---

## 10. CT Recommendation

Proceed with the agent_CC PRD/TRD direction, but revise the Phase 1 definition to center the product around a closed improvement loop:

```text
Diagnose -> Practice Weak Concepts -> Review Mistakes -> Retest -> Update Mastery -> Repeat
```

The biggest additions I would make before implementation are:

- Mistake Notebook.
- Confidence marking.
- Retest queue.
- Concept-level mastery.
- Benchmark vs. adaptive test separation.
- AI output versioning and review workflow.

These changes will make the product more defensible, more useful for serious aspirants, and less dependent on generic AI summaries.
