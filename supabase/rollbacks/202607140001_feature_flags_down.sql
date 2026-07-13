-- Rollback for 202607140001_feature_flags.sql
-- Code fail-open: isFeatureEnabled falls back to FEATURE_FLAG_DEFAULTS when
-- the table is missing, so dropping is safe for the app.
drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
drop table if exists public.feature_flags;
