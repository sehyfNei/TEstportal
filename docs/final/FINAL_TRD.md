# Final Technical Requirements Document
## Modular AI-Powered Test Series And Self-Study Portal

**Version:** 1.0 Final Draft  
**Date:** 2026-05-05  
**Status:** Consolidated technical plan for implementation  
**Sources merged:** `PRD.md`, `TRD.md`, `agent_CT.md`, `agent_G.md`, `agent_S.md`, `PRD_agent_CT.md`, `PRD_agent_G.md`, `TRD_agent_CT.md`, `TRD_agent_G.md`

---

## 1. Technical Objective

Build a modular, exam-agnostic test series portal that supports:

- Configurable exam manifests.
- High-quality question bank operations.
- Diagnostic, topic, sectional, mock, custom, and retest sessions.
- Deterministic scoring.
- Topic and concept mastery tracking.
- Mistake Notebook and spaced retest queue.
- AI-assisted analysis and question generation.
- Content quality analytics and psychometric calibration.
- Scheduling, reminders, streaks, and behavioral analytics.
- Admin workflows for content, review, and operations.

The system should start as a modular monolith and preserve clean extraction paths for AI workers, heavy ingestion, PDF generation, and ML/analytics services.

---

## 2. Architecture Overview

### 2.1 Phase 1 Architecture

Use a modular monolith:

```text
Next.js App + API
  -> Auth/Profile Module
  -> Exam Manifest Module
  -> Question Bank Module
  -> Test Session Engine
  -> Scoring Engine
  -> Mastery Engine
  -> Mistake Notebook + Retest Scheduler
  -> AI Gateway
  -> Admin Module
  -> Analytics/Event Module
  -> Supabase PostgreSQL/Auth/Storage/Realtime
  -> Background Jobs
```

Rationale:

- Faster to build and deploy.
- Fewer distributed-system failure modes.
- Strong enough for Phase 1 and private beta.
- Module boundaries allow later extraction.

### 2.2 Phase 1.5 / Phase 2 Hybrid Architecture

Add specialized worker services when needed:

```text
Next.js + Supabase core
  -> Railway workers for long-running jobs
  -> HuggingFace Inference/API or self-hosted NLP models
  -> AI provider gateway for Groq/OpenAI/HuggingFace/local models
  -> Optional external queue if Supabase jobs become limiting
```

Use Railway or similar workers for:

- PDF/LaTeX generation.
- OCR/vision ingestion orchestration.
- Heavy embedding batches.
- Psychometric recalibration.
- Multi-step AI verification workflows.
- Future Probability of Selection calculations at scale.

---

## 3. Recommended Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js App Router | Server Components where useful; client components for test engine. |
| Language | TypeScript strict mode | Shared types across frontend, API, and domain modules. |
| Styling | Tailwind CSS | Keep dashboard/test UI responsive and utilitarian. |
| UI Components | shadcn/ui + Radix UI | Accessible primitives. |
| Charts | Recharts or Nivo | Radar, line, donut, heatmap, selection dial. |
| Client state | Zustand | Active test session state. |
| Server state | TanStack Query | API cache and invalidation. |
| Forms | React Hook Form + Zod | Admin forms, imports, profile. |
| API | tRPC for app internals; REST for import/webhooks if needed | Type safety plus interoperability. |
| ORM | Drizzle ORM | Supabase/Postgres friendly. |
| Database | Supabase PostgreSQL 15+ | Main system of record. |
| Auth | Supabase Auth | OAuth, email login, JWT, RLS. |
| Storage | Supabase Storage | Question images, source docs, exports. |
| Realtime | Supabase Realtime | AI analysis completion, job progress. |
| Vector search | pgvector | Question similarity and duplicate detection. |
| AI providers | Groq first, OpenAI for embeddings if needed, HuggingFace behind gateway | Avoid hard provider lock-in. |
| Email | Resend | Reminders and weekly digest. |
| Analytics | PostHog + internal `user_events` | Product analytics plus training signals. |
| Errors | Sentry | Frontend, API, jobs. |
| Testing | Vitest + Playwright | Unit, integration, E2E. |
| Package manager | pnpm | Fast, strict installs. |
| Deployment | Vercel + Supabase | Phase 1. |
| Optional workers | Railway | Phase 1.5 heavy jobs. |

---

## 4. Repository Structure

Recommended monorepo-style single app:

```text
test-series-portal/
  README.md
  package.json
  pnpm-lock.yaml
  tsconfig.json
  next.config.ts
  drizzle.config.ts
  tailwind.config.ts
  postcss.config.js
  .env.example
  .github/
    workflows/
      ci.yml
      deploy.yml
  docs/
    final/
      FINAL_PRD.md
      FINAL_TRD.md
    process/
      AGENT_WORKFLOW.md
      SESSION_STATE.md
      HANDOFF.md
      DECISIONS.md
      BLOCKERS.md
      CHANGELOG.md
    agents/
    archive/
  trackers/
    JIRA_TRACKER.csv
  public/
    icons/
    manifest.webmanifest
  src/
    app/
      layout.tsx
      page.tsx
      (auth)/
        login/page.tsx
        register/page.tsx
        reset-password/page.tsx
      (app)/
        layout.tsx
        dashboard/page.tsx
        exams/[slug]/page.tsx
        tests/[sessionId]/page.tsx
        tests/[sessionId]/results/page.tsx
        mistakes/page.tsx
        schedule/page.tsx
        profile/page.tsx
      admin/
        layout.tsx
        page.tsx
        exams/page.tsx
        manifests/page.tsx
        topics/page.tsx
        concepts/page.tsx
        questions/page.tsx
        questions/import/page.tsx
        questions/review/page.tsx
        analytics/page.tsx
        audit/page.tsx
      api/
        trpc/[trpc]/route.ts
        webhooks/
    components/
      ui/
      layout/
      auth/
      dashboard/
      test/
        TestShell.tsx
        QuestionPanel.tsx
        QuestionNavigator.tsx
        TestTimer.tsx
        ConfidenceControl.tsx
        MarkForReviewButton.tsx
      results/
        ResultSummary.tsx
        QuestionAnalysis.tsx
        MistakePatternChart.tsx
        StrategyMetrics.tsx
      mistakes/
      schedule/
      admin/
      charts/
    lib/
      api/
      auth/
      db/
        schema/
        migrations/
        client.ts
      supabase/
        client.ts
        server.ts
        middleware.ts
      exam/
        manifest-schema.ts
        manifest-import.ts
      question-bank/
        import-parser.ts
        duplicate-check.ts
        quality-tier.ts
      test-engine/
        selection.ts
        session.ts
        autosave.ts
      scoring/
        score-session.ts
        marking-rules.ts
      mastery/
        update-mastery.ts
        forgetting-curve.ts
      adaptive/
        simple-scheduler.ts
        fsrs.ts
        practice-selection.ts
      ai/
        gateway.ts
        providers/
          anthropic.ts
          openai.ts
          huggingface.ts
        prompts/
        schemas/
      analytics/
        events.ts
        question-stats.ts
        experiments.ts
      security/
        rate-limit.ts
        csrf.ts
        sanitize.ts
      jobs/
        enqueue.ts
        handlers/
          generate-analysis.ts
          generate-plan.ts
          update-mastery.ts
          update-retest-queue.ts
          send-reminders.ts
          embed-questions.ts
          compute-question-stats.ts
    server/
      trpc/
        root.ts
        routers/
          auth.ts
          exams.ts
          dashboard.ts
          testSessions.ts
          mistakes.ts
          schedule.ts
          admin.ts
    stores/
      testSession.store.ts
      ui.store.ts
    types/
      domain.ts
      api.ts
    tests/
      unit/
      integration/
      e2e/
  supabase/
    migrations/
    seed/
    functions/
      job-runner/
      reminder-scheduler/
      realtime-notifier/
```

