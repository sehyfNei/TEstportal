-- TSP-029 quality tiers: admin assignment plus start-session minimum tier filtering.

create or replace function public.set_question_quality_tier(
  p_question_id uuid,
  p_tier text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_tier text;
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  if p_tier not in ('gold','silver','bronze','quarantine') then
    raise exception 'invalid quality tier: %', p_tier using errcode = '22023';
  end if;

  select quality_tier
  into v_old_tier
  from public.questions
  where id = p_question_id
  for update;

  if not found then
    raise exception 'question not found';
  end if;

  update public.questions
  set quality_tier = p_tier
  where id = p_question_id;

  insert into public.question_stats (question_id, quality_tier)
  values (p_question_id, p_tier)
  on conflict (question_id) do update
  set quality_tier = excluded.quality_tier;

  return jsonb_build_object(
    'question_id', p_question_id,
    'old_tier', v_old_tier,
    'new_tier', p_tier,
    'changed', v_old_tier is distinct from p_tier
  );
end;
$$;

drop function if exists public.start_test_session(uuid, text, uuid, uuid, int, int);

create or replace function public.start_test_session(
  p_exam_id uuid,
  p_type text,
  p_template_id uuid default null,
  p_topic_id uuid default null,
  p_count int default 10,
  p_duration_minutes int default null,
  p_min_quality_tier text default 'bronze'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_expires_at timestamptz;
  v_count int := least(greatest(coalesce(p_count, 10), 1), 100);
  v_duration_minutes int := p_duration_minutes;
  v_min_quality_tier text := case
    when p_min_quality_tier in ('gold','silver','bronze','quarantine') then p_min_quality_tier
    else 'bronze'
  end;
  v_marks_per_correct numeric := 2.0;
  v_negative_marking_fraction numeric := 0.33;
  v_marking_source text := 'default_upsc';
  v_marking jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_sequence int := 0;
  v_session_question_id uuid;
  v_question record;
begin
  if v_user_id is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  if p_type not in ('diagnostic','topic','concept_retest','sectional','mock','benchmark','custom') then
    raise exception 'invalid test session type: %', p_type;
  end if;

  if not exists (select 1 from public.exams where id = p_exam_id and is_active = true) then
    raise exception 'exam not found or inactive';
  end if;

  if p_template_id is not null and not exists (
    select 1
    from public.test_templates
    where id = p_template_id
      and exam_id = p_exam_id
      and is_active = true
  ) then
    raise exception 'test template not found or inactive';
  end if;

  select manifest -> 'marking'
  into v_marking
  from public.exam_manifests
  where exam_id = p_exam_id
    and is_active = true
  order by version desc
  limit 1;

  if v_marking is not null and jsonb_typeof(v_marking) = 'object' then
    if (v_marking ->> 'marksPerCorrect') ~ '^[0-9]+(\.[0-9]+)?$' then
      v_marks_per_correct := (v_marking ->> 'marksPerCorrect')::numeric;
      v_marking_source := 'exam_manifest';
    end if;

    if (v_marking ->> 'negativeMarkingFraction') ~ '^[0-9]+(\.[0-9]+)?$' then
      v_negative_marking_fraction := (v_marking ->> 'negativeMarkingFraction')::numeric;
      v_marking_source := 'exam_manifest';
    end if;

    if v_duration_minutes is null
      and (v_marking ->> 'durationMinutes') ~ '^[0-9]+$'
    then
      v_duration_minutes := (v_marking ->> 'durationMinutes')::int;
    end if;
  end if;

  v_duration_minutes := coalesce(v_duration_minutes, 120);
  v_expires_at := now() + make_interval(mins => v_duration_minutes);

  insert into public.test_sessions (
    template_id,
    user_id,
    exam_id,
    type,
    status,
    started_at,
    expires_at,
    duration_minutes,
    metadata
  )
  values (
    p_template_id,
    v_user_id,
    p_exam_id,
    p_type,
    'in_progress',
    now(),
    v_expires_at,
    v_duration_minutes,
    jsonb_build_object(
      'markingRule',
      jsonb_build_object(
        'marksPerCorrect', v_marks_per_correct,
        'negativeMarkingFraction', v_negative_marking_fraction,
        'source', v_marking_source
      ),
      'selection',
      jsonb_build_object(
        'mode', 'minimal_live_filter',
        'requestedCount', v_count,
        'topicId', p_topic_id,
        'minQualityTier', v_min_quality_tier
      )
    )
  )
  returning id into v_session_id;

  for v_question in
    select
      q.id as question_id,
      q.current_version_id,
      q.type,
      qv.content
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where q.exam_id = p_exam_id
      and q.status = 'live'
      and q.exposure_policy = 'practice'
      and q.quality_tier <> 'quarantine'
      and case v_min_quality_tier
        when 'gold' then q.quality_tier = 'gold'
        when 'silver' then q.quality_tier in ('gold', 'silver')
        else true
      end
      and (p_topic_id is null or q.topic_id = p_topic_id or q.subtopic_id = p_topic_id)
    order by random()
    limit v_count
  loop
    v_sequence := v_sequence + 1;

    insert into public.session_questions (
      session_id,
      question_id,
      question_version_id,
      prompt_snapshot,
      sequence,
      selected_by_reason
    )
    values (
      v_session_id,
      v_question.question_id,
      v_question.current_version_id,
      public.build_session_prompt_snapshot(v_question.content, v_question.type),
      v_sequence,
      'minimal_live_filter'
    )
    returning id into v_session_question_id;

    v_questions := v_questions || jsonb_build_array(
      jsonb_build_object(
        'session_question_id', v_session_question_id,
        'question_id', v_question.question_id,
        'sequence', v_sequence,
        'prompt_snapshot', public.build_session_prompt_snapshot(v_question.content, v_question.type)
      )
    );
  end loop;

  if v_sequence = 0 then
    raise exception 'no live practice questions found for this selection';
  end if;

  return jsonb_build_object(
    'session_id', v_session_id,
    'expires_at', v_expires_at,
    'questions', v_questions
  );
end;
$$;

revoke all on function public.set_question_quality_tier(uuid, text) from public;
revoke all on function public.start_test_session(uuid, text, uuid, uuid, int, int, text) from public;

grant execute on function public.set_question_quality_tier(uuid, text) to authenticated;
grant execute on function public.start_test_session(uuid, text, uuid, uuid, int, int, text) to authenticated;
