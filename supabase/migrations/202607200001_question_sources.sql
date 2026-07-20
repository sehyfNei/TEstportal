-- TSP-188 source-grounded AI question generation.
-- Admin-curated text sources (past-year papers, articles, notes) that feed
-- the question generator; provenance is recorded on the resulting question
-- via questions.source_id so a reviewer can see what it was grounded in.
-- Rollback:
--   drop function if exists public.create_admin_question(uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text, uuid);
--   (recreate the 17-param version from 202605170001_admin_question_crud.sql)
--   alter table public.questions drop column if exists source_id;
--   drop table if exists public.question_sources;

create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('past_year_paper', 'article', 'other')),
  body_text text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.question_sources enable row level security;

-- Admin-only read/write; students never see sources directly.
drop policy if exists question_sources_admin_all on public.question_sources;
create policy question_sources_admin_all
  on public.question_sources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.questions
  add column if not exists source_id uuid references public.question_sources(id) on delete set null;

-- create_admin_question gains one optional, defaulted parameter so both
-- existing callers (manual entry, bulk import) need no code changes — only
-- grounded generation will ever pass a non-null p_source_id. The old N-arg
-- signature is dropped first so PostgREST never sees two overloads.
drop function if exists public.create_admin_question(
  uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text
);

create or replace function public.create_admin_question(
  p_exam_id uuid,
  p_topic_id uuid,
  p_subtopic_id uuid,
  p_type text,
  p_difficulty text,
  p_source text,
  p_source_year int,
  p_source_reference text,
  p_is_contested boolean,
  p_language text,
  p_status text,
  p_exposure_policy text,
  p_quality_tier text,
  p_content jsonb,
  p_explanation text,
  p_explanation_detail text,
  p_reviewer_notes text,
  p_source_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_version_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin role required';
  end if;

  perform public.assert_question_topic_scope(p_exam_id, p_topic_id, p_subtopic_id);

  if p_source_id is not null and not exists (
    select 1 from public.question_sources where id = p_source_id and exam_id = p_exam_id
  ) then
    raise exception 'source does not belong to selected exam';
  end if;

  insert into public.questions (
    exam_id,
    topic_id,
    subtopic_id,
    type,
    difficulty,
    source,
    source_year,
    source_reference,
    is_contested,
    language,
    status,
    exposure_policy,
    quality_tier,
    created_by,
    source_id
  )
  values (
    p_exam_id,
    p_topic_id,
    p_subtopic_id,
    p_type,
    p_difficulty,
    p_source,
    p_source_year,
    p_source_reference,
    coalesce(p_is_contested, false),
    coalesce(nullif(p_language, ''), 'en'),
    p_status,
    p_exposure_policy,
    p_quality_tier,
    auth.uid(),
    p_source_id
  )
  returning id into v_question_id;

  insert into public.question_versions (
    question_id,
    version,
    content,
    explanation,
    explanation_detail,
    reviewer_notes,
    changed_by
  )
  values (
    v_question_id,
    1,
    p_content,
    p_explanation,
    p_explanation_detail,
    p_reviewer_notes,
    auth.uid()
  )
  returning id into v_version_id;

  update public.questions
  set current_version_id = v_version_id
  where id = v_question_id;

  return jsonb_build_object(
    'question_id', v_question_id,
    'version_id', v_version_id,
    'version', 1
  );
end;
$$;