If workers are split later:

```text
workers/
  railway/
    pdf-generator/
    vision-ingestion/
    psychometrics/
    ai-orchestrator/
```

---

## 5. Core Domain Model

### 5.1 Entity Groups

| Group | Entities |
|---|---|
| Identity | `auth.users`, `user_profiles`, `user_consents` |
| Exam config | `exams`, `exam_manifests`, `topics`, `concepts`, `concept_clusters`, `historical_cutoffs` |
| Question bank | `questions`, `question_versions`, `question_concepts`, `question_flags`, `question_stats` |
| Tests | `test_templates`, `test_sessions`, `session_questions`, `session_answers`, `session_results` |
| Learning | `mastery_records`, `mistake_items`, `retest_queue`, `fsrs_cards` |
| AI | `ai_analyses`, `ai_generation_jobs`, `llm_cost_ledger` |
| Operations | `jobs`, `audit_logs`, `user_events`, `experiments`, `user_experiment_assignments` |
| Scheduling | `scheduled_items`, `notifications`, `weekly_pledges` |

---

## 6. Database Schema

This section defines the target schema. Final migrations can split this into incremental files.

### 6.1 User Tables

```sql
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  target_exams text[] default '{}',
  prep_start_date date,
  daily_study_minutes int,
  preferred_test_days text[] default '{}',
  current_streak int default 0,
  longest_streak int default 0,
  streak_freezes int default 0,
  last_active_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  version text not null,
  created_at timestamptz default now()
);
```

### 6.2 Exam Configuration

```sql
create table exams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table exam_manifests (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  slug text not null,
  version int not null,
  manifest jsonb not null,
  is_active boolean default true,
  imported_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (slug, version)
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  parent_id uuid references topics(id),
  slug text not null,
  name text not null,
  description text,
  level int not null,
  weight_percent numeric,
  order_index int default 0,
  created_at timestamptz default now(),
  unique (exam_id, slug)
);

create table concept_clusters (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  unique (exam_id, slug)
);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  cluster_id uuid references concept_clusters(id),
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  unique (exam_id, slug)
);

create table historical_cutoffs (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  year int not null,
  category text default 'general',
  cutoff_score numeric not null,
  max_score numeric not null,
  metadata jsonb,
  created_at timestamptz default now()
);
```

### 6.3 Question Bank

```sql
create table questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  topic_id uuid not null references topics(id),
  subtopic_id uuid references topics(id),
  type text not null check (type in (
    'mcq','msq','integer','statement','assertion','match'
  )),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  source text not null check (source in ('pyq','ai_generated','manual','vision_ingested')),
  source_year int,
  source_reference text,
  is_contested boolean default false,
  language text default 'en',
  status text not null default 'draft' check (status in (
    'draft','validated','reviewed','approved','live','flagged','retired'
  )),
  exposure_policy text default 'practice' check (exposure_policy in (
    'practice','diagnostic_reserved','benchmark_reserved','hidden'
  )),
  current_version_id uuid,
  quality_tier text default 'bronze' check (quality_tier in (
    'gold','silver','bronze','quarantine'
  )),
  quality_score numeric,
  usage_count int default 0,
  flag_count int default 0,
  avg_accuracy numeric,
  embedding vector(1536),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  last_audited_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  version int not null,
  content jsonb not null,
  explanation text,
  explanation_detail text,
  reviewer_notes text,
  changed_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (question_id, version)
);

create table question_concepts (
  question_id uuid references questions(id) on delete cascade,
  concept_id uuid references concepts(id) on delete cascade,
  relevance numeric default 1.0,
  primary key (question_id, concept_id)
);

create table question_flags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in (
    'incorrect_answer','ambiguous','wrong_topic','outdated','low_quality','other'
  )),
  details text,
  status text default 'open' check (status in ('open','reviewing','resolved','rejected')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table question_stats (
  question_id uuid primary key references questions(id) on delete cascade,
  total_attempts int default 0,
  correct_attempts int default 0,
  difficulty_index numeric,
  discrimination numeric,
  point_biserial numeric,
  avg_time_sec numeric,
  stddev_time_sec numeric,
  distractor_dist jsonb,
  flag_count int default 0,
  quality_tier text default 'bronze',
  last_calibrated timestamptz,
  updated_at timestamptz default now()
);
```

`question_versions.content` examples:

```json
{
  "text": "Question text in markdown",
  "options": ["A", "B", "C", "D"],
  "correct_options": [1],
  "correct_integer": null,
  "pairs": null,
  "images": []
}
```

### 6.4 Test Templates And Sessions

