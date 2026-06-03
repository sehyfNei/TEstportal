create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  session_result_id uuid not null unique references public.session_results(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'disabled')),
  output jsonb,
  error_message text,
  schema_version text,
  prompt_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_analyses_user_created
  on public.ai_analyses (user_id, created_at desc);

create index if not exists ai_analyses_status
  on public.ai_analyses (status);

alter table public.ai_analyses enable row level security;

drop policy if exists ai_analyses_select on public.ai_analyses;
create policy ai_analyses_select
  on public.ai_analyses
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists ai_analyses_insert on public.ai_analyses;
create policy ai_analyses_insert
  on public.ai_analyses
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists ai_analyses_update on public.ai_analyses;
create policy ai_analyses_update
  on public.ai_analyses
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.ai_analyses to authenticated;

drop policy if exists question_versions_read_scored_session on public.question_versions;
create policy question_versions_read_scored_session
  on public.question_versions
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.session_questions sq
      join public.session_results sr on sr.session_id = sq.session_id
      where sq.question_version_id = question_versions.id
        and sr.user_id = auth.uid()
    )
  );

grant select on public.question_versions to authenticated;
