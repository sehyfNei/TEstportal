-- Phase 0 auth/profile foundation.
-- Creates user profile and consent storage plus owner-only RLS policies.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  target_exams text[] not null default '{}',
  prep_start_date date,
  daily_study_minutes int,
  preferred_test_days text[] not null default '{}',
  current_streak int not null default 0,
  longest_streak int not null default 0,
  streak_freezes int not null default 0,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1), 'User'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.user_profiles enable row level security;
alter table public.user_consents enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists user_profiles_delete_own on public.user_profiles;
create policy user_profiles_delete_own
on public.user_profiles
for delete
to authenticated
using (id = auth.uid());

drop policy if exists user_consents_select_own on public.user_consents;
create policy user_consents_select_own
on public.user_consents
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_consents_insert_own on public.user_consents;
create policy user_consents_insert_own
on public.user_consents
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists user_consents_update_own on public.user_consents;
create policy user_consents_update_own
on public.user_consents
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_consents_delete_own on public.user_consents;
create policy user_consents_delete_own
on public.user_consents
for delete
to authenticated
using (user_id = auth.uid());

create index if not exists user_profiles_target_exams_idx
on public.user_profiles using gin (target_exams);

create index if not exists user_consents_user_type_idx
on public.user_consents (user_id, consent_type, created_at desc);

