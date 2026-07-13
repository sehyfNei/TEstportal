-- Rollback for 202605310001_test_session_engine.sql
-- First introduction of the session engine RPCs: dropping removes the
-- start/submit capability entirely.
drop function if exists public.submit_test_session(uuid);
drop function if exists public.start_test_session(uuid, text, uuid, uuid, int, int);
drop function if exists public.score_session_answer_correct(text, jsonb, jsonb);
drop function if exists public.build_session_prompt_snapshot(jsonb, text);
