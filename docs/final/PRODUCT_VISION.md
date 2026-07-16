# Product Vision

**Product:** AI-managed preparation portal for competitive-exam aspirants
**Initial exam:** UPSC Civil Services Preliminary Examination
**Owner:** Founder
**Status:** Canonical strategic direction

---

## 1. North Star

Build the most trusted AI-managed study portal for aspirants who need to know what to study, how to study it, when to revise it, and whether their preparation is genuinely improving before the exam.

The product begins as a test-led UPSC Prelims improvement engine and evolves into a complete preparation operating system. An aspirant should be able to choose an exam and target date, establish a baseline, receive a realistic plan, learn and practise the right topics, recover recurring mistakes, and see readiness improve over time.

The product must not promise that it can guarantee selection. Its promise is narrower and more credible:

> We identify what is holding you back, tell you what to do next, and measure whether it is working.

## 2. The User Problem

UPSC aspirants have abundant material but weak coordination. They repeatedly have to decide:

- What should I study today?
- Which sources and topics matter most?
- Should I learn, revise, practise, or take a mock?
- Why do I keep repeating the same mistakes?
- Are my strong subjects still reliable?
- Am I progressing quickly enough for my target attempt?

The portal should remove this planning burden without removing the aspirant's agency. It should convert goals, time, performance, mistakes, and syllabus coverage into a clear daily next action.

## 3. The Preparation Loop

```text
Choose exam and target date
-> record study availability and preparation history
-> take a diagnostic
-> establish topic, concept, strategy, and confidence baselines
-> receive a prioritized plan
-> learn or revise a topic
-> practise with trusted questions and PYQs
-> take timed tests and benchmark mocks
-> diagnose mistakes and strategy failures
-> schedule targeted retests
-> update mastery, readiness, and the plan
-> repeat until the exam
```

Every major feature must strengthen this loop. Features that do not improve diagnosis, action selection, learning, practice, recovery, trust, or consistency should wait.

## 4. Product Principles

### AI Manages; Deterministic Systems Verify

AI may explain, coach, summarize, recommend, and adapt the plan. Deterministic code remains authoritative for scoring, marking rules, mastery inputs, schedules, permissions, and cost limits.

### Content Trust Comes Before Volume

Every important question and explanation needs clear provenance, review status, syllabus alignment, and a correction path. AI-generated content remains inactive until reviewed.

### Daily Clarity Is The Primary Experience

The dashboard should answer one question first: **What is the most valuable thing I can do next with the time I have?** It should not become a collection of disconnected analytics.

### The Portal Owns The Learner Record; Channels Extend Access

Daily practice may reach aspirants through linked channels such as Telegram or WhatsApp, but those channels must remain extensions of the same preparation loop rather than separate quiz products. Questions delivered outside the portal, learner replies, scoring, timing, explanations, mistakes, mastery updates, retest scheduling, and plan changes must use the same trusted content and canonical learner record as portal activity.

Channel use must be explicitly opted into and securely linked to an authenticated account. Webhooks must be verified, inbound replies processed idempotently, answer keys protected until submission, delivery failures recoverable, and quiet hours, frequency controls, pause, and opt-out respected. The portal remains the primary place for diagnostics, full tests, detailed review, planning, and progress history.

### Repair Weakness Without Neglecting Strength

Plans balance high-priority weakness repair, maintenance of exam-important strengths, stale-topic revision, uncovered syllabus, and test strategy. Strong topics should become dependable marks.

### The Plan Must Respect Time

Recommendations work backward from the exam date and fit the user's available study time. Missed work causes reprioritization, not an endlessly growing overdue list.

### Motivation Must Be Ethical

Use achievable commitments, recovery plans, visible improvement, consistency trends, and meaningful milestones. Avoid guilt, fabricated urgency, manipulative streaks, and empty motivational messages.

### Recommendations Must Be Explainable

The user should see why a topic, test, revision, or retest was selected and what evidence will cause the recommendation to change.

## 5. The Product Moat

The moat is not an unrestricted chatbot. It is the learner graph created from:

- Exam syllabus, topic weights, cutoffs, and target date.
- Trusted questions, PYQs, concepts, explanations, and sources.
- Answers, timing, confidence, revisits, guesses, and negative marks.
- Topic and concept mastery with evidence volume and recency.
- Recurring mistake patterns and successful retests.
- Study availability, schedule adherence, and plan completion.
- Benchmark performance and, only after sufficient data, peer calibration.

This graph should make the next recommendation more useful after every meaningful user action.

## 6. Strategic Phases

### Phase 1 - Trusted Prelims Improvement Engine

**Outcome:** Prove that the system can diagnose a UPSC GS Prelims aspirant, prescribe the right practice, reduce repeated mistakes, and show measurable improvement.

Phase 1 is one complete English UPSC GS Prelims pathway:

