# Agent S — Perspective Document
## Test Series Portal: Intelligence Flywheel, Behavioral Design & Competitive Moat

**Agent:** Claude Sonnet 4.6 (agent_S)  
**Date:** 2026-05-05  
**Angle:** What makes this platform *self-improving*, *habit-forming*, and *defensible* — beyond the baseline feature set

---

## 0. My Lens

The PRD and TRD we've written are solid. But a product that technically works is not the same as a product that wins. My contribution focuses on three questions the other documents don't answer:

1. **How does this platform get smarter over time?** (The data flywheel)
2. **How do we get users to come back tomorrow, not just today?** (Behavioral design)
3. **Why can't Testbook or Unacademy just copy this in six months?** (Competitive moat)

I also cover **content operations** (how question quality is maintained at scale) and **failure modes** (where the product quietly breaks without anyone noticing).

---

## 1. The Data Intelligence Flywheel

This is the single most important strategic concept. Every user interaction generates signal. If we capture and use that signal correctly, the platform becomes measurably better with every test taken — and competitors with no user data cannot replicate this.

### 1.1 Signal Types and What They Reveal

| Signal | Raw Event | What It Tells Us |
|---|---|---|
| Answer selection | User chose option B; correct is C | User misconception: specific distractor is confusing |
| Time per question | User spent 4:20 on a 40-second question | Either very hard for this user, or poorly worded |
| Mark for review | User flagged Q#17 | User unsure — this question is in their uncertainty zone |
| Re-visit pattern | User went back to Q#8 three times | High cognitive load question, probably difficulty calibration error |
| Abandonment point | User stopped at Q#63 of 80 | Fatigue/time pressure — test length tuning needed |
| Distractor distribution | 73% of wrong answers chose option A | Option A is a strong distractor — well-designed question |
| Post-analysis re-read | User read explanation for Q#12 three times | Key concept to emphasize in future questions on this topic |
| Schedule-keep rate | User kept 40% of scheduled tests | Schedule suggestions too aggressive for this user |
| Improvement plateau | Score on Polity hasn't moved in 4 tests | This user may need a different question *type*, not more questions |

### 1.2 The Flywheel Structure

```
More users take tests
        ↓
Better answer distribution data per question
        ↓
Better difficulty calibration (IRT parameters auto-update)
        ↓
Better adaptive selection (right question, right user, right time)
        ↓
Users improve faster → better outcomes → more users
        ↑_______________________________________________↑
```

**Key implementation**: A nightly job re-estimates each question's IRT parameters (difficulty `b`, discrimination `a`, guessing `c`) using a 3-PL model fit on accumulated attempt data. Questions with low discrimination (< 0.3) get flagged for review. Questions where the "wrong" answer most people choose is the *same wrong answer* get flagged as potentially ambiguous.

### 1.3 Question Quality Metrics (Auto-Computed)

These should be stored on the `questions` table and used in adaptive selection:

| Metric | Formula | Healthy Range | Use |
|---|---|---|---|
| **Difficulty Index (p-value)** | correct_attempts / total_attempts | 0.20 – 0.80 | Label difficulty accurately |
| **Discrimination Index** | (upper 27% correct – lower 27% correct) / (n/2) | > 0.30 | Flag poor discriminators |
| **Point-Biserial Correlation** | Pearson(score_on_question, total_test_score) | > 0.20 | Remove questions that don't correlate with ability |
| **Distractor Efficiency** | Each wrong option chosen by ≥5% of wrong-answerers | All options should attract some wrong answers | Flag questions with a "dead" option nobody picks |
| **Time Anomaly Score** | StdDev(time_spent) across users | Low = routine question; High = confusing/complex | Adjust difficulty label |

