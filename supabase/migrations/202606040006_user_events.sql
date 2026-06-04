-- TSP-096: append-only user_events stream for the analytics flywheel (FINAL_TRD §6.6, §16.1).
-- No UPDATE/DELETE policy by design — this is an append-only signal log.

create table if not exists public.user_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  event_type  text not null,
  entity_type text,
  entity_id   uuid,
  properties  jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists user_events_user_time
on public.user_events (user_id, occurred_at desc);

-- Useful for type-sliced analytics queries (not in TRD §7 but low-cost and high-value).
create index if not exists user_events_type_time
on public.user_events (event_type, occurred_at desc);

alter table public.user_events enable row level security;

drop policy if exists user_events_owner_insert on public.user_events;
create policy user_events_owner_insert
on public.user_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_events_owner_select on public.user_events;
create policy user_events_owner_select
on public.user_events
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

grant select, insert on public.user_events to authenticated;
