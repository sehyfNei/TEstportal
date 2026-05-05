# Product Requirements Document (PRD)
## Test Series Portal — Phase 1

**Version:** 1.0  
**Date:** 2026-05-05  
**Status:** Draft

---

## 1. Executive Summary

A self-study and test series portal that enables aspirants of competitive exams to systematically improve their selection chances through intelligent testing, AI-powered analysis, and personalized improvement plans. The platform starts with a **diagnostic test** to baseline the user, creates a structured topic-wise improvement plan, and delivers ongoing tests with detailed AI-generated insights after each attempt.

The system is **fully modular** — configurable for any competitive exam (UPSC, JEE, NEET, Banking/PO, SSC, CAT, GMAT, GRE, State PSCs, Law entrance, etc.) without any code changes.

**Phase 1 scope:** Test series portal only. Phase 2 adds guided courses, video lectures, and interactive articles.

---

## 2. Problem Statement

Competitive exam aspirants face three core problems:

1. **No clarity on where they stand** — they study broadly without knowing their actual weak areas relative to the exam pattern.
2. **Unstructured practice** — they take mock tests randomly without a guided improvement path; there is no feedback loop connecting test performance to study action.
3. **Poor post-test insight** — after a test they see a score, not *why* they got things wrong or *how* to fix it specifically.

### Gap vs. Existing Platforms (Testbook, Unacademy, PrepLadder, Magoosh)

| Feature | Existing Platforms | This Platform |
|---|---|---|
| Diagnostic-first approach | No | Yes |
| AI-driven improvement plan | No | Yes |
| Post-test AI analysis (question + topic) | Basic/Manual | Deep LLM analysis |
| Test scheduling with spaced repetition hints | No | Yes |
| Modular for any exam | Exam-specific builds | Config-driven |
| Mistake pattern classification | No | Yes (conceptual / time / silly) |
| Mixed question sources | PYQs + some AI | PYQ + AI-generated + Manual |

---

## 3. Target Users

### 3.1 Primary Users
- **Self-study aspirants** preparing for competitive exams
- Age: 18–32 | College students, fresh graduates, working professionals
- Tech-comfortable, smartphone + laptop users
- Time-constrained (1–4 hours/day for prep)

### 3.2 Secondary Users (Phase 2+)
- **Coaching institutes** deploying the platform for their batch students
- **Self-employed teachers/mentors** building question banks

---

## 4. User Personas

### Persona A — The First-Timer (Rohan, 22)
Final-year engineering student, UPSC 1st attempt. 14 months to exam. Overwhelmed by syllabus breadth, doesn't know where to start or how to measure progress. Needs structure and direction.

### Persona B — The Repeater (Priya, 26)
UPSC 3rd attempt. Knows the syllabus but underperforms consistently in Polity and Modern History. Needs targeted weak-area attack, not broad practice. Wants to understand her mistake patterns.

### Persona C — The Time-Constrained Professional (Vikram, 29)
Banking exam aspirant, employed. Has 1–2 hours/day. Needs maximum efficiency: targeted topic tests, quick AI insights, scheduled reminders so he doesn't forget to practice.

---

## 5. User Journeys

### 5.1 Onboarding & Diagnostic Flow

```
Register → Select Target Exam(s) → View Exam Overview (syllabus, pattern)
  → Take Diagnostic Test (50–80 questions, all major topics)
  → Submit → AI generates Improvement Plan
  → Dashboard unlocked with:
      - Topic-wise ability scores
      - Prioritized weak areas
      - Recommended test sequence (topic → sectional → mock)
      - Estimated timeline to readiness
```

### 5.2 Daily Study Loop

```
Open Dashboard → See today's recommended test (or pick from schedule)
  → Take Test (topic / sectional / mock)
  → Submit → Score computed instantly
  → AI Analysis generated (~15–30s) → Review insights
  → Dashboard updates: mastery scores, streak, progress
  → Next test auto-recommended or user schedules it
```

### 5.3 Test Scheduling Flow

```
View Improvement Plan → Select a test to schedule
  → Pick date + time from calendar
  → Confirm → Reminder set (email + in-app)
  → On reminder → Take test → Loop continues
```

### 5.4 Progress Review Flow

```
Dashboard → Topic Mastery Radar Chart (current vs. baseline)
  → Test History (scores, accuracy, time trends)
  → AI Summary: "You've improved 23% in Polity over 2 weeks"
  → Weak topics ranked → Take test on weakest → Loop
```

---

## 6. Feature Requirements

### Priority Classification
- **P0**: Must-have for Phase 1 launch
- **P1**: Should-have for Phase 1.5 (post-launch iteration)
- **P2**: Phase 2+

