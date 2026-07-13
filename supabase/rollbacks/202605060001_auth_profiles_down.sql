-- Rollback for 202605060001_auth_profiles.sql
-- WARNING: set_updated_at() is reused by nearly every later migration's
-- triggers. Only run this down script if ALL later migrations are already
-- rolled back.
drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists public.handle_new_user_profile();
drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
drop table if exists public.user_consents;
drop table if exists public.user_profiles;
drop function if exists public.set_updated_at();