- Goal, target date, study availability, and preparation profile.
- Trusted diagnostic with exam-correct timing and marking.
- Topic practice, sectional tests, full mocks, and concept retests.
- Reliable autosave, resume, submit, score, and result review.
- Confidence and strategy analysis.
- Mastery, readiness, weak-topic priority, and progress history.
- Mistake Notebook, scheduled retests, and resolution tracking.
- Grounded AI explanations and improvement plan.
- One clear next action and a simple timeline-aware plan.
- Admin import, review, quality tiers, flags, and quarantine.
- Production-safe jobs, authorization, cost controls, monitoring, backups, and critical E2E coverage.

Phase 1 does not require Mains answer writing, optional subjects, live classes, community, native apps, Hindi, Probability of Selection, or a large course library.

#### Phase 1 Content Gate

- Minimum 300 expert-reviewed questions; target 500 for private beta.
- Coverage across all configured GS Paper I topics.
- At least two full-length simulations plus topic and sectional pools.
- Verified PYQ provenance and no fabricated UPSC source claims.
- Source-aware explanations and elimination reasoning.
- Gold/Silver inventory sufficient for diagnostics and mocks.

#### Phase 1 Exit Gate

Phase 1 closes only when:

1. A user can complete profile -> diagnostic -> result -> plan -> targeted practice -> mistake review -> retest -> updated dashboard without admin intervention.
2. Test selection exposes diagnostic, topic, sectional, mock, and retest journeys instead of one hard-coded type.
3. Mastery, mistakes, retests, AI analysis, and plan jobs execute reliably in deployment.
4. Launch-critical rows and Review-row browser checks are closed, with critical integration and Playwright journeys passing.
5. No P0 authorization, privacy, answer-key leakage, data-loss, scoring, autosave, or job-runner defect remains.
6. The content gate passes and beta question flags stay below 2%.
7. At least 60% of beta sign-ups complete the diagnostic, 50% take a second test within seven days, and AI helpfulness exceeds 70%.
8. Staging, backups, monitoring, alerts, rate limits, AI cost controls, and rollback procedures have been exercised.

### Phase 2 - AI-Managed UPSC Study Portal

**Outcome:** Become the aspirant's daily study home and launch a paid exam-cycle product.

- Topic explanations and prerequisite links.
- Approved source and chapter recommendations.
- Searchable PYQs connected to topics and concepts.
- Current affairs connected to static syllabus and tests.
- Full CSAT diagnosis, practice, and risk tracking.
- Daily mission and adaptive weekly calendar.
- Opt-in daily practice through linked Telegram or WhatsApp accounts, with answers scored and stored in the canonical learner record so mistakes, mastery, retests, readiness, and the next daily mission update across every channel.
- Recovery after missed study days.
- Evidence-based motivation, reminders, and milestones.
- Grounded AI tutor using approved content and learner context.
- Hindi after English content quality is stable.
- Payments, plans, entitlements, invoices, expiry, refunds, and support operations.

### Phase 3 - Complete UPSC Preparation Companion

**Outcome:** Coordinate Prelims, Mains, optional subjects, and mentorship around one learner model.

- Mains answer writing, essays, ethics, and rubric-based evaluation.
- Optional-subject pathways.
- Mentor escalation when AI confidence or progress is low.
- Peer benchmarks with minimum sample thresholds.
- Probability of Selection only after honest calibration.
- Cohorts and institute tools where they improve outcomes.

### Phase 4 - Multi-Exam Preparation Platform

**Outcome:** Reuse the proven preparation engine for other competitive exams without weakening UPSC quality.

- Exam-specific manifests, content teams, pedagogy, and scoring.
- Institution and educator workspaces.
- Reusable content operations and learner-model infrastructure.
- Expansion only with sufficient trusted content and domain review.

## 7. Phase 1 Closure Order

Until Phase 1 closes:

1. Fix deployed-runtime correctness and safety, beginning with TSP-177 and TSP-178 plus the daily AI cost-cap decision.
2. Complete pending live/browser verification and close the Review queue.
3. Expose backend-supported test types through a coherent student catalog.
4. Build and review the minimum trusted UPSC content inventory.
5. Complete simple schedule, reminder, and target-date guidance.
6. Finish staging, E2E, monitoring, backup, rate-limit, and rollback gates.
7. Run a 50-100 user private beta and evaluate the exit metrics.

No Phase 2 feature should displace a Phase 1 closure item unless required to resolve a measured beta failure.

## 8. Decision Filter

Before adding a feature, answer:

1. Which preparation-loop step does it improve?
2. What trusted data does it consume?
3. What user behavior or learning outcome should change?
4. How will we measure whether it worked?
5. Can the outcome be achieved with a smaller change?
6. Does it belong in the current phase?

If these questions cannot be answered, the feature should not enter the active milestone.

## 9. North-Star Measures

The ultimate measure is not questions attempted, chat messages, or time in the app. It is evidence that active aspirants become more prepared:

- Repeated mistake rate decreases.
- High-confidence wrong answers decrease.
- Weak-topic mastery improves after targeted practice.
- Retest performance exceeds initial performance.
- Benchmark scores improve without losing comparability.
- Plans remain realistic as the exam date approaches.
- Users consistently complete recommended next actions.
- Off-platform daily practice improves consistency and leads users back to deeper review and testing in the portal rather than becoming a disconnected engagement feed.
- Readiness estimates become better calibrated as trusted data grows.