---

### 6.1 User Management [P0]

| ID | Requirement |
|---|---|
| UM-01 | Register via email + password |
| UM-02 | Register / login via Google OAuth |
| UM-03 | User profile: name, avatar, target exam(s), prep start date |
| UM-04 | Password reset via email |
| UM-05 | Session management with secure JWT refresh tokens |
| UM-06 | Account deletion (GDPR-compliant) |

---

### 6.2 Exam Configuration — Modular Engine [P0]

The exam engine must allow admins to define any exam's structure without code changes.

| ID | Requirement |
|---|---|
| EC-01 | Admin creates an Exam with: name, slug, description, test pattern config |
| EC-02 | Test pattern config includes: sections, marks/question, negative marking %, total duration |
| EC-03 | Admin creates topic tree: Section → Topic → Subtopic (unlimited depth) |
| EC-04 | Each topic has: name, description, weight in exam (%), recommended study resources link |
| EC-05 | Multiple exam configurations supported simultaneously |
| EC-06 | User selects one or more target exams on signup; can add more later |

---

### 6.3 Question Bank [P0]

#### Question Sources
| Source | Description |
|---|---|
| **PYQ** | Previous year questions — tagged with exam, year, original marks |
| **AI-Generated** | LLM-generated, must pass admin review before going live |
| **Manual Upload** | Teacher/admin created via UI or bulk CSV/JSON import |

#### Question Types Supported
- **MCQ**: Single correct option (4 options standard)
- **MSQ**: Multiple correct options (select all that apply)
- **Integer/Numerical**: Enter a number
- **Statement-based**: Two statements — which is correct? (UPSC-style)
- **Assertion-Reasoning**: Statement + reason pairs
- **Match the Following**: Column A ↔ Column B mapping

#### Question Metadata [P0]
| Field | Description |
|---|---|
| topic_id, subtopic_id | Hierarchical topic tagging |
| difficulty | Easy / Medium / Hard (admin-set + AI-estimated) |
| source | pyq / ai_generated / manual |
| source_year | For PYQs |
| content | Question text, options, correct answer, explanation |
| media | Images (stored in object storage) |
| tags | Free-form concept tags (e.g., "constitutional amendment", "Article 368") |
| language | en / hi (multi-language Phase 1.5) |
| usage_count | How many tests this question has appeared in |
| is_approved | AI-generated questions require admin approval |

| ID | Requirement |
|---|---|
| QB-01 | Admin UI for creating questions individually |
| QB-02 | Bulk CSV/JSON import for PYQs and manual questions |
| QB-03 | Admin can edit, tag, approve, delete questions |
| QB-04 | AI question generation: admin sets topic + difficulty + count → LLM generates |
| QB-05 | AI-generated questions go into review queue (not live until approved) |
| QB-06 | Semantic search over question bank (find similar/duplicate questions) |
| QB-07 | Full-text search in admin panel |
| QB-08 | All questions vectorized for similarity detection (block near-duplicates) |

---

### 6.4 Diagnostic Test [P0]

| ID | Requirement |
|---|---|
| DT-01 | Auto-generated from question bank to cover all major topics of selected exam |
| DT-02 | Question distribution proportional to topic weights in exam |
| DT-03 | Mix of PYQ, AI-generated, manual questions |
| DT-04 | Default duration: configurable per exam (e.g., 90 min for UPSC) |
| DT-05 | Timed countdown; auto-submit on timeout |
| DT-06 | Progress auto-saved every 30s (resume on reconnect) |
| DT-07 | After submission: synchronous scoring + async AI plan generation |
| DT-08 | User cannot retake diagnostic for 30 days (to keep baseline meaningful) |
| DT-09 | One diagnostic per exam |

---

### 6.5 Test Engine — General [P0]

#### Test Types
| Type | Triggered By | Scope |
|---|---|---|
| Diagnostic | Onboarding | All topics, all sections |
| Topic Test | Improvement plan / manual | Single topic or subtopic |
| Sectional Test | Improvement plan / manual | One section (e.g., GS-2) |
| Full Mock Test | Improvement plan / manual | Complete exam pattern |
| Custom Test | User-defined | User selects topics + question count |

