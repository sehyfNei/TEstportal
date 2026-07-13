-- Rollback for 202605310004_admin_search.sql
drop function if exists public.search_admin_questions(text, uuid, uuid, text, text, text, text, text, int, int);
