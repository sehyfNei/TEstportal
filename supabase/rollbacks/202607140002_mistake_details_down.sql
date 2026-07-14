-- Rollback for 202607140002_mistake_details.sql
-- UI degrades gracefully: fetchMistakeDetails never throws; rows simply lose
-- the answer/explanation expander.
drop function if exists public.get_mistake_details(uuid[]);
