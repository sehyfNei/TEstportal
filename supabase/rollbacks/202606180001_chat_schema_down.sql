-- Rollback for 202606180001_chat_schema.sql
drop index if exists public.chat_messages_session_created_idx;
drop index if exists public.chat_sessions_user_created_idx;
drop table if exists public.chat_messages;
drop table if exists public.chat_sessions;
