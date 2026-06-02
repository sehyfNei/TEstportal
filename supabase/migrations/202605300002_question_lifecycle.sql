-- TSP-027/TSP-159 question lifecycle enforcement and status audit trail.
-- Content edits no longer mutate lifecycle state; status changes flow through set_question_status.

create table if not exists public.question_status_events (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  from_status text not null check (from_status in (
    'draft','validated','reviewed','approved','live','flagged','retired'
  )),
  to_status text not null check (to_status in (
    'draft','validated','reviewed','approved','live','flagged','retired'
  )),
  actor uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

alter table public.question_status_events enable row level security;

drop policy if exists question_status_events_admin_read on public.question_status_events;
create policy question_status_events_admin_read
on public.question_status_events
for select
to authenticated
using (public.is_admin());

create index if not exists question_status_events_question_created
on public.question_status_events (question_id, created_at desc);

create index if not exists question_status_events_actor_created
on public.question_status_events (actor, created_at desc);

create or replace function public.set_question_status(
  p_question_id uuid,
  p_to_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_status text;
  v_changed boolean := true;
begin
  if not public.is_admin() then
    raise exception 'admin role required';
  end if;

  if p_to_status not in (
    'draft','validated','reviewed','approved','live','flagged','retired'
  ) then
    raise exception 'invalid question status: %', p_to_status;
  end if;

  select status
  into v_from_status
  from public.questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'question not found';
  end if;

  if v_from_status = p_to_status then
    v_changed := false;
  elsif not (
    (v_from_status = 'draft' and p_to_status in ('validated','reviewed','approved','live','retired'))
    or (v_from_status = 'validated' and p_to_status in ('draft','reviewed','approved','live','retired'))
    or (v_from_status = 'reviewed' and p_to_status in ('draft','validated','approved','live','retired'))
    or (v_from_status = 'approved' and p_to_status in ('draft','validated','reviewed','live','retired'))
    or (v_from_status = 'live' and p_to_status in ('draft','flagged','retired'))
    or (v_from_status = 'flagged' and p_to_status in ('live','draft','retired'))
    or (v_from_status = 'retired' and p_to_status = 'draft')
  ) then
    raise exception 'invalid question status transition from % to %', v_from_status, p_to_status;
  end if;

  if v_changed then
    insert into public.question_status_events (
      question_id,
      from_status,
      to_status,
      actor,
      note
    )
    values (
      p_question_id,
      v_from_status,
      p_to_status,
      auth.uid(),
      nullif(p_note, '')
    );

    update public.questions
    set
      status = p_to_status,
      approved_by = case when p_to_status = 'approved' then auth.uid() else approved_by end,
      approved_at = case when p_to_status = 'approved' then now() else approved_at end,
      updated_at = now()
    where id = p_question_id;
  end if;

  return jsonb_build_object(
    'question_id', p_question_id,
    'from_status', v_from_status,
    'to_status', p_to_status,
    'status', p_to_status,
    'changed', v_changed
  );
end;
$$;

create or replace function public.update_admin_question(
  p_question_id uuid,
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
  p_reviewer_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
  v_version_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin role required';
  end if;

  perform public.assert_question_topic_scope(p_exam_id, p_topic_id, p_subtopic_id);

  if not exists (
    select 1 from public.questions where id = p_question_id for update
  ) then
    raise exception 'question not found';
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.question_versions
  where question_id = p_question_id;

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
    p_question_id,
    v_version,
    p_content,
    p_explanation,
    p_explanation_detail,
    p_reviewer_notes,
    auth.uid()
  )
  returning id into v_version_id;

  update public.questions
  set
    exam_id = p_exam_id,
    topic_id = p_topic_id,
    subtopic_id = p_subtopic_id,
    type = p_type,
    difficulty = p_difficulty,
    source = p_source,
    source_year = p_source_year,
    source_reference = p_source_reference,
    is_contested = coalesce(p_is_contested, false),
    language = coalesce(nullif(p_language, ''), 'en'),
    exposure_policy = p_exposure_policy,
    quality_tier = p_quality_tier,
    current_version_id = v_version_id
  where id = p_question_id;

  return jsonb_build_object(
    'question_id', p_question_id,
    'version_id', v_version_id,
    'version', v_version
  );
end;
$$;

create or replace function public.retire_admin_question(p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.set_question_status(p_question_id, 'retired', 'Retired from legacy admin action.');
end;
$$;

revoke all on function public.set_question_status(uuid, text, text) from public;
revoke all on function public.update_admin_question(uuid, uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text) from public;
revoke all on function public.retire_admin_question(uuid) from public;

grant execute on function public.set_question_status(uuid, text, text) to authenticated;
grant execute on function public.update_admin_question(uuid, uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text) to authenticated;
grant execute on function public.retire_admin_question(uuid) to authenticated;
