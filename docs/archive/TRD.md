# Technical Requirements Document (TRD)
## Test Series Portal — Phase 1

**Version:** 1.0  
**Date:** 2026-05-05  
**Status:** Draft

---

## 1. Architecture Overview

### Pattern: Modular Monolith with microservice-ready boundaries

Phase 1 uses a **modular monolith** — all code lives in one deployable unit with well-defined internal module boundaries. This avoids distributed-systems complexity early while ensuring Phase 2 can extract hot paths (AI engine, test engine, question bank) into standalone services without a full rewrite.

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                           │
│   Next.js 14 (App Router, TypeScript, Server Components)     │
│   Tailwind CSS + shadcn/ui + Recharts/Nivo                   │
│   Progressive Web App (service worker, offline cache)        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS/REST + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                       API LAYER                              │
│   Next.js API Routes (REST) — or tRPC for type-safety        │
│   Auth middleware: Supabase JWT validation on every request  │
│   Rate limiter: Vercel Edge Middleware                       │
└────────┬────────────────┬──────────────────┬────────────────┘
         │                │                  │
┌────────▼──────┐ ┌───────▼──────┐ ┌─────────▼───────┐
│  TEST ENGINE  │ │  AI ENGINE   │ │  QUESTION BANK  │
│  Module       │ │  Module      │ │  Module         │
│  - Test CRUD  │ │  - Analysis  │ │  - CRUD + search│
│  - Adaptive   │ │  - Q-gen     │ │  - Embeddings   │
│    selection  │ │  - Plan gen  │ │  - Import/export│
│  - Scoring    │ │              │ │  - Admin review │
└────────┬──────┘ └───────┬──────┘ └─────────┬───────┘
         │                │                  │
┌────────▼────────────────▼──────────────────▼───────┐
│                   SUPABASE                           │
│  PostgreSQL 15 (pgvector) + RLS + Auth               │
│  Storage (images, PDFs) + Realtime + Edge Functions  │
└─────────────────────────────────────────────────────┘
         │                                  │
┌────────▼──────────┐          ┌────────────▼────────┐
│  Anthropic Claude │          │     Resend           │
│  API              │          │  (Email service)     │
│  (analysis + gen) │          └─────────────────────┘
└───────────────────┘
```

### Infrastructure Stack

| Component | Service | Rationale |
|---|---|---|
| Frontend + API | Vercel | Edge CDN, preview deployments, zero-config Next.js |
| Database | Supabase (ap-south-1) | PostgreSQL + Auth + Storage + Realtime + pgvector |
| Background jobs | Supabase Edge Functions (Deno) | Co-located with DB, triggers on events |
| AI/LLM | Anthropic Claude API | Best reasoning quality for analysis + generation |
| Email | Resend | Developer-friendly, high deliverability |
| Monitoring | Sentry + PostHog + Vercel Analytics | Errors + product analytics + perf |
| CI/CD | GitHub Actions | Lint → test → preview → deploy |

---

## 2. Full Tech Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 14+ | App Router, Server Components, API routes |
| Language | TypeScript | 5.x | Strict mode |
| UI Components | shadcn/ui + Radix UI | latest | Accessible, unstyled primitives |
| Styling | Tailwind CSS | 3.x | Utility-first, design tokens |
| Charts | Recharts + Nivo | latest | Radar chart, line chart, donut |
| Client state | Zustand | 4.x | Lightweight, no boilerplate |
| Server state | TanStack Query (React Query) | 5.x | Cache, revalidation, optimistic updates |
| Forms | React Hook Form + Zod | latest | Type-safe validation |
| ORM | Drizzle ORM | latest | Type-safe, Supabase-native, fast |
| Auth | Supabase Auth | latest | JWT + RLS + Google OAuth |
| Database | PostgreSQL 15 (Supabase) | 15 | pgvector extension |
| Vector store | pgvector (Supabase) | latest | Embeddings for question similarity |
| File storage | Supabase Storage | latest | Question images, exports |
| Realtime | Supabase Realtime | latest | Push AI analysis completion to client |
| AI/LLM | Anthropic Claude API | claude-sonnet-4-6 | Analysis, plan generation |
| AI/LLM (batch) | Anthropic Claude API | claude-haiku-4-5 | Bulk question generation |
| Embeddings | OpenAI text-embedding-3-small | latest | Question vectorization |
| Email | Resend | latest | Transactional emails |
| Error tracking | Sentry | latest | Frontend + backend |
| Analytics | PostHog | latest | Product analytics, funnels |
| Testing | Vitest + Playwright | latest | Unit + E2E |
| Linter | ESLint + Prettier | latest | |
| Package manager | pnpm | 8+ | Faster, strict node_modules |

---

## 3. Database Design

### 3.1 Schema Overview (PostgreSQL + pgvector)

#### `users` — Supabase Auth managed (auth.users)
Extended by user_profiles.

#### `user_profiles`
```sql
id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
name            text NOT NULL
avatar_url      text
target_exams    text[]          -- array of exam slugs
prep_start_date date
current_streak  int DEFAULT 0
longest_streak  int DEFAULT 0
last_active_at  timestamptz
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