```sql
create table test_templates (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  type text not null check (type in (
    'diagnostic','topic','concept_retest','sectional','mock','benchmark','custom'
  )),
  title text not null,
  description text,
  selection_mode text not null check (selection_mode in (
    'fixed','random_weighted','adaptive_practice','fsrs_retest','custom'
  )),
  config jsonb not null,
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table test_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references test_templates(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id),
  type text not null,
  status text not null default 'created' check (status in (
    'created','scheduled','in_progress','submitted','scored',
    'analyzing','analyzed','abandoned','expired'
  )),
  scheduled_for timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  duration_minutes int,
  tab_switch_count int default 0,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  question_version_id uuid references question_versions(id),
  sequence int not null,
  section_slug text,
  selected_by_reason text,
  created_at timestamptz default now(),
  unique (session_id, sequence),
  unique (session_id, question_id)
);

create table session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references test_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_answer jsonb,
  confidence text check (confidence in ('sure','unsure','guessed')),
  marked_review boolean default false,
  is_correct boolean,
  marks_awarded numeric,
  time_spent_sec int default 0,
  time_to_first_answer_ms int,
  revisit_count int default 0,
  metadata jsonb,
  first_viewed_at timestamptz,
  answered_at timestamptz,
  last_saved_at timestamptz default now(),
  unique (session_id, question_id)
);

create table session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references test_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id),
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
  percentile numeric,
  created_at timestamptz default now()
);
```

### 6.5 Learning, Mastery, Retests

```sql
create table mastery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  topic_id uuid references topics(id),
  concept_id uuid references concepts(id),
  mastery_score numeric default 0,
  confidence_level text default 'low' check (confidence_level in ('low','medium','high')),
  baseline_score numeric,
  stability_factor numeric default 1,
  questions_attempted int default 0,
  questions_correct int default 0,
  last_tested_at timestamptz,
  updated_at timestamptz default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  )
);

create table mistake_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id),
  question_id uuid references questions(id),
  session_id uuid references test_sessions(id),
  topic_id uuid references topics(id),
  concept_id uuid references concepts(id),
  mistake_type text not null check (mistake_type in (
    'conceptual_gap','time_pressure','silly_mistake','not_attempted',
    'overconfidence','lucky_guess','bookmarked'
  )),
  confidence text,
  status text default 'unresolved' check (status in (
    'unresolved','scheduled','reviewed','resolved','ignored'
  )),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table retest_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id),
  topic_id uuid references topics(id),
  concept_id uuid references concepts(id),
  due_at timestamptz not null,
  scheduler text not null default 'simple' check (scheduler in ('simple','sm2','fsrs')),
  scheduler_state jsonb,
  priority numeric default 0,
  status text default 'due' check (status in ('due','scheduled','completed','snoozed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table fsrs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  concept_id uuid references concepts(id),
  stability numeric,
  difficulty numeric,
  elapsed_days int,
  scheduled_days int,
  reps int default 0,
  lapses int default 0,
  state int,
  last_review timestamptz,
  due_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 6.6 AI, Jobs, Events, Experiments

```sql
create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  result_id uuid unique not null references session_results(id) on delete cascade,
  status text default 'pending' check (status in (
    'pending','generating','partial','completed','failed'
  )),
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
  error_message text,
  generated_at timestamptz,
  created_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text default 'pending' check (status in (
    'pending','running','completed','failed','dead'
  )),
  idempotency_key text unique not null,
  payload jsonb not null,
  attempts int default 0,
  max_attempts int default 3,
  next_run_at timestamptz default now(),
  locked_at timestamptz,
  locked_by text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table llm_cost_ledger (
  id uuid primary key default gen_random_uuid(),
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
);

create table user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  properties jsonb,
  occurred_at timestamptz default now()
);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  variants jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table user_experiment_assignments (
  user_id uuid references auth.users(id) on delete cascade,
  experiment_id uuid references experiments(id) on delete cascade,
  variant_id text not null,
  assigned_at timestamptz default now(),
  primary key (user_id, experiment_id)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
```

### 6.7 Scheduling

```sql
create table scheduled_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references exams(id),
  session_id uuid references test_sessions(id),
  retest_queue_id uuid references retest_queue(id),
  title text not null,
  scheduled_for timestamptz not null,
  status text default 'scheduled' check (status in (
    'scheduled','completed','missed','cancelled','rescheduled'
  )),
  reminder_sent boolean default false,
  reminder_sent_at timestamptz,
  created_at timestamptz default now()
);

create table weekly_pledges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  target_tests int not null,
  completed_tests int default 0,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);
```

---

## 7. Indexes

```sql
create index questions_embedding_hnsw
on questions using hnsw (embedding vector_cosine_ops);

create index questions_exam_topic_status
on questions (exam_id, topic_id, status);

create index questions_quality_tier
on questions (quality_tier, exposure_policy);

create index question_versions_question
on question_versions (question_id, version desc);

create index test_sessions_user_status
on test_sessions (user_id, status);

create index test_sessions_exam_type
on test_sessions (exam_id, type);

create index session_answers_session
on session_answers (session_id);

create index session_results_user_exam
on session_results (user_id, exam_id, created_at desc);

create index mastery_user_exam
on mastery_records (user_id, exam_id);

create index mistake_user_status
on mistake_items (user_id, status);

create index retest_due
on retest_queue (status, due_at);

create index jobs_next_run
on jobs (status, next_run_at);

create index user_events_user_time
on user_events (user_id, occurred_at desc);