| ID | Requirement |
|---|---|
| TE-01 | Question navigation panel (numbered, jump to any question) |
| TE-02 | Mark for Review (flag a question to come back to) |
| TE-03 | Countdown timer; auto-submit on expiry |
| TE-04 | Negative marking applied per exam config |
| TE-05 | Auto-save answer on selection (every 30s + on change) |
| TE-06 | Resume interrupted test (same session or within 24 hours) |
| TE-07 | Image rendering in questions and answer options |
| TE-08 | Full-screen mode (enforced; tab switch logged with timestamp) |
| TE-09 | Per-question time tracking (time_spent_sec stored) |
| TE-10 | Confirm before final submit |
| TE-11 | Questions served one at a time (not pre-fetched in bulk) to prevent leakage |
| TE-12 | Adaptive question selection for topic tests (difficulty adjusts based on responses) |

---

### 6.6 Improvement Plan [P0]

| ID | Requirement |
|---|---|
| IP-01 | Generated automatically after diagnostic test completion |
| IP-02 | Displays topic-wise ability scores from diagnostic (bar chart / score card) |
| IP-03 | Topics ranked by: (low score × high exam weight = highest priority) |
| IP-04 | Recommended test sequence shown as a visual path: Topic Tests → Sectional → Mock |
| IP-05 | Each step in plan links to a schedulable test |
| IP-06 | Estimated readiness timeline shown |
| IP-07 | Plan dynamically updates as user completes tests (mastery scores update) |
| IP-08 | User can manually reorder priority or skip topics |
| IP-09 | Plan regeneration available (after significant test data accumulated) |

---

### 6.7 Test Scheduling [P0]

| ID | Requirement |
|---|---|
| SC-01 | User can schedule any test from the library to a specific date and time |
| SC-02 | System suggests optimal schedule based on improvement plan and spaced repetition |
| SC-03 | Calendar view (monthly and weekly) showing all scheduled tests |
| SC-04 | Email reminder 30 minutes before scheduled test |
| SC-05 | In-app notification on dashboard for upcoming tests |
| SC-06 | Reschedule: move to new date/time |
| SC-07 | Cancel with confirmation |
| SC-08 | Overdue test flagged on dashboard with option to take now or reschedule |

---

### 6.8 Post-Test AI Analysis [P0]

This is a core differentiator. Triggered asynchronously after every test submission.

#### Analysis Layers

**Layer 1: Question-wise Analysis**
- For every incorrect answer: why the correct option is right, why the user's chosen option is wrong, key concept being tested
- For every correct answer: brief confirmation + key takeaway
- Time analysis: questions where user spent significantly more/less time than average

**Layer 2: Topic-wise Summary**
- Accuracy % per topic in this test vs. historical average
- Specific subtopics where mistakes clustered
- "What to study" recommendation per weak subtopic
- Trend: improving / stable / declining vs. last 3 tests on same topic

**Layer 3: Mistake Pattern Classification**
| Pattern | Definition |
|---|---|
| Conceptual Gap | User answered this type of question wrong consistently |
| Time Pressure | High time-per-question + wrong answer |
| Silly Mistake | Got similar/identical concept right in a previous test, wrong here |
| Not Attempted | Left blank |

**Layer 4: Overall Summary**
- 3–5 sentence AI-generated narrative summary of the test
- Score vs. expected based on current ability
- Top 3 action items for next study session

| ID | Requirement |
|---|---|
| AI-01 | Analysis generation begins immediately after submission |
| AI-02 | Frontend shows "Analysis generating..." state; updates via real-time push |
| AI-03 | Full analysis available within 30 seconds for tests up to 100 questions |
| AI-04 | Question-wise explanations rendered with markdown support |
| AI-05 | Topic summary rendered as cards with score indicator |
| AI-06 | Mistake pattern chart shown (pie / donut) |
| AI-07 | User can rate helpfulness of analysis (thumbs up/down) per question |
| AI-08 | "Study this topic" CTA links to topic test or future scheduling |
| AI-09 | Analysis stored permanently for user to revisit from test history |

---

### 6.9 Study Dashboard [P0]

The dashboard is the user's home base — their complete performance picture at a glance.

| Widget | Description |
|---|---|
| **Readiness Score** | 0–100 composite score across all topics (weighted by exam weights) |
| **Topic Mastery Radar** | Spider/radar chart: topic-wise mastery vs. target (exam requirement) |
| **Progress Timeline** | Line chart of readiness score over time (last 30/60/90 days) |
| **Recent Test Summary** | Last 3 tests with score, accuracy, quick AI insight |
| **Upcoming Tests** | Next 3 scheduled tests with countdown |
| **Weak Topics** | Top 5 weakest topics with "Take Test" CTA |
| **Improvement Highlights** | "You improved 18% in Modern History in the last 2 weeks" |
| **Daily Streak** | Consecutive days with at least one test or study activity |
| **Test History** | Paginated list of all tests with score, accuracy, time, date |

