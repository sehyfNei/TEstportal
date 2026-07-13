-- Rollback for 202605310002_quality_tiers.sql
-- start_test_session was replaced with a 7-arg version (adds p_min_quality_tier)
-- and the 6-arg version dropped. True rollback: drop the 7-arg version and
-- re-run 202605310001_test_session_engine.sql to restore the 6-arg one.
drop function if exists public.set_question_quality_tier(uuid, text);
drop function if exists public.start_test_session(uuid, text, uuid, uuid, int, int, text);
-- then: re-apply 202605310001 to restore start_test_session(6 args)
