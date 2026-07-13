-- Rollback for 202607120001_scheduling.sql
drop index if exists public.scheduled_items_user_scheduled_idx;
drop table if exists public.scheduled_items;
