create table if not exists public.explanation_ratings (
  id uuid primary key default gen_random_uuid(),
  session_result_id uuid not null references public.session_results(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  scope text not null
    check (scope in ('question_analysis', 'topic_summary', 'overall')),
  scope_key text not null default '',
  rating text not null check (rating in ('up', 'down')),
  report_category text
    check (report_category in ('wrong_answer', 'misleading', 'off_topic', 'low_quality')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_result_id, scope, scope_key)
);

create index if not exists explanation_ratings_result
  on public.explanation_ratings (session_result_id);

create index if not exists explanation_ratings_down
  on public.explanation_ratings (rating, created_at desc)
  where rating = 'down';

alter table public.explanation_ratings enable row level security;

drop policy if exists explanation_ratings_select on public.explanation_ratings;
create policy explanation_ratings_select
  on public.explanation_ratings
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists explanation_ratings_insert on public.explanation_ratings;
create policy explanation_ratings_insert
  on public.explanation_ratings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists explanation_ratings_update on public.explanation_ratings;
create policy explanation_ratings_update
  on public.explanation_ratings
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.explanation_ratings to authenticated;
