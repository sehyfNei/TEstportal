-- Rollback for 202606040004_job_retry.sql
drop function if exists public.retry_job(uuid);
