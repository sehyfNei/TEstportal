-- Phase 0 question bank core.
-- Adds versioned question storage, concept tagging, flags, stats, indexes, and RLS.

create extension if not exists vector;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  topic_id uuid not null references public.topics(id),
  subtopic_id uuid references public.topics(id),
  type text not null check (type in (
    'mcq','msq','integer','statement','assertion','match'
  )),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  source text not null check (source in ('pyq','ai_generated','manual','vision_ingested')),
  source_year int,
  source_reference text,
  is_contested boolean not null default false,
  language text not null default 'en',
  status text not null default 'draft' check (status in (
    'draft','validated','reviewed','approved','live','flagged','retired'
  )),
  exposure_policy text not null default 'practice' check (exposure_policy in (
    'practice','diagnostic_reserved','benchmark_reserved','hidden'
  )),
  current_version_id uuid,
  quality_tier text not null default 'bronze' check (quality_tier in (
    'gold','silver','bronze','quarantine'
  )),
  quality_score numeric,
  usage_count int not null default 0,
  flag_count int not null default 0,
  avg_accuracy numeric,
  embedding vector(1536),
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  last_audited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version int not null,
  content jsonb not null,
  explanation text,
  explanation_detail text,
  reviewer_notes text,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (question_id, version)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_current_version_fk'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
    add constraint questions_current_version_fk
    foreign key (current_version_id)
    references public.question_versions(id)
    on delete set null;
  end if;
end;
$$;

create table if not exists public.question_concepts (
  question_id uuid not null references public.questions(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  relevance numeric not null default 1.0,
  primary key (question_id, concept_id)
);

create table if not exists public.question_flags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in (
    'incorrect_answer','ambiguous','wrong_topic','outdated','low_quality','other'
  )),
  details text,
  status text not null default 'open' check (status in (
    'open','reviewing','resolved','rejected'
  )),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.question_stats (
  question_id uuid primary key references public.questions(id) on delete cascade,
  total_attempts int not null default 0,
  correct_attempts int not null default 0,
  difficulty_index numeric,
  discrimination numeric,
  point_biserial numeric,
  avg_time_sec numeric,
  stddev_time_sec numeric,
  distractor_dist jsonb not null default '{}',
  flag_count int not null default 0,
  quality_tier text not null default 'bronze' check (quality_tier in (
    'gold','silver','bronze','quarantine'
  )),
  last_calibrated timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists question_stats_set_updated_at on public.question_stats;
create trigger question_stats_set_updated_at
before update on public.question_stats
for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_concepts enable row level security;
alter table public.question_flags enable row level security;
alter table public.question_stats enable row level security;

drop policy if exists questions_read_live_metadata on public.questions;
create policy questions_read_live_metadata
on public.questions
for select
to authenticated
using (status = 'live' or public.is_admin());

drop policy if exists questions_admin_all on public.questions;
create policy questions_admin_all
on public.questions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists question_versions_admin_all on public.question_versions;
create policy question_versions_admin_all
on public.question_versions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists question_concepts_read_live on public.question_concepts;
create policy question_concepts_read_live
on public.question_concepts
for select
to authenticated
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_concepts.question_id
      and questions.status = 'live'
  )
  or public.is_admin()
);

drop policy if exists question_concepts_admin_all on public.question_concepts;
create policy question_concepts_admin_all
on public.question_concepts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists question_flags_select_own on public.question_flags;
create policy question_flags_select_own
on public.question_flags
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists question_flags_insert_own_live on public.question_flags;
create policy question_flags_insert_own_live
on public.question_flags
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.questions
    where questions.id = question_flags.question_id
      and questions.status = 'live'
  )
);

drop policy if exists question_flags_admin_all on public.question_flags;
create policy question_flags_admin_all
on public.question_flags
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists question_stats_read_live on public.question_stats;
create policy question_stats_read_live
on public.question_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.questions
    where questions.id = question_stats.question_id
      and questions.status = 'live'
  )
  or public.is_admin()
);

drop policy if exists question_stats_admin_all on public.question_stats;
create policy question_stats_admin_all
on public.question_stats
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists questions_embedding_hnsw
on public.questions using hnsw (embedding vector_cosine_ops)
where embedding is not null;

create index if not exists questions_exam_topic_status
on public.questions (exam_id, topic_id, status);

create index if not exists questions_quality_tier
on public.questions (quality_tier, exposure_policy);

create index if not exists questions_source_year
on public.questions (source, source_year);

create index if not exists question_versions_question
on public.question_versions (question_id, version desc);

create index if not exists question_versions_fts
on public.question_versions using gin(to_tsvector('english', content->>'text'));

create index if not exists question_flags_question_status
on public.question_flags (question_id, status, created_at desc);

create index if not exists question_flags_user_status
on public.question_flags (user_id, status, created_at desc);
