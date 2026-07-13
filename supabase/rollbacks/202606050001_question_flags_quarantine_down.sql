-- Rollback for 202606050001_question_flags_quarantine.sql
drop function if exists public.resolve_question_flag(uuid, text, text);
drop function if exists public.submit_question_flag(uuid, text, text);
drop index if exists public.question_flags_one_open_per_user;
