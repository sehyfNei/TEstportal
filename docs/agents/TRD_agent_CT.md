# Technical Requirements Document - agent_CT Version
## Test Series Portal - Unified Phase 1 Draft

**Owner:** agent_CT  
**Date:** 2026-05-05  
**Status:** Draft for polling and owner comments  
**Inputs merged:** `PRD.md`, `TRD.md`, `agent_CT.md`, `agent_G.md`, `PRD_agent_G.md`

---

## 1. Architecture Position

Use a modular monolith for Phase 1, with clear internal module boundaries:

- Auth and user profile.
- Exam configuration.
- Question bank.
- Test/session engine.
- Scoring and mastery.
- Mistake notebook and retest scheduling.
- AI analysis and generation.
- Admin operations.
- Analytics and dashboard.

This keeps implementation fast while preserving extraction paths for later services such as AI workers, PDF generation, and heavy ingestion.

Recommended stack:

| Layer | Choice |
|---|---|
| Web app | Next.js App Router, TypeScript |
| UI | Tailwind, shadcn/ui, Radix |
| API | tRPC preferred; REST acceptable if team prefers simpler public contracts |
| Database | Supabase PostgreSQL with pgvector |
| Auth | Supabase Auth with RLS |
| ORM | Drizzle |
| Background jobs | Supabase Edge Functions initially, backed by a jobs table |
| AI | Provider abstraction over Anthropic/OpenAI/HuggingFace |
| Email | Resend |
| Analytics | PostHog |
| Errors | Sentry |
| Testing | Vitest, Playwright |

Phase 1 should not require Railway, but design the AI/worker module so Railway or another worker runtime can be added for heavy PDF, OCR, or batch embedding jobs.

---

## 2. Core Technical Principles

1. Scoring must be deterministic and auditable.
2. AI outputs must be versioned, reviewable, and regeneratable.
3. Test templates must be separated from user sessions.
4. Diagnostics and benchmark mocks must be comparable over time.
5. Adaptive practice is allowed only where comparability is not required.
6. User answer data must survive refreshes and network interruptions.
7. RLS and server-side authorization are both required for user data.

---

## 3. Domain Model

### 3.1 Main Entities

| Entity | Purpose |
|---|---|
| `user_profiles` | User settings, target exams, study constraints. |
| `exams` | Exam metadata and active status. |
| `exam_manifests` | Portable JSON exam definitions. |
| `topics` | Hierarchical syllabus nodes. |
| `concepts` | Fine-grained concept tags under topics/subtopics. |
| `questions` | Versioned question content and metadata. |
| `question_versions` | History of question changes. |
| `test_templates` | Reusable diagnostic, topic, sectional, mock, benchmark definitions. |
| `test_sessions` | User-specific scheduled/in-progress/submitted instance. |
| `session_questions` | Questions selected for a session. |
| `session_answers` | User answers, confidence, timing, review flags. |
| `session_results` | Deterministic scoring and feature outputs. |
| `ai_analyses` | AI-generated analysis tied to results. |
| `mastery_records` | Topic/concept mastery per user. |
| `mistake_items` | Wrong/guessed/skipped/bookmarked items needing review. |
| `retest_queue` | Due retest schedule and spacing state. |
| `jobs` | Retryable background work. |
| `audit_logs` | Admin and sensitive system actions. |
| `llm_cost_ledger` | Feature-level AI cost tracking. |

---

## 4. Database Sketch

This is not full migration SQL. It is the recommended schema shape for final TRD/migrations.

### 4.1 Exam And Syllabus

```sql
exams (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
)

exam_manifests (
  id uuid primary key,
  exam_id uuid references exams(id),
  version int not null,
  manifest jsonb not null,
  imported_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (exam_id, version)
)

topics (
  id uuid primary key,
  exam_id uuid references exams(id),
  parent_id uuid references topics(id),
  slug text not null,
  name text not null,
  level int not null,
  weight_percent numeric,
  order_index int default 0,
  unique (exam_id, slug)
)

concepts (
  id uuid primary key,
  exam_id uuid references exams(id),
  topic_id uuid references topics(id),
  slug text not null,
  name text not null,
  description text,
  cluster_key text,
  unique (exam_id, slug)
)
```

### 4.2 Question Bank