**When to retire a question**: p-value > 0.90 (too easy, no longer discriminating) or discrimination < 0.15 (doesn't correlate with ability). Move to "warm-up" pool, not main test pool.

### 1.4 Topic Mastery Model — Better Than a Running Average

The current TRD uses an EMA (exponential moving average). This is fine for Phase 1, but has a known flaw: it doesn't account for *forgetting*. A user who aced Polity 3 weeks ago and hasn't touched it since has probably forgotten more than the EMA reflects.

**Ebbinghaus Forgetting Curve adjustment**:
```
current_estimate = stored_mastery × decay_factor(days_since_last_test)

decay_factor(t) = e^(-t / stability)
stability = base_stability × (1 + 0.3 × mastery)  # higher mastery decays slower
```

This means:
- A topic not tested in 21 days at 0.8 mastery → effectively 0.65 mastery
- The dashboard should surface this: "You haven't tested Modern History in 18 days — your retention may have dropped"
- The improvement plan auto-reschedules topics approaching the decay threshold

**Why this matters**: Users who feel they "know" a topic and skip it will be surprised on the real exam. This model gives them honest signal.

---

## 2. Behavioral Design — Making It Habit-Forming

The biggest drop-off in test prep platforms is not lack of content. It is lack of commitment mechanics. Users start strong, skip one day, feel guilty, skip another, then churn. We can design against this.

### 2.1 Commitment Devices (Before the Test)

**The Weekly Pledge**: On Monday, user sets a weekly test commitment: "I will take 5 tests this week." System records it. Dashboard shows progress vs. pledge. Peer-visible if opted in.

**Test Block Reservations**: User "books" a 90-minute block in their calendar for a specific test. Supabase Calendar integration sends a Google Calendar event. When the block starts, push notification: "Your UPSC Mock Test starts in 5 minutes. You booked this slot 3 days ago."

**Why these work**: Pre-commitment reduces present-bias. The act of scheduling makes the test feel like an appointment, not a vague intention.

### 2.2 Progress Visibility (During the Journey)

**The Mastery Map as a Progress Game**: The radar chart should animate when a topic improves. Visual feedback should feel *earned*, not just informational. Sound/haptic on mobile when a topic crosses a threshold (0.5 → "Familiar", 0.7 → "Competent", 0.9 → "Mastered").

**The "Distance to Readiness" Frame**: Instead of showing "Your score is 62%", show "You are 18 points away from your target readiness score. At your current pace, you'll get there in 31 days." This is a progress frame, not a deficit frame. Loss aversion works: "You are on track to miss your exam date if you don't test this week."

**Milestone Celebrations**: When a user moves a topic from Weak → Competent, show a brief celebration screen (not an intrusive popup, but a subtle achievement moment). Record it in their profile as a visible achievement.

### 2.3 Variable Reward Schedule (After the Test)

This is how slots and social media maintain engagement: unpredictable positive reinforcement. We can use it ethically.

**"Your Analysis is Ready" Push**: The 15–30 second wait for AI analysis is actually an asset, not a liability. It creates anticipation. The push notification "Your UPSC Prelims analysis is ready — 3 unexpected insights found" is more compelling than "Analysis ready."

**Surprise Insight Cards**: Within the analysis, occasionally surface a non-obvious insight: "You solved 7/10 Economy questions in under 30 seconds with 90% accuracy — this is your strongest topic. Lean on it." Users don't expect positive surprises in feedback — it creates delight and shareability.

**Weekly Report**: Monday morning email: "Last week: 6 tests, +12% Polity, 4-day streak. This week's mission: crack Geography." Short, specific, actionable.

### 2.4 Streak Design — Doing It Right

Duolingo's streak is powerful but creates anxiety (users skip a lesson just to keep the streak alive, not to learn). Design around this:

- **Streak definition**: "At least 1 meaningful activity (full test OR 20+ question practice) in a calendar day"
- **Streak freeze**: 2 streak freezes earned per week of consistent activity — can be used to protect a streak on a missed day. This reduces anxiety without removing the mechanic.
- **Streak recovery**: If user breaks a 10+ day streak, offer a "Comeback Challenge" — complete 2 tests in 24 hours to restore 5 of the lost days. This re-engages churned users.

### 2.5 Social Proof (Without Full Social Features)

We don't need forums to use social proof effectively:

- "2,340 UPSC aspirants took a test today" — shown on the homepage
- "83% of users who completed 8+ tests in their first month saw a 20%+ score improvement" — shown on the improvement plan
- "Rankers from 2024 UPSC averaged 11 tests/week in their final 3 months" — shown when user's pace drops below 3 tests/week

These are aggregate stats, not individual comparisons. They leverage normative social influence without requiring user-to-user interaction.

---

## 3. Content Operations — Question Quality at Scale

The question bank is the product's most critical asset and its most fragile one. Poor questions destroy trust faster than any technical bug.

### 3.1 Question Quality Tiers

Not all questions are equal. Introduce a quality tier system:

| Tier | Label | Criteria | Usage |
|---|---|---|---|
| **Gold** | Verified | PYQ + Expert-reviewed, Discrimination > 0.40, used 50+ times | Full mock tests, diagnostic |
| **Silver** | Validated | AI-generated + Admin-approved + used 10+ times, discrimination > 0.25 | Topic tests, sectional tests |
| **Bronze** | Pending Validation | New (AI/manual), approved but <10 uses | Filler in non-critical positions |
| **Quarantine** | Under Review | Flagged by 3+ users OR discrimination < 0.15 | Removed from active pool, queued for admin review |

The adaptive selection engine weights question selection by tier: prefer Gold → Silver → Bronze for high-stakes positions (first 20% and last 10% of a test).

### 3.2 User Flagging System

Every question should have a "Report this question" option (1-tap, from the analysis view). Reasons:

- Incorrect answer key
- Ambiguous wording
- Wrong topic tag
- Outdated (facts changed)
- Low quality / confusing

**Resolution workflow**:
1. 3+ reports on a question → auto-quarantine (moved out of active pool)
2. Admin reviews → fix, retire, or restore with 'disputed' tag cleared
3. Users who flagged a quarantined question get a notification: "Good catch — question #XYZ has been reviewed and updated."

This closes the feedback loop and builds user trust. It also surfaces problems the team wouldn't catch through automated metrics alone.

### 3.3 PYQ Freshness & Legal Risk

Previous Year Questions have two problems often ignored:

**Accuracy drift**: Official answer keys are sometimes contested. For UPSC 2023 prelims, ~8 questions had disputed official answers. If we import PYQs with the official key and a question is contested, users will flag it. Solution: tag contested PYQs with `is_contested: true` and show "Note: This question's answer key is disputed — we use the official UPSC key."

**Copyright ambiguity**: PYQs from official exam bodies (UPSC, IIT JEE) are technically government documents in India and generally considered public domain. Private coaching institute questions are not. Policy: Only import from official government exam bodies; never import from coaching institute material.

### 3.4 AI Question Generation — Quality Gates

The TRD mentions schema validation and duplicate detection. Add these:

**Factual accuracy check**: After generation, run a second LLM call: "Is the following MCQ factually accurate and is the answer key correct? If not, explain the error." Questions that fail this check go to review queue with the error flagged.

**Distractor quality check**: Good MCQs have distractors that are plausible but wrong. Check: "Are all incorrect options plausible enough that a student who doesn't know the answer might choose them?" Questions with "obviously wrong" distractors get flagged.

**Syllabus alignment check**: Embed the question and compare cosine similarity to the topic's centroid embedding (computed from the topic name + subtopic names + 10 seed questions). If similarity < 0.40, the question may be off-topic — flag for review.

### 3.5 Content Velocity Targets

| Exam | Questions at Launch | Monthly Addition Target | Source Mix |
|---|---|---|---|
| UPSC Prelims | 5,000 | 500 | 40% PYQ, 40% AI, 20% Manual |
| JEE Mains | 4,000 | 400 | 30% PYQ, 50% AI, 20% Manual |
| NEET UG | 4,000 | 400 | 35% PYQ, 45% AI, 20% Manual |
| Banking (IBPS) | 3,000 | 300 | 25% PYQ, 55% AI, 20% Manual |

Minimum viable diagnostic test requires 200 questions per exam spanning all topics. This is the true launch gate — not feature completion.

---

## 4. Competitive Moat Analysis

### 4.1 Why Incumbents Won't Easily Copy This

| Moat | Description | Time for Incumbent to Match |
|---|---|---|
| **Diagnostic-first data** | Our users generate topic-mastery baselines from day 1. Incumbents have test scores but not ability profiles. | 12–18 months of data collection |
| **Question quality signals** | We accumulate discrimination indices, distractor distributions, user flags — per question, per exam. Incumbents have volume, not quality metadata. | 2+ years of instrumented data |
| **Forgetting curve model** | Our mastery decay model improves with every user who takes repeat tests on a topic. The model gets better with scale. | Requires model rebuild from scratch |
| **AI analysis quality** | The analysis prompts get tuned iteratively. Prompt engineering for exam-specific analysis is non-trivial to copy without seeing the outputs. | 6–12 months |
| **Improvement plan accuracy** | As we see which plan sequences actually lead to score improvement (diagnostic → 30-day retest), we can tune the plan generator on real outcomes. This is a supervised learning signal Testbook doesn't have. | 18+ months |

### 4.2 Risks to the Moat

| Risk | Likelihood | Mitigation |
|---|---|---|
| Unacademy acquires a similar startup | High | Move fast, build data moat before they notice |
| Claude API cost spikes | Medium | Design prompts with caching; build fallback to open-source LLM (Llama 3) |
| Question bank quality scandal (wrong answer key goes viral) | Medium | Flagging system + quarantine + user notification closes this fast |
| Users don't complete diagnostic (no baseline → no plan) | High | Make diagnostic short (30 min), motivate with "see your readiness score" framing |
| AI analysis is generic and users stop reading it | Medium | A/B test analysis formats; measure re-read rate; iterate prompts weekly |

### 4.3 What We Should NOT Do

- **Don't add video courses in Phase 1** — it shifts the product into a crowded commodity market (Unacademy's core) and distracts from the test+analysis flywheel, which is the actual differentiation.
- **Don't launch with too many exams** — depth in 2 exams beats shallow coverage of 10. Launch with UPSC Prelims + one more (JEE or Banking). Add exams when the question bank per exam is genuinely good.
- **Don't show percentile rankings to new users** — they'll be at the bottom, it's demotivating, and they'll churn. Only show percentile after 5+ tests (enough data for a meaningful rank).

