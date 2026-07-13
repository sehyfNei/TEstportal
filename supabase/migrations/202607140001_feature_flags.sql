-- Feature flags (TSP-111).
-- DB-backed so flipping a flag needs no deploy. Reads: any authenticated
-- user (flags gate user-facing features). Writes: admin only via RLS.
-- Rollback: supabase/rollbacks/202607140001_feature_flags_down.sql

create table if not exists public.feature_flags (
  key         text        primary key,
  enabled     boolean     not null default false,
  description text        not null default '',
  updated_at  timestamptz not null default now()
);

drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read
  on public.feature_flags
  for select
  to authenticated
  using (true);

drop policy if exists feature_flags_admin_write on public.feature_flags;
create policy feature_flags_admin_write
  on public.feature_flags
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.feature_flags to authenticated;

insert into public.feature_flags (key, enabled, description) values
  ('chat_enabled',        true,  'AI study companion chat (/study/chat)'),
  ('ai_analysis_enabled', true,  'Post-test AI analysis and improvement plans'),
  ('fsrs',                false, 'FSRS scheduler adapter (TSP-064)'),
  ('pos',                 false, 'Probability of Selection engine (TSP-122)'),
  ('peer_insights',       false, 'Peer benchmark insights (TSP-121)'),
  ('vision_ingestion',    false, 'Vision PDF ingestion (TSP-125)'),
  ('flow_adjuster',       false, 'Adaptive flow adjuster')
on conflict (key) do nothing;
