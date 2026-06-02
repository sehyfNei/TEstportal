-- TSP-039/TSP-041 test session start and submit RPCs.
-- Prompt snapshots use an allowlist. Keep this logic in sync with
-- src/lib/test-session/prompt-snapshot.ts; this SQL is the security boundary.

create or replace function public.build_session_prompt_snapshot(
  p_content jsonb,
  p_type text
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_content jsonb := coalesce(p_content, '{}'::jsonb);
  v_snapshot jsonb := jsonb_build_object('type', p_type);
begin
  if jsonb_typeof(v_content) <> 'object' then
    return v_snapshot;
  end if;

  if jsonb_typeof(v_content -> 'text') = 'string' then
    v_snapshot := v_snapshot || jsonb_build_object('text', v_content -> 'text');
  end if;

  if jsonb_typeof(v_content -> 'stem') = 'string' then
    v_snapshot := v_snapshot || jsonb_build_object('stem', v_content -> 'stem');
  end if;

  if jsonb_typeof(v_content -> 'images') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(v_content -> 'images') as item(value)
      where jsonb_typeof(item.value) <> 'string'
    )
  then
    v_snapshot := v_snapshot || jsonb_build_object('images', v_content -> 'images');
  end if;

  if p_type in ('mcq', 'msq')
    and jsonb_typeof(v_content -> 'options') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(v_content -> 'options') as item(value)
      where jsonb_typeof(item.value) <> 'string'
    )
  then
    v_snapshot := v_snapshot || jsonb_build_object('options', v_content -> 'options');
  end if;

  if p_type = 'statement'
    and jsonb_typeof(v_content -> 'statements') = 'array'
    and not exists (
      select 1 from jsonb_array_elements(v_content -> 'statements') as item(value)
      where jsonb_typeof(item.value) <> 'string'
    )
  then
    v_snapshot := v_snapshot || jsonb_build_object('statements', v_content -> 'statements');
  end if;

  if p_type = 'assertion' then
    if jsonb_typeof(v_content -> 'assertion') = 'string' then
      v_snapshot := v_snapshot || jsonb_build_object('assertion', v_content -> 'assertion');
    end if;

    if jsonb_typeof(v_content -> 'reason') = 'string' then
      v_snapshot := v_snapshot || jsonb_build_object('reason', v_content -> 'reason');
    end if;
  end if;

  if p_type = 'match' then
    if jsonb_typeof(v_content -> 'left') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(v_content -> 'left') as item(value)
        where jsonb_typeof(item.value) <> 'string'
      )
    then
      v_snapshot := v_snapshot || jsonb_build_object('left', v_content -> 'left');
    end if;

    if jsonb_typeof(v_content -> 'right') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(v_content -> 'right') as item(value)
        where jsonb_typeof(item.value) <> 'string'
      )
    then
      v_snapshot := v_snapshot || jsonb_build_object('right', v_content -> 'right');
    end if;

    if jsonb_typeof(v_content -> 'leftColumn') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(v_content -> 'leftColumn') as item(value)
        where jsonb_typeof(item.value) <> 'string'
      )
    then
      v_snapshot := v_snapshot || jsonb_build_object('leftColumn', v_content -> 'leftColumn');
    end if;

    if jsonb_typeof(v_content -> 'rightColumn') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(v_content -> 'rightColumn') as item(value)
        where jsonb_typeof(item.value) <> 'string'
      )
    then
      v_snapshot := v_snapshot || jsonb_build_object('rightColumn', v_content -> 'rightColumn');
    end if;

    if jsonb_typeof(v_content -> 'prompts') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(v_content -> 'prompts') as item(value)
        where jsonb_typeof(item.value) <> 'string'
      )
    then
      v_snapshot := v_snapshot || jsonb_build_object('prompts', v_content -> 'prompts');
    end if;

    if jsonb_typeof(v_content -> 'choices') = 'array'
      and not exists (
        select 1 from jsonb_array_elements(v_content -> 'choices') as item(value)
        where jsonb_typeof(item.value) <> 'string'
      )
    then
      v_snapshot := v_snapshot || jsonb_build_object('choices', v_content -> 'choices');
    end if;
  end if;

  return v_snapshot;
end;
$$;

create or replace function public.score_session_answer_correct(
  p_type text,
  p_content jsonb,
  p_selected_answer jsonb
)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_correct_options int[];
  v_selected_options int[];
  v_correct_integer_text text;
  v_selected_integer_text text;