```sql
questions (
  id uuid primary key,
  exam_id uuid references exams(id),
  topic_id uuid references topics(id),
  subtopic_id uuid references topics(id),
  type text not null,
  difficulty text not null,
  source text not null,
  source_year int,
  language text default 'en',
  status text not null default 'draft',
  current_version_id uuid,
  quality_score numeric,
  usage_count int default 0,
  flag_count int default 0,
  exposure_policy text default 'practice',
  embedding vector(1536),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

question_versions (
  id uuid primary key,
  question_id uuid references questions(id) on delete cascade,
  version int not null,
  content jsonb not null,
  explanation text,
  reviewer_notes text,
  changed_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (question_id, version)
)

question_concepts (
  question_id uuid references questions(id) on delete cascade,
  concept_id uuid references concepts(id) on delete cascade,
  relevance numeric default 1.0,
  primary key (question_id, concept_id)
)

question_flags (
  id uuid primary key,
  question_id uuid references questions(id),
  user_id uuid references auth.users(id),
  reason text not null,
  details text,
  status text default 'open',
  created_at timestamptz default now()
)
```

Recommended `questions.status` values:

```text
draft, validated, reviewed, approved, live, flagged, retired
```

Recommended `exposure_policy` values:

```text
practice, diagnostic_reserved, benchmark_reserved, hidden
```

### 4.3 Test Templates And Sessions

```sql
test_templates (
  id uuid primary key,
  exam_id uuid references exams(id),
  type text not null,
  title text not null,
  selection_mode text not null,
  config jsonb not null,
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
)

test_sessions (
  id uuid primary key,
  template_id uuid references test_templates(id),
  user_id uuid references auth.users(id),
  exam_id uuid references exams(id),
  type text not null,
  status text not null default 'created',
  scheduled_for timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  tab_switch_count int default 0,
  local_recovery_token_hash text,
  created_at timestamptz default now()
)

session_questions (
  id uuid primary key,
  session_id uuid references test_sessions(id) on delete cascade,
  question_id uuid references questions(id),
  sequence int not null,
  section_slug text,
  selected_by_reason text,
  unique (session_id, sequence),
  unique (session_id, question_id)
)

session_answers (
  id uuid primary key,
  session_id uuid references test_sessions(id) on delete cascade,
  question_id uuid references questions(id),
  user_id uuid references auth.users(id),
  selected_answer jsonb,
  confidence text check (confidence in ('sure','unsure','guessed')),
  marked_review boolean default false,
  time_spent_sec int default 0,
  first_viewed_at timestamptz,
  answered_at timestamptz,
  last_saved_at timestamptz default now(),
  unique (session_id, question_id)
)
```

`selection_mode` examples:

```text
fixed, random_weighted, adaptive_practice, fsrs_retest, custom
```

### 4.4 Results, Mastery, Mistakes

```sql
session_results (
  id uuid primary key,
  session_id uuid unique references test_sessions(id),
  user_id uuid references auth.users(id),
  score numeric not null,
  max_score numeric not null,
  accuracy numeric not null,
  attempted int not null,
  correct int not null,
  incorrect int not null,
  skipped int not null,
  duration_sec int not null,
  topic_scores jsonb not null,
  concept_scores jsonb,
  strategy_metrics jsonb,
  readiness_delta jsonb,
  created_at timestamptz default now()
)

mastery_records (
  id uuid primary key,
  user_id uuid references auth.users(id),
  exam_id uuid references exams(id),
  topic_id uuid references topics(id),
  concept_id uuid references concepts(id),
  mastery_score numeric default 0,
  confidence_level text default 'low',
  baseline_score numeric,
  questions_attempted int default 0,
  questions_correct int default 0,
  last_tested_at timestamptz,
  updated_at timestamptz default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  )
)

mistake_items (
  id uuid primary key,
  user_id uuid references auth.users(id),
  exam_id uuid references exams(id),
  question_id uuid references questions(id),
  session_id uuid references test_sessions(id),
  topic_id uuid references topics(id),
  concept_id uuid references concepts(id),
  mistake_type text not null,
  confidence text,
  status text default 'unresolved',
  created_at timestamptz default now(),
  resolved_at timestamptz
)

retest_queue (
  id uuid primary key,
  user_id uuid references auth.users(id),
  exam_id uuid references exams(id),
  topic_id uuid references topics(id),
  concept_id uuid references concepts(id),
  due_at timestamptz not null,
  scheduler text not null default 'simple',
  scheduler_state jsonb,
  priority numeric default 0,
  status text default 'due',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

### 4.5 AI, Jobs, Audit

```sql
ai_analyses (
  id uuid primary key,
  result_id uuid references session_results(id),
  status text default 'pending',
  deterministic_features jsonb not null,
  question_analyses jsonb,
  topic_summaries jsonb,
  overall_summary text,
  recommendations jsonb,
  prompt_version text,
  rubric_version text,
  provider text,
  model_name text,
  model_parameters jsonb,
  input_hash text,
  output_schema_version text,
  confidence numeric,
  review_status text default 'not_reviewed',
  tokens_used int,
  cost_usd numeric,
  generated_at timestamptz
)

