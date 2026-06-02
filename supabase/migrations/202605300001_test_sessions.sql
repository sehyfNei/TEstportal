-- TSP-035 test templates and user test sessions.
-- Stores session-local prompt snapshots without answer keys or explanations.

create table if not exists public.test_templates (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  type text not null check (type in (
    'diagnostic','topic','concept_retest','sectional','mock','benchmark','custom'
  )),
  title text not null,
  description text,
  selection_mode text not null check (selection_mode in (
    'fixed','random_weighted','adaptive_practice','fsrs_retest','custom'
  )),
  config jsonb not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.test_templates(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id),
  type text not null check (type in (
    'diagnostic','topic','concept_retest','sectional','mock','benchmark','custom'
  )),
  status text not null default 'created' check (status in (
    'created','scheduled','in_progress','submitted','scored',
    'analyzing','analyzed','abandoned','expired'
  )),
  scheduled_for timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  duration_minutes int,
  tab_switch_count int not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  question_version_id uuid references public.question_versions(id),
  prompt_snapshot jsonb not null check (
    jsonb_typeof(prompt_snapshot) = 'object'
    and not (
      prompt_snapshot ?| array[
        'answer',
        'answers',
        'correct_answer',
        'correct_answers',
        'correct_option',
        'correct_options',
        'correct_integer',
        'explanation',
        'explanation_detail'
      ]
    )
  ),
  sequence int not null,
  section_slug text,
  selected_by_reason text,
  created_at timestamptz not null default now(),
  unique (session_id, sequence),
  unique (session_id, question_id)
);

create table if not exists public.session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  selected_answer jsonb,
  confidence text check (confidence in ('sure','unsure','guessed')),
  marked_review boolean not null default false,
  is_correct boolean,
  marks_awarded numeric,
  time_spent_sec int not null default 0,
  time_to_first_answer_ms int,
  revisit_count int not null default 0,
  metadata jsonb,
  first_viewed_at timestamptz,
  answered_at timestamptz,
  last_saved_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists public.session_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique not null references public.test_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id),
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
  created_at timestamptz not null default now()
);

drop trigger if exists test_templates_set_updated_at on public.test_templates;
create trigger test_templates_set_updated_at
before update on public.test_templates
for each row execute function public.set_updated_at();

drop trigger if exists test_sessions_set_updated_at on public.test_sessions;
create trigger test_sessions_set_updated_at
before update on public.test_sessions
for each row execute function public.set_updated_at();

alter table public.test_templates enable row level security;
alter table public.test_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.session_answers enable row level security;
alter table public.session_results enable row level security;

drop policy if exists test_templates_read_active on public.test_templates;
create policy test_templates_read_active
on public.test_templates
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists test_templates_admin_all on public.test_templates;
create policy test_templates_admin_all
on public.test_templates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists test_sessions_owner_select on public.test_sessions;
create policy test_sessions_owner_select
on public.test_sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists test_sessions_owner_insert on public.test_sessions;
create policy test_sessions_owner_insert
on public.test_sessions
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists test_sessions_owner_update on public.test_sessions;
create policy test_sessions_owner_update
on public.test_sessions
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists test_sessions_admin_all on public.test_sessions;
create policy test_sessions_admin_all
on public.test_sessions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists session_questions_owner_select on public.session_questions;
create policy session_questions_owner_select
on public.session_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.test_sessions
    where test_sessions.id = session_questions.session_id
      and test_sessions.user_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists session_questions_admin_all on public.session_questions;
create policy session_questions_admin_all
on public.session_questions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists session_answers_owner_select on public.session_answers;
create policy session_answers_owner_select
on public.session_answers
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists session_answers_owner_insert on public.session_answers;
create policy session_answers_owner_insert
on public.session_answers
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.test_sessions
    where test_sessions.id = session_answers.session_id
      and test_sessions.user_id = auth.uid()
  )
);

drop policy if exists session_answers_owner_update on public.session_answers;
create policy session_answers_owner_update
on public.session_answers
for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.test_sessions
    where test_sessions.id = session_answers.session_id
      and test_sessions.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.test_sessions
    where test_sessions.id = session_answers.session_id
      and test_sessions.user_id = auth.uid()
  )
);

drop policy if exists session_answers_admin_all on public.session_answers;
create policy session_answers_admin_all
on public.session_answers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists session_results_owner_select on public.session_results;
create policy session_results_owner_select
on public.session_results
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists session_results_admin_all on public.session_results;
create policy session_results_admin_all
on public.session_results
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists test_sessions_user_status
on public.test_sessions (user_id, status);

create index if not exists test_sessions_exam_type
on public.test_sessions (exam_id, type);

create index if not exists session_answers_session
on public.session_answers (session_id);

create index if not exists session_results_user_exam
on public.session_results (user_id, exam_id, created_at desc);
