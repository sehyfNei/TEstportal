-- Weekly pledge (TSP-087).
-- One standing weekly test target per user. Progress is derived at read time by
-- counting test_submit events in the current IST week — no per-week rows, no cron.
-- Depends on TSP-083 (scheduling) only for the set_updated_at() trigger helper.
-- Rollback: drop table if exists public.weekly_pledges;

create table if not exists public.weekly_pledges (
  user_id       uuid        primary key references auth.users(id) on delete cascade,
  weekly_target int         not null check (weekly_target between 1 and 50),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists weekly_pledges_set_updated_at on public.weekly_pledges;
create trigger weekly_pledges_set_updated_at
  before update on public.weekly_pledges
  for each row execute function public.set_updated_at();

alter table public.weekly_pledges enable row level security;

-- weekly_pledges: authenticated owner only
drop policy if exists weekly_pledges_owner on public.weekly_pledges;
create policy weekly_pledges_owner
  on public.weekly_pledges for all
  to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
