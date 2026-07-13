-- Rollback for 202605170001_admin_question_crud.sql
drop function if exists public.retire_admin_question(uuid);
drop function if exists public.update_admin_question(uuid, uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text);
drop function if exists public.create_admin_question(uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text);
drop function if exists public.assert_question_topic_scope(uuid, uuid, uuid);
