-- Rollback for 202606030004_ai_analyses.sql
drop index if exists public.ai_analyses_status;
drop index if exists public.ai_analyses_user_created;
drop table if exists public.ai_analyses;
