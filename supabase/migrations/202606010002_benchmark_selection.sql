-- TSP-038 gold-priority benchmark and mock selection.

create or replace function public.select_benchmark_questions(
  p_exam_id uuid,
  p_count int,
  p_min_quality_tier text,
  p_exposure_policies text[],
  p_fixed_question_ids text[] default null
)
returns table (
  question_id uuid,
  current_version_id uuid,
  q_type text,
  content jsonb
)
language sql
security definer
set search_path = public
as $$
  with fixed_picks as (
    select
      q.id as question_id,
      q.current_version_id,
      q.type as q_type,
      qv.content
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where p_fixed_question_ids is not null
      and q.id::text = any(p_fixed_question_ids)
      and q.exam_id = p_exam_id
      and q.status = 'live'
      and q.exposure_policy = any(coalesce(p_exposure_policies, array['practice', 'benchmark_reserved']))
      and q.quality_tier <> 'quarantine'
    order by random()
    limit greatest(coalesce(p_count, 0), 0)
  ),
  priority_picks as (
    select
      q.id as question_id,
      q.current_version_id,
      q.type as q_type,
      qv.content
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where p_fixed_question_ids is null
      and q.exam_id = p_exam_id
      and q.status = 'live'
      and q.exposure_policy = any(coalesce(p_exposure_policies, array['practice', 'benchmark_reserved']))
      and q.quality_tier <> 'quarantine'
      and case p_min_quality_tier
        when 'gold' then q.quality_tier = 'gold'
        when 'silver' then q.quality_tier in ('gold', 'silver')
        else true
      end
    order by
      case q.quality_tier when 'gold' then 1 when 'silver' then 2 else 3 end,
      random()
    limit greatest(coalesce(p_count, 0), 0)
  )
  select * from fixed_picks
  union all
  select * from priority_picks
  limit greatest(coalesce(p_count, 0), 0)
$$;

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
  v_exposure_policies text[];
  v_fixed_qids text[] := null;
  v_marks_per_correct numeric := 2.0;
  v_negative_marking_fraction numeric := 0.33;
  v_marking_source text := 'default_upsc';
  v_marking jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_sequence int := 0;
  v_session_question_id uuid;
  v_selection_mode text;
  v_question record;