#### `exams`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
slug            text UNIQUE NOT NULL  -- 'upsc-prelims', 'jee-mains', 'neet-ug'
name            text NOT NULL
description     text
pattern         jsonb NOT NULL
  -- {
  --   total_questions: int,
  --   duration_minutes: int,
  --   marks_per_correct: float,
  --   negative_marking_fraction: float,  -- 0 = none, 0.33 = 1/3, 0.25 = 1/4
  --   sections: [{ name, question_count }]
  -- }
is_active       bool DEFAULT true
created_at      timestamptz DEFAULT now()
```

#### `topics`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
exam_id         uuid NOT NULL REFERENCES exams(id)
parent_id       uuid REFERENCES topics(id)  -- NULL = top-level section
name            text NOT NULL
slug            text NOT NULL
description     text
weight_percent  float  -- % weightage in the exam
order_index     int NOT NULL DEFAULT 0
level           int NOT NULL  -- 1=section, 2=topic, 3=subtopic
UNIQUE(exam_id, slug)
```

#### `questions`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
exam_id         uuid NOT NULL REFERENCES exams(id)
topic_id        uuid NOT NULL REFERENCES topics(id)
subtopic_id     uuid REFERENCES topics(id)
type            text NOT NULL CHECK(type IN (
                  'mcq','msq','integer','statement','assertion','match'))
difficulty      text NOT NULL CHECK(difficulty IN ('easy','medium','hard'))
source          text NOT NULL CHECK(source IN ('pyq','ai_generated','manual'))
source_year     int         -- for PYQs
language        text DEFAULT 'en'
content         jsonb NOT NULL
  -- {
  --   text: string,                    (question text, markdown supported)
  --   options: string[],               (for mcq/msq/statement/assertion)
  --   correct_options: int[],          (0-indexed)
  --   correct_integer: int,            (for integer type)
  --   pairs: [[string, string]],       (for match type)
  --   explanation: string,             (model explanation)
  --   explanation_detail: string,      (extended explanation for AI analysis)
  --   images: string[],                (Supabase Storage URLs)
  -- }
tags            text[] DEFAULT '{}'
is_approved     bool DEFAULT false      -- AI-gen needs approval; PYQ/manual = true
is_active       bool DEFAULT true
created_by      uuid REFERENCES auth.users(id)
approved_by     uuid REFERENCES auth.users(id)
usage_count     int DEFAULT 0
avg_accuracy    float                   -- running average accuracy across all attempts
embedding       vector(1536)            -- pgvector embedding
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

#### `tests`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES auth.users(id)
exam_id         uuid NOT NULL REFERENCES exams(id)
type            text NOT NULL CHECK(type IN (
                  'diagnostic','topic','sectional','mock','custom'))
title           text NOT NULL
config          jsonb NOT NULL
  -- {
  --   topic_ids: uuid[],
  --   question_count: int,
  --   duration_minutes: int,
  --   negative_marking: bool,
  --   source_mix: { pyq: float, ai: float, manual: float }
  -- }
status          text DEFAULT 'created' CHECK(status IN (
                  'created','scheduled','in_progress',
                  'submitted','scored','analyzed','abandoned'))
scheduled_at    timestamptz
started_at      timestamptz
completed_at    timestamptz
created_at      timestamptz DEFAULT now()
```

#### `test_questions`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
test_id         uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE
question_id     uuid NOT NULL REFERENCES questions(id)
sequence        int NOT NULL  -- display order
UNIQUE(test_id, sequence)
```

