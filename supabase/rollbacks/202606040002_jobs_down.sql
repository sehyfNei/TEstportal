-- Rollback for 202606040002_jobs.sql
-- Roll back 202606040003/0004/0005 (job RPCs) first — they depend on this table.
drop trigger if exists jobs_set_updated_at on public.jobs;
drop index if exists public.jobs_next_run;
drop table if exists public.jobs;
