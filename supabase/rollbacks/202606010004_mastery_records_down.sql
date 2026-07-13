-- Rollback for 202606010004_mastery_records.sql
-- NOTE: 202606070001 later replaced the two partial unique indexes with full
-- constraints; if that migration is applied, roll it back first.
drop index if exists public.mastery_last_tested;
drop index if exists public.mastery_concept_query;
drop index if exists public.mastery_topic_query;
drop index if exists public.mastery_user_exam;
drop index if exists public.mastery_records_user_exam_concept_unique;
drop index if exists public.mastery_records_user_exam_topic_unique;
drop table if exists public.mastery_records;
