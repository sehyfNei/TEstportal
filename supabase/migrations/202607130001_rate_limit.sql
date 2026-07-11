-- Rate limiting (TSP-104).
-- DB-backed fixed-window counter: rate_limit_counters table + consume_rate_limit RPC.
-- Callers never touch the table directly — the security-definer RPC owns all reads/writes,
-- so RLS is enabled with no policies. No external services (Upstash etc. are founder-gated).
-- Rollback: drop function if exists public.consume_rate_limit(text, int, int);
--           drop table if exists public.rate_limit_counters;

create table if not exists public.rate_limit_counters (
  key               text        primary key,
  window_started_at timestamptz not null default now(),
  count             int         not null default 0
);

alter table public.rate_limit_counters enable row level security;
-- No policies on purpose: only the security-definer RPC below may read or write.

create or replace function public.consume_rate_limit(
  p_key            text,
  p_limit          int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now     timestamptz := now();
  v_allowed boolean;
begin
  if p_key is null or length(p_key) = 0 or p_limit is null or p_limit <= 0
     or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'consume_rate_limit: invalid arguments';
  end if;

  insert into public.rate_limit_counters as c (key, window_started_at, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set window_started_at = case
          when c.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then v_now
          else c.window_started_at
        end,
        count = case
          when c.window_started_at <= v_now - make_interval(secs => p_window_seconds)
          then 1
          else c.count + 1
        end
  returning count <= p_limit into v_allowed;

  return v_allowed;
end;
$$;

-- Revoke default public execution privileges; anon must not be able to spin counters.
revoke all on function public.consume_rate_limit(text, int, int) from public;
revoke all on function public.consume_rate_limit(text, int, int) from anon;

grant execute on function public.consume_rate_limit(text, int, int) to authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