create index scheduled_items_due
on scheduled_items (status, scheduled_for);
```

For full-text search:

```sql
create index question_versions_fts
on question_versions using gin(to_tsvector('english', content->>'text'));
```

---

## 8. Row Level Security And Authorization

### 8.1 RLS Rules

Enable RLS for user-owned tables:

- `user_profiles`
- `test_sessions`
- `session_answers`
- `session_results`
- `mastery_records`
- `mistake_items`
- `retest_queue`
- `scheduled_items`
- `weekly_pledges`
- `user_events`

Users can only read/write their own rows.

Questions:

- Authenticated users can read live approved questions only through server-approved session APIs.
- Admins can manage all question bank rows.

Admin tables:

- Role claim required: `user_role = admin`.
- Server-side checks still required before mutation.

### 8.2 Auth Rules

- Supabase Auth for email/password and Google OAuth.
- Prefer HttpOnly cookies for app sessions.
- JWT validation in API middleware.
- Refresh token rotation through Supabase.
- Password reset via email.

### 8.3 Security Requirements

| Threat | Mitigation |
|---|---|
| Auth bypass | JWT validation plus RLS. |
| Admin privilege escalation | Server-set role claims only. |
| CSRF | SameSite cookies and CSRF tokens for mutations. |
| SQL injection | Drizzle parameterized queries. |
| XSS | React escaping and DOMPurify for markdown. |
| Prompt injection | Treat user/question content as data; structured prompts; output validation. |
| Question leakage | Do not send correct answers before submit; reserve pools; access checks. |
| Abuse of AI generation | Admin-only, rate-limited, cost ledger. |
| Data privacy | Consent, export, delete, audit logs, DPDP review. |

---

## 9. API Design

### 9.1 Route Groups

Use tRPC routers internally. REST endpoints can wrap selected admin import/webhook workflows.

```text
auth
  getSession
  updateProfile
  deleteAccount

exams
  list
  getBySlug
  getManifest

dashboard
  getOverview
  getReadiness
  getNextBestAction

testTemplates
  list
  createCustom

testSessions
  create
  schedule
  start
  getActive
  saveAnswer
  submit
  getResult
  getAnalysis
  logEvent

mistakes
  list
  markReviewed
  markResolved
  createRetest

retestQueue
  listDue
  schedule
  snooze

schedule
  list
  create
  reschedule
  cancel

admin.exams
  create
  update
  importManifest
  exportManifest

admin.topics
  upsertTree
  list

admin.concepts
  create
  update
  import

admin.questions
  list
  get
  create
  update
  importBulk
  generate
  approve
  reject
  retire
  flagReview

admin.analytics
  questionStats
  usageHeatmap
  aiCosts
  jobStatus
