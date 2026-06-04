-- Migration to create the jobs table for TSP-116.
-- Reusable schema for background jobs with RLS.

create table if not exists public.jobs (
  id               uuid primary key default gen_random_uuid(),
  type             text not null,
  status           text not null default 'pending'
                   check (status in ('pending','running','completed','failed','dead')),
  idempotency_key  text unique not null,
  payload          jsonb not null,
  attempts         int not null default 0,
  max_attempts     int not null default 3,
  next_run_at      timestamptz not null default now(),
  locked_at        timestamptz,
  locked_by        text,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists jobs_next_run
  on public.jobs (status, next_run_at);

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

drop policy if exists jobs_select_admin on public.jobs;
create policy jobs_select_admin
  on public.jobs
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists jobs_insert_authenticated on public.jobs;
create policy jobs_insert_authenticated
  on public.jobs
  for insert
  to authenticated
  with check (true);

grant select, insert on public.jobs to authenticated;