jobs (
  id uuid primary key,
  type text not null,
  status text default 'pending',
  idempotency_key text unique not null,
  payload jsonb not null,
  attempts int default 0,
  max_attempts int default 3,
  next_run_at timestamptz default now(),
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

audit_logs (
  id uuid primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
)

llm_cost_ledger (
  id uuid primary key,
  user_id uuid references auth.users(id),
  feature text not null,
  provider text not null,
  model_name text not null,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz default now()
)
```

---

## 5. Scoring And Mastery

### 5.1 Scoring

Scoring must run synchronously on submit:

1. Load session questions and current question versions.
2. Compare answers against stored correct answers.
3. Apply exam marking rules.
4. Aggregate topic and concept scores.
5. Compute strategy metrics.
6. Store `session_results`.
7. Enqueue AI analysis and mastery update jobs.

### 5.2 Deterministic Features

Compute before any LLM call:

- Accuracy by topic, concept, difficulty, and source.
- Time spent by correct/wrong/skipped.
- Negative marks lost.
- Confidence mismatch.
- High-confidence wrong answers.
- Correct guesses.
- Repeated concept failures.
- Accuracy by attempt order.
- Fatigue signal based on increasing time-to-first-answer or late-test drop-off.

### 5.3 Mastery Update

Use a conservative weighted update:

```text
new_mastery = weighted(old_mastery, latest_result, recency, difficulty, confidence, benchmark_weight)
```

Rules:

- Benchmark tests should have higher measurement value than adaptive practice.
- Correct guessed answers should increase mastery less than correct sure answers.
- Wrong sure answers should decrease mastery more than wrong unsure answers.
- Concepts with low sample size should remain low-confidence even if score is high.

---

## 6. Retest Scheduling

Polling decision: simple spaced repetition vs FSRS for Phase 1.

agent_CT recommendation:

- Prototype with a simple scheduler.
- Keep `scheduler_state` generic.
- Implement FSRS by Phase 1 if feasible.

Minimum scheduler behavior:

1. Wrong, skipped, guessed, and high-confidence wrong answers create or update retest items.
2. Retest is due sooner for high-weight concepts and repeated failures.
3. Successful retest moves the item later or marks it resolved.
4. Failed retest keeps item active and increases priority.

---

## 7. AI Pipeline

### 7.1 Provider Abstraction

Create an internal AI gateway:

```text
app code -> ai gateway -> provider adapter -> Anthropic/OpenAI/HuggingFace/local
```

Each call must capture:

- Provider.
- Model.
- Prompt version.
- Schema version.
- Input hash.
- Tokens.
- Cost.
- Latency.
- Error.

### 7.2 Post-Test Analysis Flow

```text
Submit session
-> deterministic scoring
-> build feature JSON
-> enqueue generate_analysis job
-> generate question/topic summaries in batches
-> validate output schema
-> save ai_analyses
-> notify frontend through realtime
```

LLM must receive:

- Question content.
- Correct answer.
- User answer.
- Existing explanation.
- Deterministic features.
- Exam context.

LLM must not decide:

- Whether answer is correct.
- Marks awarded.
- Official score.

### 7.3 Question Generation Flow

```text
Admin requests generation
-> load exam/topic/concept context
-> retrieve similar questions
-> generate question
-> generate misconception-based distractors
-> validate schema
-> duplicate check
-> optional second-model review
-> save as draft/reviewed, not live
-> admin approves
```

Vision ingestion and HuggingFace auto-tagging should be behind feature flags until quality is proven.

---

## 8. API Surface

Recommended route groups:

```text
/api/auth/*
/api/exams
/api/exams/:slug
/api/dashboard
/api/plans
/api/test-templates
/api/test-sessions
/api/test-sessions/:id/start
/api/test-sessions/:id/answer
/api/test-sessions/:id/submit
/api/test-sessions/:id/result
/api/test-sessions/:id/analysis
/api/mistakes
/api/retest-queue
/api/schedule
/api/admin/exams
/api/admin/manifests
/api/admin/topics
/api/admin/concepts
/api/admin/questions
/api/admin/questions/import
/api/admin/questions/generate
/api/admin/review
/api/admin/audit-logs
```

All mutating APIs require server-side auth checks. RLS is a second layer, not the only layer.

---

## 9. Frontend Structure

```text
src/
  app/
    (auth)/
    (app)/
      dashboard/
      exams/[slug]/
      tests/[sessionId]/
      tests/[sessionId]/results/
      mistakes/
      schedule/
      profile/
    admin/
      exams/
      manifests/
      questions/
      review/
      analytics/
  components/
    test/
    analysis/
    dashboard/
    mistakes/
    schedule/
    admin/
    ui/
  lib/
    adaptive/
    ai/
    scoring/
    mastery/
    supabase/
    validation/
  stores/
    testSession.store.ts
  types/
```

Test-taking client state:

- Store active answers in Zustand for responsiveness.
- Persist local backup in browser storage.
- Debounced server sync on answer change.
- Periodic sync every 30 seconds.
- Final submit reconciles server state.

Do not store correct answers or explanations in client state before submission.

---

## 10. Security And Privacy

Required:

- Supabase Auth.
- HttpOnly cookies for sessions where possible.
- RLS on all user-owned tables.
- Admin role claims validated server-side.
- CSRF protection on mutations.
- DOMPurify or equivalent for rendered markdown.
- Rate limits for auth, submit, AI generation, imports.
- Audit logs for admin actions.
- Data export and deletion.
- Consent record for AI processing.
- DPDP Act review for India-targeted launch.

Question leakage controls:

- Preselect questions server-side.
- Send only question content and options during test.
- Never send correct answers until result view.
- Reserve diagnostic/benchmark questions.
- Track exposure and retire compromised questions.

---

## 11. Background Jobs

Minimum jobs:

| Job | Trigger | Notes |
|---|---|---|
| `generate_analysis` | Result created | Retryable, idempotent. |
| `generate_improvement_plan` | Diagnostic result created | Uses deterministic features plus AI summary. |
| `update_mastery` | Result created | Deterministic; should be retryable. |
| `update_retest_queue` | Result created | Creates due retests. |
| `send_reminders` | Cron | Email and in-app reminders. |
| `question_generation` | Admin request | Draft output only. |
| `embed_questions` | Question create/update/import | Batch capable. |
| `compute_benchmarks` | Cron | P1 for percentiles/peer stats. |

All jobs need:

- Idempotency key.
- Attempts.
- Backoff.
- Dead-letter failed state.
- Admin retry path for important jobs.

---

## 12. Indexes And Performance

Required indexes:

```sql
create index questions_embedding_hnsw
on questions using hnsw (embedding vector_cosine_ops);

create index questions_exam_topic_status
on questions (exam_id, topic_id, status);

create index session_user_status
on test_sessions (user_id, status);

create index session_answers_session
on session_answers (session_id);

create index mastery_user_exam
on mastery_records (user_id, exam_id);

create index mistake_user_status
on mistake_items (user_id, status);

create index retest_due
on retest_queue (due_at, status);

create index jobs_next_run
on jobs (status, next_run_at);
```

Performance targets:

| Metric | Target |
|---|---|
| Dashboard API | < 500ms backend P95 after aggregates exist |
| Question load | < 300ms |
| Answer save | < 300ms |
| Submit scoring | < 1s |
| AI analysis | < 30s P95 or partial graceful state |
| Admin search | < 500ms for normal filters |

---

## 13. Deployment

Environments:

- Local: Next.js + local Supabase.
- Staging: Vercel preview + Supabase staging.
- Production: Vercel + Supabase production.

CI:

- Typecheck.
- Lint.
- Unit tests.
- Migration validation.
- Playwright smoke tests for auth, diagnostic, submit, result.

Migrations:

- SQL migrations in `supabase/migrations`.
- No production console DDL as normal workflow.
- Seed scripts for exam manifests and sample questions.

---

## 14. Open Polling Decisions

| Decision | Options | agent_CT Recommendation |
|---|---|---|
| API style | REST, tRPC | tRPC for app internals; REST for external/admin import if needed. |
| Scheduler | Simple, SM-2, FSRS | Simple in prototype, FSRS for Phase 1 if time permits. |
| AI provider | Anthropic only, provider abstraction | Provider abstraction from day one. |
| Worker runtime | Supabase only, Railway workers | Supabase first; add Railway only for heavy jobs. |
| Test delivery | One-at-a-time, preselected session payload | Preselect server-side; send content without answers. |
| PoS metric | Phase 1, Phase 1.5 | Phase 1.5 after benchmark/peer data exists. |
| Vision ingestion | Phase 1, Phase 1.5 | Phase 1.5 unless content seeding is blocked. |

---

## 15. Implementation Order

1. Auth, profile, exam manifest, topic/concept schema.
2. Question bank CRUD and import.
3. Test template/session engine.
4. Test-taking UI with autosave.
5. Scoring and result view.
6. Mastery update and dashboard.
7. Mistake notebook and retest queue.
8. AI analysis pipeline.
9. Admin review, flags, and audit logs.
10. Scheduling and reminders.
11. Semantic search and duplicate detection.
12. Advanced adaptive/FSRS/benchmark features.

