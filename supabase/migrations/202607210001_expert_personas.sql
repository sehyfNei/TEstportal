-- TSP-190 expert persona registry (AI Subject Experts epic, TSP-189).
-- Foundation only: schema + admin CRUD so a persona exists as well-formed,
-- addressable data. Chat routing (TSP-191) and any recurring generation job
-- driven by generation_cadence are future work, not built here.
-- Rollback:
--   drop table if exists public.expert_persona_sources;
--   drop table if exists public.expert_personas;

create table if not exists public.expert_personas (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  name text not null,
  system_prompt text not null,
  generation_cadence text not null default 'manual' check (
    generation_cadence in ('manual', 'daily', 'weekly')
  ),
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TSP-189: "one AI expert persona per subject/topic" — at most one ACTIVE
-- persona per topic; an admin can still keep an inactive draft around
-- before explicitly swapping it in.
create unique index if not exists expert_personas_one_active_per_topic
  on public.expert_personas (topic_id)
  where is_active;

drop trigger if exists expert_personas_set_updated_at on public.expert_personas;
create trigger expert_personas_set_updated_at
before update on public.expert_personas
for each row execute function public.set_updated_at();

alter table public.expert_personas enable row level security;

-- Students need to read active personas so a future chat feature (TSP-191)
-- can address them under the student's own authenticated session, same
-- read/admin-write split already used for exams/topics.
drop policy if exists expert_personas_read_active on public.expert_personas;
create policy expert_personas_read_active
  on public.expert_personas for select
  to authenticated
  using (is_active = true or public.is_admin());

drop policy if exists expert_personas_admin_all on public.expert_personas;
create policy expert_personas_admin_all
  on public.expert_personas for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.expert_persona_sources (
  persona_id uuid not null references public.expert_personas(id) on delete cascade,
  source_id uuid not null references public.question_sources(id) on delete cascade,
  primary key (persona_id, source_id)
);

alter table public.expert_persona_sources enable row level security;

-- Admin-only: which sources ground a persona is a content-authoring detail,
-- not something a student's chat session needs to read directly.
drop policy if exists expert_persona_sources_admin_all on public.expert_persona_sources;
create policy expert_persona_sources_admin_all
  on public.expert_persona_sources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
