-- Rollback for 202605060003_import_exam_manifest.sql
drop function if exists public.import_exam_manifest(jsonb, jsonb);