#### `test_attempts`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
test_id         uuid NOT NULL REFERENCES tests(id)
user_id         uuid NOT NULL REFERENCES auth.users(id)
question_id     uuid NOT NULL REFERENCES questions(id)
selected_answer jsonb         -- { options: int[], integer: int } — null if not attempted
is_correct      bool
marks_awarded   float
time_spent_sec  int DEFAULT 0
marked_review   bool DEFAULT false
answered_at     timestamptz
last_saved_at   timestamptz DEFAULT now()
UNIQUE(test_id, question_id)
```

#### `test_results`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
test_id         uuid NOT NULL UNIQUE REFERENCES tests(id)
user_id         uuid NOT NULL REFERENCES auth.users(id)
total_questions int NOT NULL
attempted       int NOT NULL
correct         int NOT NULL
incorrect       int NOT NULL
skipped         int NOT NULL
score           float NOT NULL
max_score       float NOT NULL
accuracy        float NOT NULL      -- correct / attempted
duration_sec    int NOT NULL
topic_scores    jsonb NOT NULL
  -- { [topic_id]: { total: int, correct: int, attempted: int, accuracy: float } }
percentile      float               -- vs. other users (computed async)
created_at      timestamptz DEFAULT now()
```

#### `ai_analyses`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
test_result_id      uuid NOT NULL UNIQUE REFERENCES test_results(id)
status              text DEFAULT 'pending' CHECK(status IN (
                      'pending','generating','completed','failed'))
