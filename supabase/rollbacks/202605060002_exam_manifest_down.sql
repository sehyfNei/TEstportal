-- Rollback for 202605060002_exam_manifest.sql
-- WARNING: is_admin() is referenced by RLS policies in most later migrations.
-- Only run if later migrations are already rolled back.
drop table if exists public.historical_cutoffs;
drop table if exists public.concepts;
drop table if exists public.concept_clusters;
drop table if exists public.topics;
drop table if exists public.exam_manifests;
drop trigger if exists exams_set_updated_at on public.exams;
drop table if exists public.exams;
drop function if exists public.is_admin();
