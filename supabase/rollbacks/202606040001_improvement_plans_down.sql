-- Rollback for 202606040001_improvement_plans.sql
drop index if exists public.improvement_plans_status;
drop index if exists public.improvement_plans_user_exam_created;
drop table if exists public.improvement_plans;
