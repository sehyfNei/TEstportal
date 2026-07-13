-- Rollback for 202605310005_diagnostic_selection.sql
drop function if exists public.select_diagnostic_questions(uuid, int, text, text[]);
-- start_test_session replaced in place: re-apply 202605310003_exposure_policies.sql
