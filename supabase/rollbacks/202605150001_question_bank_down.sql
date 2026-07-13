-- Rollback for 202605150001_question_bank.sql
-- Drops the entire question bank. Take a backup first (docs/ops/BACKUP_RESTORE.md).
drop trigger if exists question_stats_set_updated_at on public.question_stats;
drop trigger if exists questions_set_updated_at on public.questions;
drop table if exists public.question_stats;
drop table if exists public.question_flags;
drop table if exists public.question_concepts;
drop table if exists public.question_versions;
drop table if exists public.questions;
