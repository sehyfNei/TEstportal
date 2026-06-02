-- TSP-024 admin question CRUD helpers.
-- Keeps question metadata and version pointer updates transactional.

create or replace function public.assert_question_topic_scope(
  p_exam_id uuid,
  p_topic_id uuid,
  p_subtopic_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin role required';
  end if;

  if not exists (
    select 1 from public.topics where id = p_topic_id and exam_id = p_exam_id
  ) then
    raise exception 'topic does not belong to selected exam';
  end if;

  if p_subtopic_id is not null and not exists (
    select 1 from public.topics where id = p_subtopic_id and exam_id = p_exam_id
  ) then
    raise exception 'subtopic does not belong to selected exam';
  end if;
end;
$$;

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
  p_reviewer_notes text
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
    created_by
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
    auth.uid()
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
    status = p_status,
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
  if not public.is_admin() then
    raise exception 'admin role required';
  end if;

  update public.questions
  set status = 'retired'
  where id = p_question_id;

  if not found then
    raise exception 'question not found';
  end if;

  return jsonb_build_object(
    'question_id', p_question_id,
    'status', 'retired'
  );
end;
$$;

revoke all on function public.assert_question_topic_scope(uuid, uuid, uuid) from public;
revoke all on function public.create_admin_question(uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text) from public;
revoke all on function public.update_admin_question(uuid, uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text) from public;
revoke all on function public.retire_admin_question(uuid) from public;

grant execute on function public.assert_question_topic_scope(uuid, uuid, uuid) to authenticated;
grant execute on function public.create_admin_question(uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text) to authenticated;
grant execute on function public.update_admin_question(uuid, uuid, uuid, uuid, text, text, text, int, text, boolean, text, text, text, text, jsonb, text, text, text) to authenticated;
grant execute on function public.retire_admin_question(uuid) to authenticated;