```

### 9.2 Critical API Contracts

Start session:

```typescript
type StartSessionInput = {
  templateId?: string
  examId: string
  type: 'diagnostic' | 'topic' | 'concept_retest' | 'sectional' | 'mock' | 'benchmark' | 'custom'
  config?: Record<string, unknown>
}
```

Save answer:

```typescript
type SaveAnswerInput = {
  sessionId: string
  questionId: string
  selectedAnswer: unknown
  confidence?: 'sure' | 'unsure' | 'guessed'
  markedReview?: boolean
  timeSpentSec: number
  timeToFirstAnswerMs?: number
  revisitCount?: number
}
```

Submit:

```typescript
type SubmitSessionOutput = {
  resultId: string
  score: number
  maxScore: number
  accuracy: number
  status: 'scored' | 'analyzing'
  analysisETASeconds?: number
}
```

---

## 10. Test Session Engine

### 10.1 Session Creation

1. Validate user access and exam.
2. Load template or custom config.
3. Select question IDs server-side.
4. Snapshot `question_version_id`.
5. Create `test_sessions`.
6. Insert `session_questions`.
7. Return question content and options only.

Never return correct answers or explanations before submission.

### 10.2 Question Selection

Diagnostic:

- Use Gold/Silver quality tier.
- Cover all major topics by configured weights.
- Avoid recently seen questions.
- Keep selection fixed/equated.

Benchmark mock:

- Use fixed template or statistically equivalent selection.
- Prioritize Gold questions.
- Do not adapt by user performance.

Topic practice:

- Select by topic/concept.
- Use adaptive difficulty based on mastery.
- Balance source mix.
- Avoid repeated exposure.

Concept retest:

- Select from unresolved mistakes and similar concept questions.
- Prefer not to repeat exact question unless purpose is review.

### 10.3 Autosave And Recovery

Client:

- Zustand active state.
- Save on answer change with debounce.
- Periodic sync every 30 seconds.
- Local backup in browser storage.

Server:

- Upsert `session_answers`.
- Reject saves after session expiry/submission.
- Final submit reconciles server-side answers.

---

## 11. Scoring Engine

### 11.1 Scoring Flow

1. Load session, session questions, question versions, and answers.
2. Evaluate each answer based on question type.
3. Apply exam marking rules.
4. Store `is_correct` and `marks_awarded`.
5. Aggregate session result.
6. Compute deterministic features.
7. Insert `session_results`.
8. Enqueue jobs:
   - `update_mastery`
   - `update_retest_queue`
   - `generate_analysis`
   - `generate_improvement_plan` if diagnostic
   - `record_question_stats_delta`

### 11.2 Deterministic Features

Compute:

- Accuracy by topic, subtopic, concept.
- Accuracy by difficulty.
- Accuracy by source.
- Time by correct/wrong/skipped.
- Negative marks lost.
- High-confidence wrong answers.
- Correct guessed answers.
- Not attempted count.
- Attempt order accuracy.
- Revisit count.
- Time-to-first-answer.
- Fatigue/cognitive load indicators.

LLMs receive these features but do not compute official score.

---

## 12. Mastery Engine

### 12.1 Mastery Update

Use a conservative weighted update:

```typescript
newMastery = combine(
  oldMastery,
  latestAccuracy,
  difficultyWeight,
  confidenceWeight,
  benchmarkWeight,
  recencyWeight
)
```

Rules:

- Correct + sure increases mastery most.
- Correct + guessed increases mastery least.
- Wrong + sure reduces mastery strongly because it indicates misconception.
- Wrong + unsure reduces mastery moderately.
- Benchmark sessions have stronger measurement weight than adaptive practice.
- Low sample sizes keep confidence level low.

### 12.2 Forgetting Curve

Apply nightly decay for topics/concepts not tested recently:

```typescript
decayFactor = Math.exp(-daysSinceLastTest / (14 * stabilityFactor))
decayedMastery = storedMastery * decayFactor
```

Display warning after sufficient user history:

```text
Not tested in 15 days. Retention may have dropped.
```

### 12.3 Readiness Score

Readiness:

```text
weighted average of topic/concept mastery by exam weights
adjusted by recency, benchmark performance, and confidence
```

Readiness confidence:

- Low: insufficient attempts, stale data, poor topic coverage.
- Medium: enough topic coverage but limited benchmarks.
- High: broad coverage, recent attempts, benchmark evidence.

---

## 13. Retest Scheduling And FSRS

### 13.1 Phase 1 Scheduler

Minimum scheduler:

- Wrong, skipped, guessed, and high-confidence wrong answers create retest items.
- Higher priority for high-weight topics and repeated failures.
- Successful retest pushes due date later.
- Failed retest keeps item active and increases priority.

### 13.2 FSRS

FSRS should be implemented behind an interface:

```typescript
interface RetestScheduler {
  schedule(input: ReviewInput): ReviewSchedule
}
```

Adapters:

- `simpleScheduler`
- `sm2Scheduler`
- `fsrsScheduler`

Store state in `retest_queue.scheduler_state` and `fsrs_cards`.

---

## 14. AI Gateway And Pipelines

### 14.1 AI Gateway

All AI calls go through `lib/ai/gateway.ts`.

Each call records:

- Feature.
- Provider.
- Model.
- Prompt version.
- Input hash.
- Output schema version.
- Tokens.
- Cost.
- Latency.
- Error.

### 14.2 Post-Test Analysis Pipeline

```text
session submitted
-> deterministic result created
-> generate deterministic_features JSON
-> enqueue generate_analysis job
-> batch questions by topic/concept
-> call LLM for explanations and summaries
-> validate output schema
-> save ai_analyses
-> notify frontend
```

Analysis output:

- Question-wise explanation.
- Why correct answer is correct.
- Why selected wrong answer is wrong.
- Trap/distractor explanation.
- Topic and concept summary.
- Mistake classification.
- Strategy insights.
- Next recommended actions.

Fallback:

- If AI times out, show deterministic report plus "analysis still generating".
- If partial generation succeeds, store `status = partial`.

### 14.3 Diagnostic Plan Pipeline

```text
diagnostic result
-> build topic/concept weakness map
-> include exam date and daily study time
-> create prioritized plan
-> create first retest/practice schedule suggestions
-> save plan data in dashboard aggregates or plan table
```

LLM can generate coaching language and reasoning, but priority ranking should start from deterministic features.

### 14.4 AI Question Generation Pipeline

```text
admin request
-> load exam/topic/concept/cluster context
-> fetch similar questions
-> generate question and correct answer
-> generate adversarial distractors
-> validate JSON schema
-> factual accuracy check
-> distractor quality check
-> syllabus alignment check
-> duplicate similarity check
-> save as draft/reviewed
-> admin approves to live
```

### 14.5 Vision And Auto-Tagging

Phase 1.5:

- Vision ingestion converts PDFs/images to structured question drafts.
- HuggingFace or local NLP auto-tags topic/concept candidates.
- Admin review remains mandatory.

---

## 15. Question Quality And Psychometrics

### 15.1 Quality Metrics

Nightly job computes:

- Difficulty index.
- Discrimination index.
- Point-biserial correlation.
- Distractor distribution.
- Average time.
- Time anomaly score.
- Flag count.
- Quality tier.

### 15.2 Quality Tier Rules

Gold:

- Expert/PYQ verified.
- Low flag rate.
- Strong discrimination.
- Enough attempts.

Silver:

- Approved and statistically acceptable.

Bronze:

- Approved but insufficient attempt data.

Quarantine:

- Too many flags.
- Very poor discrimination.
- Ambiguous or contested.
- Outdated.

### 15.3 Quarantine Workflow

1. Threshold triggered.
2. Question removed from active pool.
3. Admin review task created.
4. Admin edits, restores, or retires.
5. Users who flagged can be notified.

---

## 16. Analytics And Data Flywheel

### 16.1 Events To Capture

- Test start.
- Test submit.
- Test abandon.
- Answer selection.
- Confidence marking.
- Mark for review.
- Question revisit.
- Tab switch.
- Analysis view.
- Explanation reread.
- Question flag.
- Schedule keep.
- Schedule miss.
- Streak break.
- Milestone hit.
- Plan override.

### 16.2 Uses

- Improve question calibration.
- Improve adaptive selection.
- Detect low-quality questions.
- Tune improvement plans.
- Detect churn risk.
- Measure A/B tests.
- Train future selection/readiness models.

### 16.3 A/B Testing

Initial experiments:

- Analysis format: cards vs narrative.
- Improvement plan: visual path vs priority list.
- Diagnostic length: 40 vs 80 questions.
- Reminder timing: 30 minutes vs 2 hours.
- Dashboard next-action framing.

Assignment:

- Deterministic hash by user and experiment.
- Store in `user_experiment_assignments`.
- Outcomes measured through `user_events`.

---

## 17. Probability Of Selection Engine

Phase 1.5 feature.

Inputs:

- Weighted mastery.
- Benchmark mock performance.
- Consistency/variance.
- Speed metrics.
- Historical cutoffs.
- Peer percentile after sufficient data.
- Exam date.

Output:

- Estimated score if exam was today.
- Probability of clearing cutoff.
- Confidence level.
- Drivers and limiting topics.

Important:

- Do not show PoS to very new users.
- Do not present as guaranteed outcome.
- Require enough benchmark and coverage data.

---

## 18. Background Jobs

| Job | Trigger | Responsibility |
|---|---|---|
| `generate_analysis` | Result created | AI post-test analysis. |
| `generate_improvement_plan` | Diagnostic result created | Plan generation. |
| `update_mastery` | Result created | Topic/concept mastery update. |
| `update_retest_queue` | Result created | Mistake/retest scheduling. |
| `send_reminders` | Cron | Scheduled test reminders. |
| `question_generation` | Admin request | AI question draft generation. |
| `embed_questions` | Question create/update/import | Embedding generation. |
| `compute_question_stats` | Nightly | Psychometric stats and quality tiers. |
| `decay_mastery` | Nightly | Forgetting curve update. |
| `compute_percentiles` | Hourly/daily | Peer benchmarks. |
| `weekly_digest` | Weekly | Progress email. |
| `cleanup_expired_sessions` | Cron | Expire stale sessions. |

All jobs require:

- Idempotency key.
- Attempts and max attempts.
- Exponential backoff.
- Dead-letter state.
- Sentry logging.
- Admin retry for important jobs.

---

## 19. Frontend UX Requirements

### 19.1 Test Taking

Required components:

- Test shell with timer.
- Question content renderer.
- Options renderer for all supported question types.
- Confidence control.
- Mark for review.
- Navigator grid.
- Section progress.
- Autosave indicator.
- Submit confirmation.
- Resume state.

Constraints:

- Stable layout for long questions.
- Mobile responsive.
- No overlap or clipped text.
- Correct answers hidden until result page.

### 19.2 Dashboard

Required sections:

- Next best action.
- Readiness and confidence.
- Weak topic/concept list.
- Mistake Notebook summary.
- Due retests.
- Recent tests.
- Upcoming schedule.
- Strategy metrics.
- Progress timeline.

Phase 1.5:

- Selection Dial.
- Peer insights.
- Mastery map milestones.
- Weekly pledge.

### 19.3 Admin

Required admin surfaces:

- Exam manifest manager.
- Topic/concept tree editor.
- Question bank table.
- Question editor.
- Bulk import wizard.
- Review queue.
- Flagged content queue.
- Quality dashboard.
- Job monitor.
- Audit log.

---

## 20. Performance Targets

| Area | Target |
|---|---|
| Dashboard backend | < 500ms P95 after aggregates. |
| Dashboard full load | < 2s P95. |
| Question load | < 300ms P95. |
| Answer save | < 300ms perceived. |
| Submit scoring | < 1s P95. |
| AI analysis | < 30s P95 for <=100 questions, or partial fallback. |
| Admin search | < 500ms normal filters. |
| Bulk import validation | 5,000 questions in < 2 minutes target. |
| Uptime | 99.5% Phase 1. |

---

## 21. Production Infrastructure And Operations

This product must be designed for real users taking timed exams. Production failures are not minor UX bugs: lost answers, stuck submissions, bad scoring, or wrong explanations directly damage trust. The system therefore needs production controls from the first public launch, even if some components start simpler during private beta.

### 21.1 Scale Assumptions

| Stage | Users | Concurrent Test Takers | Question Bank | Notes |
|---|---:|---:|---:|---|
| Private beta | 200-1,000 | 25-100 | 500-5,000 | One exam, controlled traffic. |
| Public Phase 1 | 10,000 MAU | 500-1,000 | 10,000-50,000 | Two exams, real reminders and AI load. |
| Phase 1.5 | 50,000-100,000 MAU | 3,000-8,000 | 100,000-500,000 | Multiple exams, analytics and peer benchmarks. |
| Phase 2 | 500,000+ MAU | 20,000+ | 1M+ | Requires heavier worker and data architecture. |

Capacity planning must separately model:

- Timed test traffic.
- Autosave write bursts.
- Submit/scoring bursts.
- AI analysis jobs.
- Bulk imports and embeddings.
- Dashboard aggregate reads.
- Admin search and review.

### 21.2 Production Infrastructure Topology

Phase 1 production:

```text
Users
  -> Vercel Edge/CDN
  -> Next.js App/API
  -> Supabase Auth
  -> Supabase Postgres with connection pooling
  -> Supabase Storage CDN
  -> Supabase Realtime
  -> Background worker runner
  -> AI Gateway providers
  -> Resend
  -> Sentry/PostHog/Vercel Analytics