---

## 5. Architecture Additions (Fills Gaps in TRD)

### 5.1 Intelligence Schema — Unified Signal Store

The TRD is missing a table for accumulating question-level psychometric signals. Add:

```sql
CREATE TABLE question_stats (
  question_id       uuid PRIMARY KEY REFERENCES questions(id),
  total_attempts    int DEFAULT 0,
  correct_attempts  int DEFAULT 0,
  difficulty_index  float,      -- p-value: correct/total
  discrimination    float,      -- D = upper27% - lower27%  
  point_biserial    float,      -- correlation with total test score
  avg_time_sec      float,
  stddev_time_sec   float,
  distractor_dist   jsonb,      -- { "0": 0.12, "1": 0.67, "2": 0.08, "3": 0.13 }
  flag_count        int DEFAULT 0,
  quality_tier      text DEFAULT 'bronze',
  last_calibrated   timestamptz,
  updated_at        timestamptz DEFAULT now()
);
```

A nightly Edge Function job re-computes all stats from `test_attempts`. This takes ~5 minutes for 500K questions on Supabase compute.

### 5.2 User Behavior Events Table

For the behavioral design features (and eventual ML model training), add:

```sql
CREATE TABLE user_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  event_type    text NOT NULL,
  -- Values: 'test_start', 'test_abandon', 'question_flag', 
  --         'analysis_view', 'explanation_reread', 'schedule_keep',
  --         'schedule_miss', 'streak_break', 'milestone_hit', 'plan_override'
  entity_id     uuid,           -- test_id, question_id, topic_id as relevant
  properties    jsonb,          -- event-specific payload
  occurred_at   timestamptz DEFAULT now()
);

-- Partition by month for query performance
-- Retain 12 months; archive to cold storage after
```

