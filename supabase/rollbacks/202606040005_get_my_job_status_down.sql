-- Rollback for 202606040005_get_my_job_status.sql
drop function if exists public.get_my_job_status(uuid, text);
