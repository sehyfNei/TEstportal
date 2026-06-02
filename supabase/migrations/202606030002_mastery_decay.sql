-- TSP-057: nightly forgetting-curve decay for stale mastery records.

create extension if not exists pg_cron;

create or replace function public.apply_mastery_decay()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  update public.mastery_records
  set
    mastery_score = greatest(
      0,
      mastery_score * exp(
        -extract(epoch from (v_now - greatest(updated_at, last_tested_at))) / 86400.0
        / (14.0 * stability_factor)
      )
    ),
    updated_at = v_now
  where
    last_tested_at is not null
    and greatest(updated_at, last_tested_at) < v_now - interval '1 day';
end;
$$;

revoke all on function public.apply_mastery_decay() from public;

do $$
begin
  perform cron.unschedule('decay-mastery-nightly');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'decay-mastery-nightly',
  '0 2 * * *',
  $job$ select public.apply_mastery_decay(); $job$
);
