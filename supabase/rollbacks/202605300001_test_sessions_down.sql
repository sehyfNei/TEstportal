-- Rollback for 202605300001_test_sessions.sql
-- Drops all session/answer/result data. Take a backup first.
drop trigger if exists test_sessions_set_updated_at on public.test_sessions;
drop trigger if exists test_templates_set_updated_at on public.test_templates;
drop table if exists public.session_results;
drop table if exists public.session_answers;
drop table if exists public.session_questions;
drop table if exists public.test_sessions;
drop table if exists public.test_templates;
