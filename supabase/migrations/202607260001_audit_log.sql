-- TSP-094: general-purpose audit log for admin/sensitive actions (FINAL_TRD
-- Section 21.10). Append-only, same table shape as user_events (TSP-096),
-- but admin-only in both directions rather than owner-or-admin - audit
-- entries are not something any authenticated user should read or write.
-- Rollback:
--   drop table if exists public.audit_log;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at on public.audit_log (created_at desc);
create index if not exists audit_log_actor on public.audit_log (actor_id, created_at desc);
create index if not exists audit_log_action on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;

-- No update/delete policy at all, on purpose - once written, an audit entry
-- is immutable (same precedent as user_events' "no UPDATE/DELETE by design").
drop policy if exists audit_log_admin_insert on public.audit_log;
create policy audit_log_admin_insert
on public.audit_log for insert
to authenticated
with check (public.is_admin());

drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select
on public.audit_log for select
to authenticated
using (public.is_admin());
