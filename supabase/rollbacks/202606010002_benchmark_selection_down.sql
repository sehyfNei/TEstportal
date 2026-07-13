-- Rollback for 202606010002_benchmark_selection.sql
drop function if exists public.select_benchmark_questions(uuid, int, text, text[], text[]);
-- start_test_session replaced in place: re-apply 202606010001_topic_practice_selection.sql