This event table feeds:
- Product analytics (PostHog alternative for internal BI)
- Churn prediction (users with 3+ schedule misses in a week are churn risk)
- A/B test measurement
- Future ML model training for improvement plan optimization

### 5.3 A/B Testing Infrastructure

We need to experiment systematically. Add a simple flag system:

```sql
CREATE TABLE experiments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,   -- 'analysis-format-v2', 'plan-card-layout'
  variants    jsonb NOT NULL,         -- [{ id: 'control', weight: 0.5 }, { id: 'v1', weight: 0.5 }]
  is_active   bool DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE user_experiment_assignments (
  user_id       uuid REFERENCES auth.users(id),
  experiment_id uuid REFERENCES experiments(id),
  variant_id    text NOT NULL,
  assigned_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, experiment_id)
);
```

Variant assignment happens at first exposure (deterministic hash of user_id + experiment_id for consistent assignment). Outcomes measured via `user_events`.

Priority experiments for launch:
1. Analysis format: structured cards vs. narrative paragraphs
2. Improvement plan: visual path map vs. priority list
3. Diagnostic length: 40q vs. 80q — does longer diagnostic improve plan quality enough to justify higher drop-off?
4. Reminder timing: 30 min vs. 2 hours before scheduled test

### 5.4 Forgetting Curve Integration in Mastery Updates

Replace the pure EMA in the TRD with the decay-adjusted model:

```typescript
// Called nightly by a cron job for all topics not tested in 3+ days
function decayMasteryScore(
  currentScore: number,
  daysSinceLastTest: number,
  stabilityFactor: number  // 0.5 for weak topics, 2.0 for strong
): number {
  const decayRate = Math.exp(-daysSinceLastTest / (14 * stabilityFactor))
  return currentScore * decayRate
}

// Update mastery after a test (EMA + decay correction)
function updateMasteryAfterTest(
  current: number,
  testAccuracy: number,
  alpha: number = 0.20  // slightly higher weight to recent test than TRD's 0.15
): number {
  return (1 - alpha) * current + alpha * testAccuracy
}
```

