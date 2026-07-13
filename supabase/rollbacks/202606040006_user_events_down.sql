-- Rollback for 202606040006_user_events.sql
drop index if exists public.user_events_type_time;
drop index if exists public.user_events_user_time;
drop table if exists public.user_events;
