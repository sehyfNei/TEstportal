-- Rollback for 202605310003_exposure_policies.sql
-- start_test_session replaced in place (same 7-arg signature).
drop function if exists public.set_question_exposure_policy(uuid, text);
-- restore previous definition: re-apply 202605310002_quality_tiers.sql