question_analyses   jsonb
  -- { [question_id]: {
  --     explanation: string,
  --     why_correct: string,
  --     why_wrong: string,       (for user's incorrect choice)
  --     concept: string,
  --     study_tip: string
  --   } }
topic_summaries     jsonb
  -- { [topic_id]: {
  --     summary: string,
  --     trend: 'improving'|'stable'|'declining',
  --     what_to_study: string[],
  --     accuracy_this_test: float,
  --     accuracy_historical: float
  --   } }
overall_summary     text
mistake_patterns    jsonb
  -- { conceptual: int, time_pressure: int, silly: int, not_attempted: int }
recommendations     jsonb           -- [{ action: string, priority: int }]
model_used          text
tokens_used         int
generated_at        timestamptz
```

#### `improvement_plans`
```sql
id                      uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id                 uuid NOT NULL REFERENCES auth.users(id)
exam_id                 uuid NOT NULL REFERENCES exams(id)
diagnostic_result_id    uuid REFERENCES test_results(id)
topic_priorities        jsonb NOT NULL
  -- [{ topic_id, score, weight, priority_rank, reasoning }]
recommended_path        jsonb NOT NULL
  -- [{ step: int, type: 'topic'|'sectional'|'mock', topic_ids: [], title, estimated_date }]
milestones              jsonb
  -- [{ week: int, goal: string, metric: string, target: float }]
estimated_ready_date    date
is_active               bool DEFAULT true
version                 int DEFAULT 1   -- increments on regeneration
created_at              timestamptz DEFAULT now()
updated_at              timestamptz DEFAULT now()
UNIQUE(user_id, exam_id, is_active)  -- only one active plan per user-exam
```

#### `topic_mastery`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id             uuid NOT NULL REFERENCES auth.users(id)
topic_id            uuid NOT NULL REFERENCES topics(id)
mastery_score       float DEFAULT 0.0  -- 0.0 to 1.0, EMA updated after each test
questions_attempted int DEFAULT 0
questions_correct   int DEFAULT 0
tests_taken         int DEFAULT 0
last_tested_at      timestamptz
baseline_score      float              -- from diagnostic test
updated_at          timestamptz DEFAULT now()
UNIQUE(user_id, topic_id)
```

#### `scheduled_tests`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid NOT NULL REFERENCES auth.users(id)
test_id         uuid NOT NULL REFERENCES tests(id)
scheduled_for   timestamptz NOT NULL
reminder_sent   bool DEFAULT false
reminder_sent_at timestamptz
created_at      timestamptz DEFAULT now()
```

#### `question_generation_jobs`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
topic_id        uuid NOT NULL REFERENCES topics(id)
count           int NOT NULL
difficulty      text NOT NULL
language        text DEFAULT 'en'
status          text DEFAULT 'pending' CHECK(status IN (
                  'pending','processing','completed','failed'))
generated_ids   uuid[] DEFAULT '{}'
error_message   text
requested_by    uuid REFERENCES auth.users(id)
created_at      timestamptz DEFAULT now()
completed_at    timestamptz
```

### 3.2 Key Indexes

```sql
-- pgvector HNSW index for fast approximate nearest neighbor search
CREATE INDEX questions_embedding_hnsw
ON questions USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search on question content
CREATE INDEX questions_fts
ON questions USING gin(to_tsvector('english', content->>'text'));

-- Hot queries
CREATE INDEX test_attempts_test_user ON test_attempts(test_id, user_id);
CREATE INDEX topic_mastery_user ON topic_mastery(user_id);
CREATE INDEX tests_user_status ON tests(user_id, status);
CREATE INDEX scheduled_tests_reminder
ON scheduled_tests(scheduled_for, reminder_sent) WHERE NOT reminder_sent;
```

### 3.3 Row Level Security (RLS)

```sql
-- Users see only their own tests and results
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tests_user_isolation ON tests
  FOR ALL USING (user_id = auth.uid());

-- Questions readable by all authenticated users (approved only)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_read_approved ON questions
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_approved = true AND is_active = true
  );

-- Admin can manage all questions
CREATE POLICY questions_admin_all ON questions
  FOR ALL USING (
    (auth.jwt() ->> 'user_role')::text = 'admin'
  );

-- Topic mastery visible to owner only
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY mastery_user_isolation ON topic_mastery
  FOR ALL USING (user_id = auth.uid());
```

---

## 4. API Design

### Authentication
All API routes require `Authorization: Bearer <supabase-jwt>` header. Validated via Supabase middleware before handler runs. RLS enforces data access at the database layer as a second line of defense.

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://<domain>/api`

### Endpoint Reference

#### Auth
```
POST  /api/auth/register          { email, password, name }
POST  /api/auth/login             { email, password }
POST  /api/auth/oauth/google      { code }
POST  /api/auth/logout
GET   /api/auth/me
POST  /api/auth/password-reset    { email }
```

#### Exams
```
GET   /api/exams                           list active exams
GET   /api/exams/:slug                     exam detail + top-level topics
GET   /api/exams/:slug/topics              full topic tree
GET   /api/exams/:slug/stats               user's stats for this exam
```

#### Tests
```
POST  /api/tests/diagnostic               create & return diagnostic test
POST  /api/tests                          { type, exam_id, config } → create test
GET   /api/tests/:id                      test config + question list
POST  /api/tests/:id/start                marks test in_progress, records started_at
PATCH /api/tests/:id/attempt              { question_id, answer } → auto-save
POST  /api/tests/:id/submit               finalizes, triggers scoring + AI
GET   /api/tests/:id/result               test_results row
GET   /api/tests/:id/analysis             ai_analyses row (may be pending)
```

#### Dashboard
```
GET   /api/dashboard                      aggregated dashboard data
GET   /api/dashboard/mastery/:exam_slug   topic mastery map for exam
GET   /api/dashboard/history              paginated test history
GET   /api/dashboard/improvement-plan/:exam_slug
```

#### Schedule
```
GET   /api/schedule                       user's scheduled tests
POST  /api/schedule                       { test_id, scheduled_for }
PATCH /api/schedule/:id                   { scheduled_for }
DELETE /api/schedule/:id
```

#### Admin — Question Bank
```
GET    /api/admin/questions               { topic_id, source, difficulty, search, page }
POST   /api/admin/questions               create question
PUT    /api/admin/questions/:id
DELETE /api/admin/questions/:id
POST   /api/admin/questions/bulk-import   multipart/form-data CSV or JSON
POST   /api/admin/questions/generate      { topic_id, count, difficulty }
GET    /api/admin/questions/review-queue  AI-generated awaiting approval
PATCH  /api/admin/questions/:id/approve
PATCH  /api/admin/questions/:id/reject    { reason }
```

#### Admin — Exams
```
GET    /api/admin/exams
POST   /api/admin/exams
PUT    /api/admin/exams/:id
POST   /api/admin/exams/:id/topics        bulk upsert topic tree
```

### Response Envelopes
```typescript
// Success
{ data: T, meta?: { page, total, ... } }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

### Rate Limits (Vercel Edge Middleware)
| Route Pattern | Limit |
|---|---|
| `/api/auth/*` | 10 req/min per IP |
| `/api/tests/:id/submit` | 5 req/min per user |
| `/api/admin/questions/generate` | 3 req/min per admin |
| All other routes | 60 req/min per user |

---

## 5. AI/ML Pipeline

### 5.1 Diagnostic Analysis & Improvement Plan

**Trigger**: `POST /api/tests/:id/submit` where `tests.type = 'diagnostic'`

**Synchronous path** (completes before HTTP response):
1. Calculate per-question correctness from `test_attempts`
2. Aggregate topic-wise scores
3. Save `test_results`
4. Update `topic_mastery` rows (set baseline_score)
5. Update `tests.status = 'scored'`

**Async path** (Supabase Edge Function, fires after insert into `test_results`):
```
Function: generate-improvement-plan

Input:
  - exam structure (all topics + weights)
  - user's topic_mastery scores (from step 4 above)
  - question-level performance detail

Claude API call (claude-sonnet-4-6):
  System: "You are an expert exam coach for {exam_name}..."
  User: structured JSON with topic scores and exam metadata

  Required output schema:
  {
    topic_priorities: [{ topic_id, score, priority_rank, reasoning }],
    recommended_path: [{ step, type, topic_ids, title, est_days }],
    milestones: [{ week, goal, target_metric }],
    estimated_ready_in_days: int,
    strengths: string[],
    critical_weaknesses: string[]
  }

  → Parse JSON response
  → Save to improvement_plans
  → Update tests.status = 'analyzed'
  → Push Supabase Realtime event: { event: 'plan_ready', test_id }
```

### 5.2 Post-Test Analysis (Non-Diagnostic Tests)

**Trigger**: Edge Function on insert to `test_results`

**Strategy**: Batch questions by topic to reduce LLM API calls.

```
Function: generate-test-analysis

Phase 1 — Per-topic batched explanation (claude-haiku-4-5 for cost):
  For each topic with questions in this test:
    → Fetch questions + user answers for this topic
    → Single LLM call: "Explain these {n} questions..."
    → Parse per-question explanation objects

Phase 2 — Topic summaries (claude-sonnet-4-6):
  Single call with:
    - topic-wise accuracy this test
    - topic-wise accuracy from topic_mastery (historical)
    - number of attempts per topic
  Output: topic_summaries JSON

Phase 3 — Overall summary + mistake patterns (claude-sonnet-4-6):
  Single call with aggregated stats
  Output: overall_summary, mistake_patterns, recommendations

Phase 4 — Save + notify:
  → Insert ai_analyses
  → Update tests.status = 'analyzed'
  → Push Realtime event: { event: 'analysis_ready', test_id }
```

**Cost management**:
- Use `claude-haiku-4-5` for per-question explanations (high volume)
- Use `claude-sonnet-4-6` for summaries (high quality, low volume)
- Enable prompt caching for system prompts and exam context blocks
- Target: < ₹5 / test in AI costs

### 5.3 Question Generation Pipeline

**Trigger**: `POST /api/admin/questions/generate`

```
Function: generate-questions

1. Load topic context:
   - topic name, subtopics, exam name, existing question count
   
2. Retrieve 10 most similar existing questions (pgvector similarity)
   → Used in prompt to ensure diversity
   
3. Claude API call (claude-sonnet-4-6):
   System: "You are an expert question writer for {exam}..."
   User: Generate {count} {difficulty} MCQ questions on {topic}.
         Avoid questions similar to these examples: {existing_samples}
         
   Output schema (strict JSON):
   [{
     text: string,
     options: [string, string, string, string],
     correct_index: int,
     explanation: string,
     difficulty: 'easy'|'medium'|'hard',
     tags: string[]
   }]

4. Validation:
   a. JSON schema validation
   b. Duplicate check: embed each question, cosine_similarity > 0.92 → reject
   c. Minimum quality check: another LLM call rates question 1-5, reject if < 3
   
5. Generate embeddings for passing questions (batch API call)

6. Insert into questions with is_approved = false
7. Update question_generation_jobs.status = 'completed'
8. Notify admin via Realtime: review queue count updated
```

### 5.4 Adaptive Question Selection

Used by the Test Engine when composing topic tests and mock tests.

**Algorithm (Phase 1 — Simplified CAT)**:

```python
# User ability estimate θ (stored in topic_mastery.mastery_score, range 0-1)
# Map to IRT-style scale: θ_irt = (mastery - 0.5) * 6  →  range [-3, 3]

def select_next_question(topic_id, user_id, used_ids, config):
    θ = get_mastery_score(user_id, topic_id)
    
    # Target difficulty
    if θ < 0.35:    target = 'easy'
    elif θ < 0.65:  target = 'medium'
    else:           target = 'hard'
    
    # Query: approved questions on topic, not yet used in this test,
    # not seen by user in last 30 days, matching target difficulty
    # Prefer PYQ if source_mix says so
    candidates = query_questions(topic_id, target, exclude=used_ids)
    
    # Select: highest Fisher Information proxy
    # (approximated as: medium difficulty near θ = maximum info)
    return pick_max_info(candidates, θ)

def update_ability(user_id, topic_id, is_correct):
    # Exponential Moving Average update
    current = get_mastery(user_id, topic_id)
    response = 1.0 if is_correct else 0.0
    new_score = 0.85 * current + 0.15 * response
    update_mastery(user_id, topic_id, new_score)
```

**Phase 2 upgrade path**: Replace with Deep Knowledge Tracing (DKT) model or Bayesian IRT with MCMC sampling.

---

## 6. Question Bank — Indexing & Search

### 6.1 Embedding Strategy
- **Model**: `text-embedding-3-small` (OpenAI, 1536 dims) — balance of quality and cost
- **When**: on question insert and on content update
- **Input**: `{question_text} OPTIONS: {option1} | {option2} | ...` (concatenated for richer embedding)
- **Stored**: `questions.embedding vector(1536)`

### 6.2 Similarity Thresholds
| Use Case | Cosine Distance Threshold | Action |
|---|---|---|
| Duplicate detection (admin import) | < 0.08 (similarity > 0.92) | Block + warn admin |
| Near-duplicate detection | 0.08 – 0.15 | Warn admin, allow with confirmation |
| Similar question retrieval (AI context) | < 0.40 | Fetch top-10 as LLM context |
| Semantic search (admin UI) | — | Return ranked by similarity |

### 6.3 Search Modes (Admin Panel)
1. **Keyword search**: PostgreSQL FTS (`ts_rank`) on question text
2. **Semantic search**: pgvector cosine similarity on embeddings
3. **Filter**: topic, subtopic, difficulty, source, year, is_approved, tags
4. **Combined**: FTS + filter (most common use case)

---

## 7. Frontend Architecture

### 7.1 Next.js App Router Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                          ← authenticated layout
│   │   ├── layout.tsx                  ← sidebar, nav, auth guard
│   │   ├── dashboard/
│   │   │   └── page.tsx                ← main dashboard
│   │   ├── exams/
│   │   │   └── [slug]/page.tsx         ← exam overview + start diagnostic
│   │   ├── tests/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx            ← test taking interface
│   │   │   │   └── results/page.tsx    ← results + AI analysis
│   │   │   └── new/page.tsx            ← create custom test
│   │   ├── schedule/
│   │   │   └── page.tsx                ← calendar view
│   │   └── profile/page.tsx
│   ├── admin/                          ← admin-only layout
│   │   ├── questions/page.tsx
│   │   ├── questions/review/page.tsx
│   │   ├── exams/page.tsx
│   │   └── users/page.tsx
│   ├── api/                            ← API route handlers
│   └── layout.tsx                      ← root layout
├── components/
│   ├── test/
│   │   ├── TestEngine.tsx              ← main test-taking wrapper
│   │   ├── QuestionCard.tsx            ← question + options renderer
│   │   ├── QuestionNavigator.tsx       ← numbered panel + legend
│   │   └── TestTimer.tsx               ← countdown
│   ├── analysis/
│   │   ├── AnalysisPanel.tsx           ← post-test analysis view
│   │   ├── QuestionExplanation.tsx
│   │   └── MistakePatternChart.tsx
│   ├── dashboard/
│   │   ├── ReadinessScore.tsx
│   │   ├── TopicMasteryRadar.tsx       ← Recharts RadarChart
│   │   ├── ProgressTimeline.tsx        ← Recharts LineChart
│   │   ├── WeakTopicsList.tsx
│   │   └── StreakTracker.tsx
│   ├── plan/
│   │   ├── ImprovementPlan.tsx
│   │   └── PlanPathVisualizer.tsx
│   └── ui/                             ← shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   ← browser client
│   │   ├── server.ts                   ← server component client
│   │   └── middleware.ts               ← auth middleware
│   ├── api/                            ← typed API client functions
│   ├── adaptive/                       ← adaptive selection logic
│   └── utils.ts
├── stores/                             ← Zustand stores
│   ├── test.store.ts                   ← in-progress test state
│   └── ui.store.ts
└── types/                              ← shared TypeScript types
```

### 7.2 Test-Taking Interface — State Management

The test engine maintains client-side state in Zustand (for speed) + syncs to server every 30s:

```typescript
interface TestState {
  testId: string
  questions: Question[]
  currentIndex: number
  answers: Record<string, SelectedAnswer>    // question_id → answer
  markedReview: Set<string>                  // question_ids
  timeRemaining: number                      // seconds
  startedAt: Date
  lastSyncedAt: Date
  status: 'active' | 'submitting' | 'submitted'
}
```

- **Auto-save**: Debounced sync to server 1s after each answer change + every 30s
- **Offline resilience**: localStorage backup; restore on refresh before sync confirms
- **Tab switch**: `visibilitychange` event logs timestamp + count to test record

### 7.3 Realtime Subscriptions

```typescript
// After test submit, subscribe to analysis completion
const channel = supabase
  .channel(`analysis-${testId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ai_analyses',
    filter: `test_result_id=eq.${resultId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      queryClient.invalidateQueries(['analysis', testId])
    }
  })
  .subscribe()
```

---

## 8. Background Jobs (Supabase Edge Functions)

| Function | Trigger | Responsibility |
|---|---|---|
| `on-test-submit` | DB: INSERT on test_results | Trigger AI analysis pipeline |
| `generate-improvement-plan` | DB: INSERT on test_results (diagnostic type) | Generate and save improvement plan |
| `generate-test-analysis` | Called by on-test-submit | Claude API calls for analysis |
| `generate-questions` | HTTP: POST /api/admin/questions/generate | AI question generation |
| `reminder-scheduler` | Cron: every 5 minutes | Query scheduled_tests, send reminders |
| `compute-percentiles` | Cron: every 1 hour | Update test_results.percentile |
| `update-avg-accuracy` | Cron: every 30 min | Update questions.avg_accuracy |
| `weekly-digest` | Cron: Monday 8am | Send weekly progress email |

---

## 9. Auth & Security

### 9.1 Authentication Flow
```
User → POST /api/auth/login
  → Supabase Auth verifies credentials
  → Returns { access_token (JWT, 1hr), refresh_token (30 days) }
  → Client stores in httpOnly cookies (not localStorage)
  → Middleware validates JWT on every API request
  → RLS policies enforce data isolation in DB
```

### 9.2 Admin Role Assignment
```sql
-- Custom claim in JWT via Supabase Auth hook
-- Set in auth.users metadata:
UPDATE auth.users SET raw_app_meta_data =
  jsonb_set(raw_app_meta_data, '{user_role}', '"admin"')
WHERE email = 'admin@example.com';
```

### 9.3 Security Checklist

| Threat | Mitigation |
|---|---|
| Auth bypass | Supabase JWT on all routes + RLS as second layer |
| CSRF | SameSite=Strict cookies + CSRF token on mutations |
| SQL injection | Drizzle ORM parameterized queries only |
| XSS | React escaping + DOMPurify for markdown rendering |
| Question leakage | Serve one question at a time; no pre-fetch of full test |
| Prompt injection | Sanitize all user-sourced text before LLM calls |
| Rate limiting | Vercel Edge Middleware per route (see Section 4) |
| Admin privilege escalation | Role stored in JWT claim (server-set only) + RLS policy |
| Secrets | Stored in Vercel env vars + Supabase vault; never in code |
| Tab switching detection | Logged; no blocking in Phase 1 (full anti-cheat Phase 2) |

---

## 10. Deployment & CI/CD

### 10.1 Environments

| Env | Frontend | Database | Branch |
|---|---|---|---|
| Development | localhost:3000 | Local Supabase (Docker) | any |
| Staging | Vercel preview URL | Supabase staging project | `develop` |
| Production | Vercel production | Supabase production | `main` |

### 10.2 GitHub Actions Pipeline

```yaml
on: [push, pull_request]

jobs:
  quality:
    - pnpm install
    - pnpm typecheck
    - pnpm lint
    - pnpm test (vitest unit tests)

  e2e:
    - pnpm playwright test (on staging)

  deploy-staging:
    needs: quality
    if: branch == 'develop'
    - vercel deploy --preview
    - supabase db push --project-ref $STAGING_REF

  deploy-production:
    needs: [quality, e2e]
    if: branch == 'main'
    - vercel deploy --prod
    - supabase db push --project-ref $PROD_REF
```

### 10.3 Database Migrations
- Managed via `supabase/migrations/` directory
- Every schema change is a timestamped SQL migration file
- Applied via `supabase db push` in CI/CD
- Never run raw DDL in production console

---

## 11. Performance & Scalability

| Concern | Phase 1 Strategy | Phase 2 Upgrade |
|---|---|---|
| Dashboard load time | Precomputed aggregates in topic_mastery; daily batch refresh | Materialized views + cache layer |
| Test creation speed | Pre-select questions at test creation, store in test_questions | Same |
| AI analysis latency | Async + Realtime push (user sees progress) | Stream tokens to client |
| Question search | pgvector HNSW + PostgreSQL FTS combo | Dedicated vector DB (Qdrant) |
| Concurrent tests | Stateless API + Supabase PgBouncer (pooled connections) | Read replica for result queries |
| Cold starts | Vercel Edge Runtime for latency-critical routes | Same |
| AI cost | Haiku for per-question explanations, Sonnet for summaries | Prompt caching + batch API |
| Image serving | Supabase Storage CDN | Same |
| 10K+ users | Supabase Pro plan + connection pooler | Supabase Enterprise + horizontal scale |

### Target Benchmarks
| Metric | Target |
|---|---|
| Dashboard load (TTFB + LCP) | < 2s |
| Test question load | < 300ms |
| Answer auto-save round-trip | < 200ms |
| Test submit → score displayed | < 1s |
| AI analysis available | < 30s (P95) |
| Question bank search | < 500ms |

---

## 12. Modularity — Adding a New Exam (Zero Code)

1. Admin creates `exams` record: slug, name, pattern config (JSON)
2. Admin builds `topics` tree: section → topic → subtopic (UI or JSON import)
3. Admin uploads questions via bulk import (CSV) tagged to topics
4. System automatically:
   - Makes exam available in user exam selection
   - Generates diagnostic test template (auto-selected from question bank)
   - Enables improvement plan generation with exam-specific topic weights
   - Shows exam on dashboard with correct radar chart configuration
5. **Zero application code changes required.**

### Exam Config JSON Example (UPSC Prelims)
```json
{
  "total_questions": 100,
  "duration_minutes": 120,
  "marks_per_correct": 2.0,
  "negative_marking_fraction": 0.666,
  "sections": [
    { "name": "General Studies", "question_count": 100 }
  ]
}
```

---

## 13. AI Cost Estimation (per month, 10K MAU)

| Operation | Model | Est. calls/month | Avg tokens | Cost/call | Monthly cost |
|---|---|---|---|---|---|
| Post-test analysis | claude-haiku-4-5 | 80,000 | 2,000 | ~$0.002 | ~$160 |
| Topic summaries | claude-sonnet-4-6 | 80,000 | 1,000 | ~$0.006 | ~$480 |
| Improvement plan gen | claude-sonnet-4-6 | 10,000 | 2,000 | ~$0.012 | ~$120 |
| Question generation | claude-sonnet-4-6 | 2,000 | 3,000 | ~$0.018 | ~$36 |
| Embeddings | text-embedding-3-small | 500,000 | 200 | ~$0.00004 | ~$20 |
| **Total** | | | | | **~$816/month** |

Prompt caching on system prompts (exam context, instructions) reduces Sonnet calls by ~40%, saving ~$240/month.

---

## 14. Open Questions & Decisions Needed

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | ORM choice | Drizzle vs. Prisma | Drizzle (faster, lighter, better Supabase DX) |
| 2 | API style | REST vs. tRPC | tRPC for type safety across monorepo |
| 3 | Embedding model | OpenAI vs. self-hosted | OpenAI text-embedding-3-small (cost-effective) |
| 4 | Mobile | PWA only vs. React Native | PWA Phase 1; evaluate RN after user feedback |
| 5 | Payments Phase 2 | Razorpay vs. Stripe | Razorpay (India-first, UPI support) |
| 6 | Spaced repetition algo | Simple interval vs. SM-2 vs. ML | SM-2 for scheduling recommendations (Phase 1) |
| 7 | Anti-cheat strength | Log only vs. enforce | Log only Phase 1; full enforcement Phase 2 |
