create table if not exists public.improvement_plans (
  id uuid primary key default gen_random_uuid(),
  session_result_id uuid not null unique references public.session_results(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  exam_id uuid references public.exams(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'disabled')),
  output jsonb,
  error_message text,
  schema_version text,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists improvement_plans_user_exam_created
  on public.improvement_plans (user_id, exam_id, created_at desc);

create index if not exists improvement_plans_status
  on public.improvement_plans (status);

alter table public.improvement_plans enable row level security;

drop policy if exists improvement_plans_select on public.improvement_plans;
create policy improvement_plans_select
  on public.improvement_plans
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists improvement_plans_insert on public.improvement_plans;
create policy improvement_plans_insert
  on public.improvement_plans
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists improvement_plans_update on public.improvement_plans;
create policy improvement_plans_update
  on public.improvement_plans
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.improvement_plans to authenticated;