| ID | Requirement |
|---|---|
| DB-01 | Dashboard loads within 2 seconds |
| DB-02 | All widgets update after test submission without manual refresh |
| DB-03 | Topic mastery radar chart interactive (hover shows score, tap to drill down) |
| DB-04 | Progress timeline filterable by date range |
| DB-05 | Test history rows link to full test result + AI analysis |
| DB-06 | Streak tracker resets if no activity for 24+ hours |
| DB-07 | Mobile-responsive layout (all widgets stack on mobile) |

---

### 6.10 Admin Panel [P0]

| ID | Requirement |
|---|---|
| AP-01 | Role-based access: admin vs. user (enforced server-side) |
| AP-02 | Question bank CRUD with search, filter, sort |
| AP-03 | Bulk question import: CSV and JSON with validation and error report |
| AP-04 | Question review queue: AI-generated questions awaiting approval |
| AP-05 | Approve / Reject / Edit AI-generated questions before going live |
| AP-06 | Trigger AI question generation: topic + difficulty + count → generates and queues |
| AP-07 | Exam configuration: create / edit exams and topic trees |
| AP-08 | User management: view list, export data |
| AP-09 | Analytics: questions per topic count, question usage heatmap, test volume |

---

### 6.11 Phase 1.5 Features [P1]

| ID | Feature |
|---|---|
| P1-01 | Bookmarks: save any question for later review |
| P1-02 | Notes: user attaches notes to questions |
| P1-03 | Attempt history per question: see all past attempts on a question |
| P1-04 | Peer ranking: percentile vs. all users on same exam |
| P1-05 | Hindi language support (parallel question bank in Hindi) |
| P1-06 | Offline mode: download test, attempt offline, sync on reconnect |
| P1-07 | Export results as PDF |
| P1-08 | Weekly email digest: progress summary + upcoming schedule |

---

### 6.12 Phase 2 Features [P2]

| Feature | Description |
|---|---|
| Live tests | All users take simultaneously; real-time leaderboard |
| Discussion forums | Per-question community discussion |
| Guided courses | Video lectures + reading materials per topic |
| AI Tutor Chat | LLM-powered chat for topic Q&A |
| Teacher portal | Coach creates tests, assigns to students, views analytics |
| Native apps | iOS and Android |
| Payment / subscriptions | Freemium model with premium exam packs |
| Gamification | Badges, leaderboards, milestone rewards |

---

## 7. Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| Page load time | < 2s P95 | Lighthouse score > 85 |
| Test submission latency | < 500ms | Scoring is synchronous |
| AI analysis time | < 30s | Async with real-time push |
| Uptime | 99.5% | ~3.6 hrs downtime/month max |
| Concurrent users | 1,000 Phase 1 / 10,000 Phase 2 | |
| Question bank capacity | 500,000 questions/exam | |
| Mobile responsive | Yes | PWA Phase 1; native Phase 2 |
| Accessibility | WCAG 2.1 AA | Screen reader support |
| Data residency | India region preferred | Supabase ap-south-1 |
| GDPR / data privacy | User data exportable and deletable | |
| Security | OWASP Top 10 mitigated | |

---

## 8. Success Metrics (KPIs) — 6 Months Post-Launch

| Metric | Target |
|---|---|
| Monthly Active Users | 10,000 |
| Diagnostic completion rate | > 60% of sign-ups |
| Tests taken per active user/month | > 8 |
| Post-test analysis view rate | > 75% |
| 30-day user retention | > 40% |
| Net Promoter Score (NPS) | > 40 |
| Average score improvement (diagnostic → 30-day retest) | > 15% |
| AI analysis helpfulness rating | > 70% thumbs-up |
| Questions in bank at launch | > 5,000 per supported exam |

---

## 9. Out of Scope — Phase 1

- Video lectures or recorded courses
- Live classes with instructors
- AI tutor / conversational chat interface
- Community discussion forums
- Native mobile apps (iOS / Android)
- Payment gateway or subscription management
- Teacher / coach management portal
- Certificate generation
- Gamification beyond streak tracking
- Peer-to-peer comparison / leaderboards
- Guided reading material / articles
- Multilingual support beyond English (Phase 1.5)

---

## 10. Assumptions & Constraints

- **Assumption**: Sufficient question bank (minimum 5,000 per exam) will be seeded before launch via bulk PYQ import + AI generation
- **Assumption**: Claude API (Anthropic) is the AI provider for analysis and generation
- **Constraint**: AI analysis cost must be managed — batch questions by topic to reduce LLM calls
- **Constraint**: No real-time multiplayer features in Phase 1 (no live tests)
- **Constraint**: Phase 1 is web-only (mobile responsive PWA, no native app)
