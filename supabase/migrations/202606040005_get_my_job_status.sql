-- Migration to add get_my_job_status security-definer RPC function for TSP-118.
-- Allows authenticated users to query the status of their own jobs by result_id in payload.

create or replace function public.get_my_job_status(
  p_result_id uuid,
  p_job_type  text
)
returns text
language sql
security definer
set search_path = public
as $$
  select status::text
  from   public.jobs
  where  type                  = p_job_type
    and  payload->>'result_id' = p_result_id::text
    and  payload->>'user_id'   = auth.uid()::text
  order  by created_at desc
  limit  1;
$$;

-- Revoke default public execution privileges
revoke all on function public.get_my_job_status(uuid, text) from public;

-- Grant execution privileges to authenticated role
grant execute on function public.get_my_job_status(uuid, text) to authenticated;