```

Phase 1.5 production adds:

```text
Managed queue / durable worker layer
  -> Railway workers for long jobs
  -> Redis/Upstash or equivalent for rate limit/cache/queue support if needed
  -> Read replicas for analytics-heavy dashboards
  -> Object archive for old event data
```

Do not run heavy AI, OCR, PDF, or psychometric recalibration jobs inside latency-sensitive web requests.

### 21.3 Database Production Plan

Required:

- Use Supabase connection pooling/PgBouncer for serverless API traffic.
- Keep transactions short.
- Avoid N+1 queries in dashboard and result pages.
- Use precomputed dashboard aggregates where possible.
- Partition high-volume event tables by month before they become large.
- Archive old raw `user_events` after retention window.
- Use read replicas for analytics once dashboard/reporting queries affect primary write latency.
- Add query monitoring for slow queries and missing indexes.

High-growth tables that need special care:

| Table | Risk | Production Plan |
|---|---|---|
| `session_answers` | Heavy autosave writes | Index by session/user; batch writes where possible; keep payload small. |
| `user_events` | Very high append volume | Monthly partitioning; retention/archive policy. |
| `ai_analyses` | Large JSON payloads | Store summarized fields separately if query patterns require it. |
| `question_versions` | Search load | FTS index; avoid loading large content in lists. |
| `question_stats` | Nightly recalculation load | Incremental updates first; full recalibration off-peak. |
| `jobs` | Lock contention | Use `FOR UPDATE SKIP LOCKED`; graduate to managed queue if needed. |

### 21.4 Caching And Aggregates

Cache only data that can be safely invalidated.

Recommended:

- Dashboard aggregate table/materialized view per user-exam.
- Question bank admin list cached by filters only if invalidation is clear.
- Exam manifests cached aggressively because they change rarely.
- AI prompt context cached by exam/topic version.
- CDN cache for public static assets and question media.

Avoid:

- Caching active test answers outside the session owner path.
- Caching correct answers in client-visible layers.
- Long-lived cache for readiness if mastery changed after submit.

### 21.5 Queue And Worker Strategy

Private beta may use a Postgres-backed `jobs` table. Public launch should be ready for a more durable worker setup if job volume rises.

Job requirements:

- Idempotency keys.
- Retry with exponential backoff.
- Dead-letter state.
- Worker locking.
- Per-job timeout.
- Partial result support.
- Admin retry.
- Cost tracking for AI jobs.

Escalation path:

| Stage | Queue Strategy |
|---|---|
| Private beta | Postgres `jobs` table + scheduled runner. |
| Early public | Postgres jobs with dedicated worker process, or managed queue. |
| Scale | Dedicated queue such as Redis/BullMQ, Inngest, Trigger.dev, QStash, or equivalent. |
| Heavy AI/OCR | Railway worker pool or equivalent long-running compute. |

### 21.6 Reliability And Graceful Degradation

Critical user paths:

1. Start test.
2. Save answer.
3. Submit test.
4. See score.
5. Recover interrupted session.

These must work even if AI providers, email, analytics, or peer benchmarks are down.

Graceful degradation rules:

- If AI analysis fails, show deterministic result and retry in background.
- If realtime fails, poll analysis status.
- If email fails, keep in-app reminders.
- If embeddings fail, question import still creates draft questions marked `embedding_pending`.
- If analytics fails, never block testing.
- If dashboard aggregates are stale, show last computed state with timestamp and trigger refresh.
- If autosave fails, keep local backup and show visible sync warning.

### 21.7 Backup, Restore, And Disaster Recovery

Required for public launch:

- Daily automated database backups.
- Point-in-time recovery if available on chosen Supabase plan.
- Regular restore drills on staging.
- Object storage backup policy for media and source documents.
- Migration rollback plan.
- Export of critical exam manifests and seed data to version control.

Recovery objectives:

| Scenario | RPO | RTO |
|---|---:|---:|
| App deploy bug | 0 data loss | < 30 min rollback |
| Database bad migration | < 15 min if PITR available | < 2 hr |
| Worker failure | No lost jobs | < 1 hr |
| AI provider outage | No score loss | AI degraded until provider recovers |
| Storage outage | No test answer loss | Media degraded |

### 21.8 Observability And Alerting

Use structured logs with:

- Request ID.
- User ID hash.
- Session ID.
- Job ID.
- Provider/model for AI calls.
- Latency.
- Error code.

Dashboards:

- API latency and error rate.
- Autosave success/failure rate.
- Submit success/failure rate.
- AI job queue depth and failure rate.
- Analysis P95 completion time.
- Database CPU, connections, slow queries.
- Realtime delivery errors.
- Email reminder delivery rate.
- Question flag rate.
- Diagnostic completion funnel.

Alerts:

| Alert | Threshold |
|---|---|
| Submit error rate | > 1% over 5 minutes |
| Autosave failure rate | > 3% over 10 minutes |
| AI job failure rate | > 5% over 15 minutes |
| Analysis queue age | Oldest pending > 5 minutes |
| Reminder delivery | < 95% sent for due reminders |
| Database connections | > 80% pool usage sustained |
| Slow query | Any P95 dashboard query > 1s |
| Question flag spike | > 2x baseline in 1 hour |

### 21.9 Release And Deployment Safety

Production release rules:

- Every DB migration must be backward compatible with the currently deployed app.
- Use expand-migrate-contract for breaking schema changes.
- Feature flags for risky features: FSRS, PoS, vision ingestion, adaptive flow adjuster, peer insights.
- Canary release for major test-engine changes.
- Rollback plan for every deploy.
- No Friday-night production releases unless urgent.
- Seed and migration scripts must be repeatable.

Required checks before deploy:

- Typecheck.
- Lint.
- Unit tests.
- Integration tests for submit/scoring.
- Migration dry run.
- Playwright smoke tests.
- Security-sensitive route test.

### 21.10 Security Hardening For Production

Additional production controls:

- WAF or Vercel protection for common attacks.
- Strict rate limits by IP, user, and admin role.
- Separate admin domain or admin route hardening where possible.
- MFA required for admin users.
- Secrets stored only in platform secret managers.
- No service-role Supabase key in browser.
- Audit all admin mutations.
- Signed URLs for private media where needed.
- Periodic dependency vulnerability scans.
- Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy.
- PII minimization in logs and analytics.

Admin operations that require audit logs:

- Role changes.
- Question approval/retirement.
- Answer key changes.
- Result correction.
- Bulk imports.
- AI generation runs.
- Manifest changes.
- User data export/delete.

### 21.11 Data Governance And Compliance

Required:

- Consent record for AI analysis.
- Clear privacy policy.
- Data export.
- Account deletion.
- Retention policy for raw events and old sessions.
- India DPDP Act review before public launch.
- GDPR-style data rights if serving international users.
- PII separation from analytics where practical.

Suggested retention:

| Data | Retention |
|---|---|
| User profile | Until deletion. |
| Test results | Until deletion, unless anonymized for stats. |
| Raw user events | 12-18 months, then aggregate/archive. |
| AI logs with prompt inputs | Shorter retention, redact PII where possible. |
| Audit logs | 3-7 years depending business/legal needs. |
| Deleted user data | Hard delete or anonymize within defined SLA. |

### 21.12 Cost Controls

Track costs by feature:

- AI analysis per test.
- AI question generation per admin job.
- Embeddings per import.
- Realtime messages.
- Storage and bandwidth.
- Database compute.
- Worker runtime.
- Email volume.

Controls:

- Per-user and per-admin AI rate limits.
- Batch AI calls by topic.
- Prompt caching.
- Smaller model for low-risk explanations.
- Hard token limits.
- Queue budget caps.
- Daily cost alert.
- Disable non-critical AI features during cost spikes.

### 21.13 Real-World Failure Runbooks

Create runbooks for:

- Users cannot submit tests.
- Autosave failures spike.
- AI analysis stuck.
- Bad question or wrong answer goes viral.
- Database migration fails.
- Supabase outage.
- AI provider outage.
- Email reminders not sending.
- Admin accidentally approves bad bulk import.
- Question leakage/compromised pool.

Each runbook should include:

- Detection signal.
- Immediate mitigation.
- Data recovery steps.
- User communication.
- Post-incident review checklist.

---

## 22. Testing Strategy

### 21.1 Unit Tests

Cover:

- Marking rules.
- Answer evaluation for each question type.
- Score aggregation.
- Mastery update.
- Forgetting curve.
- Simple scheduler and FSRS adapter.
- Manifest validation.
- Import validation.
- Duplicate thresholds.
- AI schema validation.

### 21.2 Integration Tests

Cover:

- Signup -> profile.
- Manifest import -> exam/topic/concept creation.
- Question import -> review -> approve.
- Start session -> save answers -> submit -> result.
- Result -> mastery -> mistake notebook -> retest queue.
- AI analysis job lifecycle.
- Admin flag/quarantine flow.

### 21.3 E2E Tests

Cover:

- User diagnostic journey.
- Topic test journey.
- Mistake Notebook retest journey.
- Schedule and reminder visibility.
- Admin bulk import and approve.

### 21.4 Load/Performance Tests

Cover:

- Concurrent autosaves.
- Concurrent submissions.
- Dashboard aggregate loads.
- Admin search with large question bank.

---

## 23. CI/CD And Environments

### 22.1 Environments

| Environment | App | Database |
|---|---|---|
| Local | `localhost:3000` | Local Supabase |
| Staging | Vercel preview | Supabase staging |
| Production | Vercel production | Supabase production |

### 22.2 CI Pipeline

```yaml
quality:
  - pnpm install
  - pnpm typecheck
  - pnpm lint
  - pnpm test

