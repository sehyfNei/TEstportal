-- Rollback for 202606020001_mistake_notebook.sql
drop trigger if exists retest_queue_set_updated_at on public.retest_queue;
drop index if exists public.retest_user_exam;
drop index if exists public.retest_due;
drop index if exists public.mistake_session;
drop index if exists public.mistake_user_exam;
drop index if exists public.mistake_user_status;
drop table if exists public.retest_queue;
drop table if exists public.mistake_items;
