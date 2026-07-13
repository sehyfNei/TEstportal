-- Rollback for 202605300002_question_lifecycle.sql
-- update_admin_question / retire_admin_question were REPLACED here; true
-- rollback of those = re-run 202605170001_admin_question_crud.sql afterward.
drop function if exists public.set_question_status(uuid, text, text);
drop index if exists public.question_status_events_actor_created;
drop index if exists public.question_status_events_question_created;
drop table if exists public.question_status_events;
-- then: re-apply 202605170001 to restore prior update/retire definitions
