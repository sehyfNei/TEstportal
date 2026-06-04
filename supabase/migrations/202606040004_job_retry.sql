-- Migration to add retry_job security-definer RPC function for TSP-093.
-- Allows admins to retry failed/dead jobs by resetting attempts, locks, and status.

create or replace function public.retry_job(
  p_job_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.jobs
  set status = 'pending',
      locked_at = null,
      locked_by = null,
      error_message = null,
      attempts = 0,
      next_run_at = now(),
      updated_at = now()
  where id = p_job_id
    and status in ('failed', 'dead');
$$;

-- Revoke default public execution privileges
revoke all on function public.retry_job(uuid) from public;

-- Grant execution privileges to authenticated role
grant execute on function public.retry_job(uuid) to authenticated;