begin
  if v_user_id is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  if p_type not in ('diagnostic','topic','concept_retest','sectional','mock','benchmark','custom') then
    raise exception 'invalid test session type: %', p_type;
  end if;

  v_exposure_policies := case p_type
    when 'diagnostic' then array['practice', 'diagnostic_reserved']
    when 'benchmark' then array['practice', 'benchmark_reserved']
    when 'mock' then array['practice', 'benchmark_reserved']
    else array['practice']
  end;

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

  if p_type in ('benchmark', 'mock') and p_template_id is not null then
    select
      case
        when (selection_mode = 'fixed' or config ->> 'selectionMode' = 'fixed')
          and jsonb_typeof(config -> 'questionIds') = 'array'
        then array(
          select value::text
          from jsonb_array_elements_text(config -> 'questionIds') as question_id(value)
        )
        else null
      end
    into v_fixed_qids
    from public.test_templates
    where id = p_template_id;
  end if;

  v_selection_mode := case p_type
    when 'diagnostic' then 'diagnostic_weighted'
    when 'topic' then 'topic_practice_balanced'
    when 'benchmark' then case
      when v_fixed_qids is not null then 'benchmark_fixed_template'
      else 'benchmark_gold_priority'
    end
    when 'mock' then case
      when v_fixed_qids is not null then 'benchmark_fixed_template'
      else 'benchmark_gold_priority'
    end
    else 'minimal_live_filter'
  end;

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
        'mode', v_selection_mode,
        'requestedCount', v_count,
        'topicId', p_topic_id,
        'minQualityTier', v_min_quality_tier,
        'exposurePolicies', to_jsonb(v_exposure_policies)
      )
    )
  )
  returning id into v_session_id;

  if p_type = 'diagnostic' then
    for v_question in
      select *
      from public.select_diagnostic_questions(
        p_exam_id,
        v_count,
        v_min_quality_tier,
        v_exposure_policies
      )
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
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence,
        'diagnostic_weighted'
      )
      returning id into v_session_question_id;

      v_questions := v_questions || jsonb_build_array(
        jsonb_build_object(
          'session_question_id', v_session_question_id,
          'question_id', v_question.question_id,
          'sequence', v_sequence,
          'prompt_snapshot', public.build_session_prompt_snapshot(v_question.content, v_question.q_type)
        )
      );
    end loop;

    if v_sequence = 0 then
      v_selection_mode := 'diagnostic_random_fallback';

      update public.test_sessions
      set metadata = jsonb_set(metadata, '{selection,mode}', to_jsonb(v_selection_mode), true)
      where id = v_session_id;

      for v_question in
        select
          q.id as question_id,
          q.current_version_id,
          q.type as q_type,
          qv.content
        from public.questions q
        join public.question_versions qv on qv.id = q.current_version_id
        where q.exam_id = p_exam_id
          and q.status in ('approved', 'live')
          and q.exposure_policy = any(v_exposure_policies)
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
          public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
          v_sequence,
          v_selection_mode
        )
        returning id into v_session_question_id;

        v_questions := v_questions || jsonb_build_array(
          jsonb_build_object(
            'session_question_id', v_session_question_id,
            'question_id', v_question.question_id,
            'sequence', v_sequence,
            'prompt_snapshot', public.build_session_prompt_snapshot(v_question.content, v_question.q_type)
          )
        );
      end loop;
    end if;
  elsif p_type = 'topic' then
    for v_question in
      select *
      from public.select_topic_practice_questions(
        v_user_id,
        p_exam_id,
        p_topic_id,
        v_count,
        v_min_quality_tier,
        v_exposure_policies
      )
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
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence,
        'topic_practice_balanced'
      )
      returning id into v_session_question_id;

      v_questions := v_questions || jsonb_build_array(
        jsonb_build_object(
          'session_question_id', v_session_question_id,
          'question_id', v_question.question_id,
          'sequence', v_sequence,
          'prompt_snapshot', public.build_session_prompt_snapshot(v_question.content, v_question.q_type)
        )
      );
    end loop;
  elsif p_type in ('benchmark', 'mock') then
    for v_question in
      select *
      from public.select_benchmark_questions(
        p_exam_id,
        v_count,
        v_min_quality_tier,
        v_exposure_policies,
        v_fixed_qids
      )
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
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence,
        v_selection_mode
      )
      returning id into v_session_question_id;

      v_questions := v_questions || jsonb_build_array(
        jsonb_build_object(
          'session_question_id', v_session_question_id,
          'question_id', v_question.question_id,
          'sequence', v_sequence,
          'prompt_snapshot', public.build_session_prompt_snapshot(v_question.content, v_question.q_type)
        )
      );
    end loop;
  else
    for v_question in
      select
        q.id as question_id,
        q.current_version_id,
        q.type as q_type,
        qv.content
      from public.questions q
      join public.question_versions qv on qv.id = q.current_version_id
      where q.exam_id = p_exam_id
        and q.status = 'live'
        and q.exposure_policy = any(v_exposure_policies)
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
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence,
        v_selection_mode
      )
      returning id into v_session_question_id;

      v_questions := v_questions || jsonb_build_array(
        jsonb_build_object(
          'session_question_id', v_session_question_id,
          'question_id', v_question.question_id,
          'sequence', v_sequence,
          'prompt_snapshot', public.build_session_prompt_snapshot(v_question.content, v_question.q_type)
        )
      );
    end loop;
  end if;

  if v_sequence = 0 then
    raise exception 'no eligible live questions found for this selection';
  end if;

  return jsonb_build_object(
    'session_id', v_session_id,
    'expires_at', v_expires_at,
    'questions', v_questions
  );
end;
$$;

revoke all on function public.select_benchmark_questions(uuid, int, text, text[], text[]) from public;
revoke all on function public.start_test_session(uuid, text, uuid, uuid, int, int, text) from public;

grant execute on function public.start_test_session(uuid, text, uuid, uuid, int, int, text) to authenticated;
