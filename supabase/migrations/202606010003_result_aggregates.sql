alter table public.session_results
  add column if not exists difficulty_scores jsonb,
  add column if not exists source_scores jsonb;

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
  v_difficulty_scores jsonb := '{}'::jsonb;
  v_source_scores jsonb := '{}'::jsonb;
  v_concept_scores jsonb;
  v_strategy_metrics jsonb;
  v_topic_key text;
  v_difficulty_key text;
  v_source_key text;
  v_topic_current jsonb;
  v_difficulty_current jsonb;
  v_source_current jsonb;
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
      q.difficulty,
      q.source,
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

    v_difficulty_key := coalesce(v_row.difficulty, 'unknown');
    v_difficulty_current := coalesce(
      v_difficulty_scores -> v_difficulty_key,
      jsonb_build_object(
        'score', 0,
        'maxScore', 0,
        'attempted', 0,
        'correct', 0,
        'incorrect', 0,
        'skipped', 0
      )
    );

    v_difficulty_scores := jsonb_set(
      v_difficulty_scores,
      array[v_difficulty_key],
      jsonb_build_object(
        'score', (v_difficulty_current ->> 'score')::numeric + v_marks_awarded,
        'maxScore', (v_difficulty_current ->> 'maxScore')::numeric + v_marks_per_correct,
        'attempted', (v_difficulty_current ->> 'attempted')::int + case when v_is_correct is null then 0 else 1 end,
        'correct', (v_difficulty_current ->> 'correct')::int + case when v_is_correct then 1 else 0 end,
        'incorrect', (v_difficulty_current ->> 'incorrect')::int + case when v_is_correct = false then 1 else 0 end,
        'skipped', (v_difficulty_current ->> 'skipped')::int + case when v_is_correct is null then 1 else 0 end
      ),
      true
    );

    v_source_key := coalesce(v_row.source, 'unknown');
    v_source_current := coalesce(
      v_source_scores -> v_source_key,
      jsonb_build_object(
        'score', 0,
        'maxScore', 0,
        'attempted', 0,
        'correct', 0,
        'incorrect', 0,
        'skipped', 0
      )
    );

    v_source_scores := jsonb_set(
      v_source_scores,
      array[v_source_key],
      jsonb_build_object(
        'score', (v_source_current ->> 'score')::numeric + v_marks_awarded,
        'maxScore', (v_source_current ->> 'maxScore')::numeric + v_marks_per_correct,
        'attempted', (v_source_current ->> 'attempted')::int + case when v_is_correct is null then 0 else 1 end,
        'correct', (v_source_current ->> 'correct')::int + case when v_is_correct then 1 else 0 end,
        'incorrect', (v_source_current ->> 'incorrect')::int + case when v_is_correct = false then 1 else 0 end,
        'skipped', (v_source_current ->> 'skipped')::int + case when v_is_correct is null then 1 else 0 end
      ),
      true
    );
  end loop;

  if v_max_score = 0 then
    raise exception 'session has no questions';
  end if;

  with concept_agg as (
    select
      qc.concept_id::text as concept_key,
      coalesce(sum(sa.marks_awarded), 0) as score,
      count(*) * v_marks_per_correct as max_score,
      count(*) filter (where sa.is_correct is not null) as attempted,
      count(*) filter (where sa.is_correct = true) as correct_count,
      count(*) filter (where sa.is_correct = false) as incorrect_count,
      count(*) filter (where sa.is_correct is null) as skipped_count
    from public.session_questions sq
    join public.question_concepts qc on qc.question_id = sq.question_id
    left join public.session_answers sa
      on sa.session_id = sq.session_id
      and sa.question_id = sq.question_id
    where sq.session_id = p_session_id
    group by qc.concept_id
  )
  select jsonb_object_agg(
    concept_key,
    jsonb_build_object(
      'score', score,
      'maxScore', max_score,
      'attempted', attempted,
      'correct', correct_count,
      'incorrect', incorrect_count,
      'skipped', skipped_count
    )
  )
  into v_concept_scores
  from concept_agg;

  select jsonb_build_object(
    'negativeMarksLost', coalesce(sum(case when is_correct = false then abs(coalesce(marks_awarded, 0)) else 0 end), 0),
    'highConfidenceWrong', count(*) filter (where confidence = 'sure' and is_correct = false),
    'correctGuessed', count(*) filter (where confidence = 'guessed' and is_correct = true),
    'totalRevisits', coalesce(sum(revisit_count), 0),
    'timeOnWrongSec', coalesce(sum(case when is_correct = false then time_spent_sec else 0 end), 0),
    'timeOnSkippedSec', coalesce(sum(case when is_correct is null then time_spent_sec else 0 end), 0)
  )
  into v_strategy_metrics
  from public.session_answers
  where session_id = p_session_id;

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
    topic_scores,
    difficulty_scores,
    source_scores,
    concept_scores,
    strategy_metrics
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
    v_topic_scores,
    v_difficulty_scores,
    v_source_scores,
    v_concept_scores,
    v_strategy_metrics
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
      topic_scores = excluded.topic_scores,
      difficulty_scores = excluded.difficulty_scores,
      source_scores = excluded.source_scores,
      concept_scores = excluded.concept_scores,
      strategy_metrics = excluded.strategy_metrics
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

revoke all on function public.submit_test_session(uuid) from public;
grant execute on function public.submit_test_session(uuid) to authenticated;