begin
  if p_selected_answer is null
    or p_selected_answer = 'null'::jsonb
    or jsonb_typeof(p_selected_answer) <> 'object'
  then
    return null;
  end if;

  if p_type = 'integer' then
    v_correct_integer_text := p_content ->> 'correct_integer';
    v_selected_integer_text := coalesce(
      p_selected_answer ->> 'integer',
      p_selected_answer ->> 'value'
    );

    if v_selected_integer_text is null then
      return null;
    end if;

    if v_correct_integer_text is null
      or v_correct_integer_text !~ '^-?[0-9]+(\.[0-9]+)?$'
      or v_selected_integer_text !~ '^-?[0-9]+(\.[0-9]+)?$'
    then
      return false;
    end if;

    return v_selected_integer_text::numeric = v_correct_integer_text::numeric;
  end if;

  if p_type = 'match' then
    if not (p_selected_answer ? 'pairs') then
      return null;
    end if;

    return p_selected_answer -> 'pairs' = p_content -> 'pairs';
  end if;

  if jsonb_typeof(p_content -> 'correct_options') <> 'array' then
    return false;
  end if;

  if jsonb_typeof(coalesce(p_selected_answer -> 'options', p_selected_answer -> 'selected_options')) <> 'array' then
    return null;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_content -> 'correct_options') as value
    where value !~ '^-?[0-9]+$'
  ) then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(p_selected_answer -> 'options', p_selected_answer -> 'selected_options')) as value
    where value !~ '^-?[0-9]+$'
  ) then
    return null;
  end if;

  select array_agg(value::int order by value::int)
  into v_correct_options
  from jsonb_array_elements_text(p_content -> 'correct_options') as value;

  select array_agg(value::int order by value::int)
  into v_selected_options
  from jsonb_array_elements_text(coalesce(p_selected_answer -> 'options', p_selected_answer -> 'selected_options')) as value;

  if v_selected_options is null or cardinality(v_selected_options) = 0 then
    return null;
  end if;

  return coalesce(v_correct_options, array[]::int[]) = v_selected_options;
end;
$$;

