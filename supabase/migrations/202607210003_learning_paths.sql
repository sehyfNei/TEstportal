-- TSP-172: schema foundation for personalised learning paths (TSP-173/174/175/176).
-- This row is schema + RLS only — no job, no UI, no RPC layer. Those land in
-- the later child rows; this just needs to be a clean, well-shaped surface
-- for them to build on.
-- Rollback:
--   drop table if exists public.path_milestones;
--   drop table if exists public.learning_paths;

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  goal text not null,
  target_date date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  -- Cached by TSP-174's progress job so the dashboard/UI don't have to
  -- recompute from path_milestones on every read; null until that job runs.
  overall_progress_percent numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A student can only have one ACTIVE plan per exam at a time — setting a new
-- goal (TSP-176) means retiring the old one first, not silently having two.
create unique index if not exists learning_paths_one_active_per_user_exam
  on public.learning_paths (user_id, exam_id)
  where status = 'active';

drop trigger if exists learning_paths_set_updated_at on public.learning_paths;
create trigger learning_paths_set_updated_at
before update on public.learning_paths
for each row execute function public.set_updated_at();

alter table public.learning_paths enable row level security;

drop policy if exists learning_paths_owner on public.learning_paths;
create policy learning_paths_owner
  on public.learning_paths for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.path_milestones (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  week_number int not null check (week_number > 0),
  target_mastery numeric not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  -- TSP-173's generation job must be idempotent on re-run (its own
  -- acceptance criteria) — this constraint makes that a real guarantee,
  -- enforceable via a plain upsert rather than a manual dedup check.
  unique (path_id, topic_id, week_number)
);

alter table public.path_milestones enable row level security;

-- No direct user_id column here, so ownership is checked through the parent
-- path — same pattern as chat_messages_owner checking chat_sessions.
drop policy if exists path_milestones_owner on public.path_milestones;
create policy path_milestones_owner
  on public.path_milestones for all
  to authenticated
  using (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id
        and lp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.learning_paths lp
      where lp.id = path_id
        and lp.user_id = auth.uid()
    )
  );
