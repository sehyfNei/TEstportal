-- Migration to add claim_pending_jobs and finalize_job security-definer RPCs for TSP-117.
-- These functions use FOR UPDATE SKIP LOCKED to claim pending/failed jobs safely.

create or replace function public.claim_pending_jobs(
  p_worker_id text,
  p_limit int
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select id
    from public.jobs
    where status in ('pending', 'failed')
      and next_run_at <= now()
      and attempts < max_attempts
    order by next_run_at asc
    limit p_limit
    for update skip locked
  )
  update public.jobs j
  set status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      attempts = j.attempts + 1,
      updated_at = now()
  from claimed
  where j.id = claimed.id
  returning j.*;
end;
$$;

create or replace function public.finalize_job(
  p_job_id uuid,
  p_status text,
  p_next_run_at timestamptz,
  p_error_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
  set status = p_status,
      locked_at = null,
      locked_by = null,
      next_run_at = p_next_run_at,
      error_message = p_error_message,
      updated_at = now()
  where id = p_job_id;
end;
$$;

-- Revoke default public execution privileges
revoke all on function public.claim_pending_jobs(text, int) from public;
revoke all on function public.finalize_job(uuid, text, timestamptz, text) from public;

-- Grant execution privileges to authenticated role
grant execute on function public.claim_pending_jobs(text, int) to authenticated;
grant execute on function public.finalize_job(uuid, text, timestamptz, text) to authenticated;
