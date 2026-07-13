-- Rollback for 202606050002_resolve_flags_for_question.sql
drop function if exists public.resolve_flags_for_question(uuid, text, text);
