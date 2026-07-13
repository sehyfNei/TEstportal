-- Rollback for 202606010001_topic_practice_selection.sql
drop function if exists public.select_topic_practice_questions(uuid, uuid, uuid, int, text, text[]);
-- start_test_session replaced in place: re-apply 202605310005_diagnostic_selection.sql