create or replace function public.start_test_session(
  p_exam_id uuid,
  p_type text,
  p_template_id uuid default null,
  p_topic_id uuid default null,
  p_count int default 10,
  p_duration_minutes int default null
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
        'topicId', p_topic_id
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

create or replace function public.submit_test_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session record;
  v_result record;
  v_existing_result record;
  v_submitted_at timestamptz;
  v_duration_sec int;
  v_marks_per_correct numeric := 2.0;
  v_negative_marking_fraction numeric := 0.33;
  v_score numeric := 0;
  v_max_score numeric := 0;
  v_attempted int := 0;
  v_correct int := 0;
  v_incorrect int := 0;
  v_skipped int := 0;
  v_is_correct boolean;
  v_marks_awarded numeric;
  v_topic_scores jsonb := '{}'::jsonb;
  v_topic_key text;
  v_topic_current jsonb;
  v_row record;
begin
  if v_user_id is null then
    raise exception 'sign in required' using errcode = '42501';
  end if;

  select *
  into v_session
  from public.test_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'session not found';
  end if;

  if v_session.user_id <> v_user_id then
    raise exception 'session does not belong to caller' using errcode = '42501';
  end if;

  if v_session.status = 'scored' then
    select *
    into v_existing_result
    from public.session_results
    where session_id = p_session_id;

    if found then
      return jsonb_build_object(
        'result_id', v_existing_result.id,
        'session_id', p_session_id,
        'score', v_existing_result.score,
        'max_score', v_existing_result.max_score,
        'accuracy', v_existing_result.accuracy,
        'attempted', v_existing_result.attempted,
        'correct', v_existing_result.correct,
        'incorrect', v_existing_result.incorrect,
        'skipped', v_existing_result.skipped,
        'status', 'scored'
      );
    end if;
  end if;

  if v_session.status not in ('in_progress', 'submitted') then
    raise exception 'session cannot be submitted from status %', v_session.status;
  end if;

  if ((v_session.metadata -> 'markingRule') ->> 'marksPerCorrect') ~ '^[0-9]+(\.[0-9]+)?$' then
    v_marks_per_correct := ((v_session.metadata -> 'markingRule') ->> 'marksPerCorrect')::numeric;
  end if;

  if ((v_session.metadata -> 'markingRule') ->> 'negativeMarkingFraction') ~ '^[0-9]+(\.[0-9]+)?$' then
    v_negative_marking_fraction := ((v_session.metadata -> 'markingRule') ->> 'negativeMarkingFraction')::numeric;
  end if;

  v_submitted_at := coalesce(v_session.submitted_at, now());
  v_duration_sec := greatest(
    0,
    floor(extract(epoch from (v_submitted_at - coalesce(v_session.started_at, v_session.created_at))))::int
  );

  update public.test_sessions
  set status = 'submitted',
      submitted_at = v_submitted_at
  where id = p_session_id;

  for v_row in
    select
      sq.question_id,
      q.topic_id,
      q.type,
      qv.content,
      sa.id as answer_id,
      sa.selected_answer
    from public.session_questions sq
    join public.questions q on q.id = sq.question_id
    join public.question_versions qv on qv.id = sq.question_version_id
    left join public.session_answers sa
      on sa.session_id = sq.session_id
      and sa.question_id = sq.question_id
    where sq.session_id = p_session_id
    order by sq.sequence
  loop
    v_max_score := v_max_score + v_marks_per_correct;
    v_is_correct := public.score_session_answer_correct(v_row.type, v_row.content, v_row.selected_answer);

    if v_is_correct is null then
      v_skipped := v_skipped + 1;
      v_marks_awarded := 0;
    elsif v_is_correct then
      v_attempted := v_attempted + 1;
      v_correct := v_correct + 1;
      v_marks_awarded := v_marks_per_correct;
    else
      v_attempted := v_attempted + 1;
      v_incorrect := v_incorrect + 1;
      v_marks_awarded := -v_negative_marking_fraction * v_marks_per_correct;
    end if;

    v_score := v_score + v_marks_awarded;

    if v_row.answer_id is not null then
      update public.session_answers
      set is_correct = v_is_correct,
          marks_awarded = v_marks_awarded
      where id = v_row.answer_id;
    end if;

    v_topic_key := coalesce(v_row.topic_id::text, 'unassigned');
    v_topic_current := coalesce(
      v_topic_scores -> v_topic_key,
      jsonb_build_object(
        'score', 0,
        'maxScore', 0,
        'attempted', 0,
        'correct', 0,
        'incorrect', 0,
        'skipped', 0
      )
    );

    v_topic_scores := jsonb_set(
      v_topic_scores,
      array[v_topic_key],
      jsonb_build_object(
        'score', (v_topic_current ->> 'score')::numeric + v_marks_awarded,
        'maxScore', (v_topic_current ->> 'maxScore')::numeric + v_marks_per_correct,
        'attempted', (v_topic_current ->> 'attempted')::int + case when v_is_correct is null then 0 else 1 end,
        'correct', (v_topic_current ->> 'correct')::int + case when v_is_correct then 1 else 0 end,
        'incorrect', (v_topic_current ->> 'incorrect')::int + case when v_is_correct = false then 1 else 0 end,
        'skipped', (v_topic_current ->> 'skipped')::int + case when v_is_correct is null then 1 else 0 end
      ),
      true
    );
  end loop;

  if v_max_score = 0 then
    raise exception 'session has no questions';
  end if;

  insert into public.session_results (
    session_id,
    user_id,
    exam_id,
    score,
    max_score,
    accuracy,
    attempted,
    correct,
    incorrect,
    skipped,
    duration_sec,
    topic_scores
  )
  values (
    p_session_id,
    v_user_id,
    v_session.exam_id,
    v_score,
    v_max_score,
    case when v_attempted > 0 then v_correct::numeric / v_attempted else 0 end,
    v_attempted,
    v_correct,
    v_incorrect,
    v_skipped,
    v_duration_sec,
    v_topic_scores
  )
  on conflict (session_id) do update
  set score = excluded.score,
      max_score = excluded.max_score,
      accuracy = excluded.accuracy,
      attempted = excluded.attempted,
      correct = excluded.correct,
      incorrect = excluded.incorrect,
      skipped = excluded.skipped,
      duration_sec = excluded.duration_sec,
      topic_scores = excluded.topic_scores
  returning * into v_result;

  update public.test_sessions
  set status = 'scored',
      submitted_at = v_submitted_at
  where id = p_session_id;

  return jsonb_build_object(
    'result_id', v_result.id,
    'session_id', p_session_id,
    'score', v_result.score,
    'max_score', v_result.max_score,
    'accuracy', v_result.accuracy,
    'attempted', v_result.attempted,
    'correct', v_result.correct,
    'incorrect', v_result.incorrect,
    'skipped', v_result.skipped,
    'status', 'scored'
  );
end;
$$;

revoke all on function public.build_session_prompt_snapshot(jsonb, text) from public;
revoke all on function public.score_session_answer_correct(text, jsonb, jsonb) from public;
revoke all on function public.start_test_session(uuid, text, uuid, uuid, int, int) from public;
revoke all on function public.submit_test_session(uuid) from public;

grant execute on function public.start_test_session(uuid, text, uuid, uuid, int, int) to authenticated;
grant execute on function public.submit_test_session(uuid) to authenticated;