Decay is applied nightly, not on every query (too expensive). The dashboard shows a small indicator: "⚠ Not tested in 15 days" next to topics approaching decay threshold.

---

## 6. Failure Modes — What Quietly Breaks

These are the scenarios that won't cause crashes but will silently kill user trust:

| Failure Mode | How It Manifests | Detection | Prevention |
|---|---|---|---|
| **AI analysis stuck in "generating"** | User sees spinner for 10 minutes | Monitor Edge Function timeout rate | Hard timeout at 45s; serve partial analysis + "Full analysis in a moment" fallback |
| **Diagnostic selects low-quality questions** | First impression is a bad MCQ with ambiguous options | Monitor diagnostic completion rate + flag rate | Diagnostic pulls from Gold tier questions only |
| **Improvement plan recommends the same topic 5x** | Plan feels repetitive, user ignores it | Track plan_override events (users skipping steps) | Cap any single topic at 30% of plan steps; enforce diversity |
| **Mastery score goes down after a good test** | User took 10/10 on a topic, score dropped | Monitor user complaints about mastery | Bug in EMA direction — log before-after on every update |
| **Questions run out for a topic** | Test engine can't fill a 20-question topic test | Monitor test creation failure rate | Minimum 50 approved questions per topic before enabling that topic's tests |
| **AI generates hallucinated explanation** | Explanation cites a wrong year/fact for a PYQ | Monitor user flag rate on AI-generated explanations | For PYQs, cross-reference explanation against the original question source; flag if inconsistent |
| **Tab-switch detection false positive** | User's OS alt-tabs during legitimate OS notification | Monitor tab_switch_count distribution | Ignore first tab switch; only flag 3+ within a test |
| **Scheduled test reminder not sent** | User misses test because no reminder arrived | Monitor reminder delivery rate in Resend | Alert if reminder_sent rate drops below 95% |

---

## 7. Launch Sequence Recommendation

Based on the above analysis, I recommend a **constrained public beta** approach rather than a full launch:

### Phase 0: Private Beta (Month 1–2)
- 1 exam only (UPSC Prelims — highest demand, most PYQ data available)
- 200 invited users (UPSC communities on Telegram/Reddit)
- Focus: does the diagnostic → plan → test → analysis loop *feel* right?
- Key metric: Do users take a 2nd test within 7 days of completing the diagnostic?
- Gate to Phase 1: 50% of beta users take 5+ tests in their first 2 weeks

### Phase 1: Public Launch (Month 3–4)
- UPSC Prelims + 1 more exam (Banking PO or JEE Mains based on beta demand signal)
- 5,000 questions per exam minimum
- All P0 features live
- Free access — no paywall during Phase 1 (build data moat first)

### Phase 2: Monetization + Scale (Month 6+)
- 4+ exams
- Freemium: free = 3 tests/month, paid = unlimited + AI analysis + scheduling
- Teacher/coach portal
- Phase 1.5 features (bookmarks, peer ranking, Hindi language)

---

## 8. Questions for Final PRD Merge

These are open items I believe need group decision before we finalize:

1. **Forgetting curve in Phase 1 or Phase 2?** It's a strong differentiator but adds complexity. My vote: include the decay model from Day 1 (it's 50 lines of code) but only show the "not tested in N days" warning to users after they've been on the platform 2+ weeks.

2. **How strict is the question quality gate at launch?** Option A: launch with whatever we have and iterate. Option B: launch only with Gold+Silver tier questions, even if that means fewer questions per topic. My vote: Option B. First impressions with bad questions destroy trust permanently.

3. **Free or paid at launch?** My vote: Free for the first 3 months. Build the data flywheel, fix the rough edges, get NPS > 40 before asking for money. A paid product with a 30% NPS is harder to fix than a free product with a 30% NPS.

4. **Which second exam after UPSC?** UPSC Prelims is the natural anchor (aspirant volume, PYQ availability, premium pricing potential). Second exam candidates:
   - **Banking PO (IBPS/SBI)**: Huge volume, quantitative questions easier to AI-generate, but lower premium pricing potential
   - **JEE Mains**: High-value users (parents pay), but subject matter requires stronger domain validation of AI-generated questions
   - My vote: **Banking PO** as second exam — faster to build, validates the platform's exam-agnostic architecture before tackling JEE's complexity

---

*agent_S perspective ends. Ready for merge.*
