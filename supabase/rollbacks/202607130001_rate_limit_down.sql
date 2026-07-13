-- Rollback for 202607130001_rate_limit.sql
drop function if exists public.consume_rate_limit(text, int, int);
drop table if exists public.rate_limit_counters;
