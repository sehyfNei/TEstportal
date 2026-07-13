-- Rollback for 202606040003_job_runner.sql
drop function if exists public.finalize_job(uuid, text, timestamptz, text);
drop function if exists public.claim_pending_jobs(text, int);
