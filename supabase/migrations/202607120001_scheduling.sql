-- Scheduling schema (TSP-083).
-- Adds scheduled_items with owner-only RLS. Supports scheduling tests and retests.
-- Overdue is derived at read time (status = 'planned' and scheduled_for < now()) — no cron needed.
-- weekly_pledges is deliberately NOT here; it moves to TSP-087 with the pledge feature.
-- Rollback: drop table if exists public.scheduled_items;

create table if not exists public.scheduled_items (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  exam_id       uuid        not null references public.exams(id) on delete cascade,
  topic_id      uuid        references public.topics(id) on delete set null,
  item_type     text        not null check (item_type in ('test', 'retest')),
  session_type  text        not null check (
    session_type in ('diagnostic', 'topic', 'concept_retest', 'sectional', 'mock', 'benchmark', 'custom')
  ),
  scheduled_for timestamptz not null,
  status        text        not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  session_id    uuid        references public.test_sessions(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists scheduled_items_set_updated_at on public.scheduled_items;
create trigger scheduled_items_set_updated_at
  before update on public.scheduled_items
  for each row execute function public.set_updated_at();

alter table public.scheduled_items enable row level security;

-- scheduled_items: authenticated owner only
drop policy if exists scheduled_items_owner on public.scheduled_items;
create policy scheduled_items_owner
  on public.scheduled_items for all
  to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists scheduled_items_user_scheduled_idx
  on public.scheduled_items (user_id, scheduled_for);
