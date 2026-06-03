create table if not exists public.llm_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  provider text not null,
  model_name text not null,
  prompt_version text,
  input_hash text,
  output_schema_version text,
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cost_usd numeric not null default 0 check (cost_usd >= 0),
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  status text not null default 'completed' check (status in ('completed', 'failed', 'disabled')),
  error_message text,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists llm_cost_ledger_user_created
  on public.llm_cost_ledger (user_id, created_at desc);

create index if not exists llm_cost_ledger_feature_created
  on public.llm_cost_ledger (feature, created_at desc);

create index if not exists llm_cost_ledger_daily_cost
  on public.llm_cost_ledger (created_at);

alter table public.llm_cost_ledger enable row level security;

drop policy if exists llm_cost_ledger_select on public.llm_cost_ledger;
create policy llm_cost_ledger_select
  on public.llm_cost_ledger
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists llm_cost_ledger_insert on public.llm_cost_ledger;
create policy llm_cost_ledger_insert
  on public.llm_cost_ledger
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

grant select, insert on public.llm_cost_ledger to authenticated;
