-- Phase 0 exam manifest engine.
-- Creates zero-code exam configuration tables and guarded access policies.

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_manifests (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  slug text not null,
  version int not null,
  manifest jsonb not null,
  is_active boolean not null default true,
  imported_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (slug, version)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  parent_id uuid references public.topics(id),
  slug text not null,
  name text not null,
  description text,
  level int not null,
  weight_percent numeric,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (exam_id, slug)
);

create table if not exists public.concept_clusters (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (exam_id, slug)
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  cluster_id uuid references public.concept_clusters(id),
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (exam_id, slug)
);

create table if not exists public.historical_cutoffs (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  year int not null,
  category text not null default 'general',
  cutoff_score numeric not null,
  max_score numeric not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'user_role',
    auth.jwt() ->> 'user_role',
    ''
  ) = 'admin';
$$;

alter table public.exams enable row level security;
alter table public.exam_manifests enable row level security;
alter table public.topics enable row level security;
alter table public.concept_clusters enable row level security;
alter table public.concepts enable row level security;
alter table public.historical_cutoffs enable row level security;

drop policy if exists exams_read_active on public.exams;
create policy exams_read_active
on public.exams
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists exams_admin_all on public.exams;
create policy exams_admin_all
on public.exams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists exam_manifests_read_active on public.exam_manifests;
create policy exam_manifests_read_active
on public.exam_manifests
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1 from public.exams
    where exams.id = exam_manifests.exam_id
    and exams.is_active = true
  )
  or public.is_admin()
);

drop policy if exists exam_manifests_admin_all on public.exam_manifests;
create policy exam_manifests_admin_all
on public.exam_manifests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists topics_read_active_exam on public.topics;
create policy topics_read_active_exam
on public.topics
for select
to authenticated
using (
  exists (
    select 1 from public.exams
    where exams.id = topics.exam_id
    and exams.is_active = true
  )
  or public.is_admin()
);

drop policy if exists topics_admin_all on public.topics;
create policy topics_admin_all
on public.topics
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists concept_clusters_read_active_exam on public.concept_clusters;
create policy concept_clusters_read_active_exam
on public.concept_clusters
for select
to authenticated
using (
  exists (
    select 1 from public.exams
    where exams.id = concept_clusters.exam_id
    and exams.is_active = true
  )
  or public.is_admin()
);

drop policy if exists concept_clusters_admin_all on public.concept_clusters;
create policy concept_clusters_admin_all
on public.concept_clusters
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists concepts_read_active_exam on public.concepts;
create policy concepts_read_active_exam
on public.concepts
for select
to authenticated
using (
  exists (
    select 1 from public.exams
    where exams.id = concepts.exam_id
    and exams.is_active = true
  )
  or public.is_admin()
);

drop policy if exists concepts_admin_all on public.concepts;
create policy concepts_admin_all
on public.concepts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists historical_cutoffs_read_active_exam on public.historical_cutoffs;
create policy historical_cutoffs_read_active_exam
on public.historical_cutoffs
for select
to authenticated
using (
  exists (
    select 1 from public.exams
    where exams.id = historical_cutoffs.exam_id
    and exams.is_active = true
  )
  or public.is_admin()
);

drop policy if exists historical_cutoffs_admin_all on public.historical_cutoffs;
create policy historical_cutoffs_admin_all
on public.historical_cutoffs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists exam_manifests_exam_active_idx
on public.exam_manifests (exam_id, is_active, version desc);

create index if not exists topics_exam_parent_idx
on public.topics (exam_id, parent_id, order_index);

create index if not exists topics_exam_level_idx
on public.topics (exam_id, level);

create index if not exists concept_clusters_exam_idx
on public.concept_clusters (exam_id);

create index if not exists concepts_exam_topic_idx
on public.concepts (exam_id, topic_id);

create index if not exists historical_cutoffs_exam_year_idx
on public.historical_cutoffs (exam_id, year desc, category);

