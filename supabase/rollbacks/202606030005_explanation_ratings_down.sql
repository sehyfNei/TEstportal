-- Rollback for 202606030005_explanation_ratings.sql
drop index if exists public.explanation_ratings_down;
drop index if exists public.explanation_ratings_result;
drop table if exists public.explanation_ratings;