integration:
  - apply test migrations
  - run integration tests

e2e:
  - playwright smoke suite

deploy:
  - deploy preview on PR
  - deploy production from main
```

### 22.3 Migration Rules

- Migrations live in `supabase/migrations`.
- No ad hoc production DDL.
- Seed files for initial exam manifests and sample questions.
- Migration validation in CI.

---

## 24. Build Plan

### Step 0: Project Setup

Deliverables:

- Next.js app.
- TypeScript strict mode.
- Tailwind/shadcn setup.
- Supabase project setup.
- Drizzle setup.
- CI pipeline.
- `.env.example`.

### Step 1: Auth And Profiles

Deliverables:

- Email/password auth.
- Google OAuth.
- Profile page.
- Study constraints.
- AI consent.
- RLS baseline.

### Step 2: Exam Manifest Engine

Deliverables:

- Manifest Zod schema.
- Admin import/export.
- `exams`, `topics`, `concepts`, `historical_cutoffs`.
- First UPSC Prelims seed manifest.

### Step 3: Question Bank Core

Deliverables:

- Question schema and versioning.
- Admin question CRUD.
- Bulk CSV/JSON import.
- Review/approve/reject.
- Flag/retire/quarantine.
- Basic search and filters.

### Step 4: Test Template And Session Engine

Deliverables:

- Test templates.
- Session creation.
- Server-side question selection.
- Session question snapshotting.
- Question payload without answers.

### Step 5: Test Taking UI

Deliverables:

- Test shell.
- Question renderer.
- Navigator.
- Timer.
- Confidence marking.
- Mark for review.
- Autosave and resume.
- Submit flow.

### Step 6: Scoring And Results

Deliverables:

- Marking rules engine.
- Evaluation for all P0 question types.
- `session_results`.
- Result summary page.
- Strategy metrics.

### Step 7: Mastery And Dashboard

Deliverables:

- Mastery update job.
- Readiness score.
- Readiness confidence.
- Dashboard overview.
- Weak topics/concepts.
- Progress timeline.

### Step 8: Mistake Notebook And Retest Queue

Deliverables:

- Mistake item creation.
- Notebook page.
- Retest queue.
- Simple scheduler.
- Retest session creation.

### Step 9: AI Analysis

Deliverables:

- AI gateway.
- Prompt/schema versions.
- Generate analysis job.
- Analysis page.
- Explanation rating/reporting.
- Cost ledger.

### Step 10: Improvement Plan

Deliverables:

- Diagnostic plan generation.
- Plan reasoning.
- Next best action.
- Schedule/take-now links.
- Plan update after tests.

### Step 11: Scheduling And Reminders

Deliverables:

- Schedule page.
- Scheduled item table.
- In-app upcoming/overdue state.
- Resend email reminders.
- Reminder cron.

### Step 12: Content Quality Intelligence

Deliverables:

- Question stats job.
- Quality tier updates.
- Distractor distribution.
- Admin quality dashboard.
- Exposure controls.

### Step 13: AI Question Generation

Deliverables:

- Admin generation form.
- AI generation job.
- Factual/distractor/syllabus checks.
- Duplicate check.
- Review queue integration.

### Step 14: Behavioral And Analytics Layer

Deliverables:

- `user_events`.
- Weekly pledge.
- Streak logic.
- Basic digest.
- A/B experiment framework.

### Step 15: Production Hardening

Deliverables:

- Production Supabase project with connection pooling configured.
- Staging and production environment separation.
- Backup/PITR policy confirmed.
- Restore drill completed on staging.
- Sentry, PostHog, Vercel Analytics dashboards.
- Operational alerts for submit failures, autosave failures, AI queue age, DB pool usage, and reminder delivery.
- Rate limits and WAF/security headers configured.
- Admin MFA requirement and audit logs verified.
- Runbooks for test submit outage, AI outage, bad question incident, failed migration, and reminder failure.
- Load test for concurrent autosaves and submissions.
- Migration rollback playbook.
- Feature flags for risky Phase 1.5 modules.

### Step 16: Phase 1.5 Advanced Modules

Deliverables:

- FSRS scheduler.
- Concept clusters UI.
- Peer benchmarks.
- Probability of Selection.
- Vision ingestion.
- HuggingFace auto-tagging.
- Railway worker extraction if needed.

---

## 25. Launch Gates

Private beta gate:

- One exam manifest ready.
- 200-500 high-quality questions minimum.
- Diagnostic works end to end.
- Submit/result/mastery/notebook loop works.
- AI analysis success rate > 95%.

Public launch gate:

- 5,000 questions per launch exam target.
- Gold/Silver enough for diagnostic and mocks.
- Question flag rate < 2%.
- Diagnostic completion > 60% in beta.
- Second test within 7 days > 50%.
- No P0 security/privacy blockers.

---

## 26. Open Decisions

These do not block starting implementation, but should be decided before public launch:

| Decision | Default In This TRD |
|---|---|
| First exam | UPSC Prelims. |
| Second exam | Banking PO unless market research favors JEE. |
| Scheduler | Simple scheduler first, FSRS in Phase 1.5 or earlier if easy. |
| API style | tRPC internally, REST where needed. |
| AI provider | Provider abstraction, Groq as first implementation. |
| Worker platform | Supabase jobs first, Railway for heavy jobs. |
| Probability of Selection | Phase 1.5 after benchmark data exists. |
| Vision ingestion | Phase 1.5 unless content seeding is blocked. |
| Monetization | Free beta/public Phase 1 to build data flywheel. |

---

## 27. Implementation Rule Of Thumb

Build the smallest reliable loop first:

```text
Exam manifest -> Question bank -> Diagnostic -> Test session -> Scoring
-> Result -> Mastery -> Mistake Notebook -> Retest -> Dashboard
```

Only after this loop feels trustworthy should the team expand into Selection Dial, peer benchmarks, OCR ingestion, advanced AI agents, and monetization.
