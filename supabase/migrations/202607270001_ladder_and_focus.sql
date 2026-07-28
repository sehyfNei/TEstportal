-- TSP-202/203/204: mastery ladder + daily focus planner (topic granularity —
-- question_concepts has zero rows live today, so this runs on topics; the
-- same shape upgrades to concept_id later with no rework, mirroring the
-- topic-or-concept convention already used by mastery_records/retest_queue).

-- ── Schema ───────────────────────────────────────────────────────────────────

create table if not exists public.topic_ladder_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  rung_index int not null default 0,
  rung_results jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  cycle_count int not null default 1,
  updated_at timestamptz not null default now(),
  unique (user_id, exam_id, topic_id)
);

create table if not exists public.daily_focus_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  concepts_per_day int not null default 3 check (concepts_per_day between 1 and 8),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_focus_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  day_key text not null,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, exam_id, day_key, topic_id)
);

create index if not exists topic_ladder_progress_user_exam
on public.topic_ladder_progress (user_id, exam_id);

create index if not exists daily_focus_items_user_exam_day
on public.daily_focus_items (user_id, exam_id, day_key);

drop trigger if exists topic_ladder_progress_set_updated_at on public.topic_ladder_progress;
create trigger topic_ladder_progress_set_updated_at
before update on public.topic_ladder_progress
for each row execute function public.set_updated_at();

drop trigger if exists daily_focus_settings_set_updated_at on public.daily_focus_settings;
create trigger daily_focus_settings_set_updated_at
before update on public.daily_focus_settings
for each row execute function public.set_updated_at();

alter table public.topic_ladder_progress enable row level security;
alter table public.daily_focus_settings enable row level security;
alter table public.daily_focus_items enable row level security;

drop policy if exists topic_ladder_progress_owner_select on public.topic_ladder_progress;
create policy topic_ladder_progress_owner_select
on public.topic_ladder_progress for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists topic_ladder_progress_owner_insert on public.topic_ladder_progress;
create policy topic_ladder_progress_owner_insert
on public.topic_ladder_progress for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists topic_ladder_progress_owner_update on public.topic_ladder_progress;
create policy topic_ladder_progress_owner_update
on public.topic_ladder_progress for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_focus_settings_owner_select on public.daily_focus_settings;
create policy daily_focus_settings_owner_select
on public.daily_focus_settings for select to authenticated
using (user_id = auth.uid());

drop policy if exists daily_focus_settings_owner_upsert on public.daily_focus_settings;
create policy daily_focus_settings_owner_upsert
on public.daily_focus_settings for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists daily_focus_settings_owner_update on public.daily_focus_settings;
create policy daily_focus_settings_owner_update
on public.daily_focus_settings for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists daily_focus_items_owner_select on public.daily_focus_items;
create policy daily_focus_items_owner_select
on public.daily_focus_items for select to authenticated
using (user_id = auth.uid());

drop policy if exists daily_focus_items_owner_insert on public.daily_focus_items;
create policy daily_focus_items_owner_insert
on public.daily_focus_items for insert to authenticated
with check (user_id = auth.uid());

grant select, insert, update on public.topic_ladder_progress to authenticated;
grant select, insert, update on public.daily_focus_settings to authenticated;
grant select, insert on public.daily_focus_items to authenticated;

-- ── Ladder question selection ───────────────────────────────────────────────
-- Fixed 5-rung sequence: 2 easy, 2 medium, 1 hard, easy-first. Degrades
-- gracefully (never errors) when a topic's pool is thin for a tier by
-- borrowing from whatever else is eligible — with ~11 questions/topic on
-- average today, thin pools are the common case, not the exception.

create or replace function public.select_ladder_questions(
  p_user_id uuid,
  p_exam_id uuid,
  p_topic_id uuid
)
returns table (
  question_id uuid,
  current_version_id uuid,
  q_type text,
  content jsonb,
  rung int
)
language sql
security definer
set search_path = public
as $$
  with recent_sessions as (
    select id
    from public.test_sessions
    where user_id = p_user_id
      and exam_id = p_exam_id
      and type in ('topic', 'concept_retest', 'topic_ladder')
    order by coalesce(started_at, created_at) desc
    limit 3
  ),
  recently_seen as (
    select sq.question_id
    from public.session_questions sq
    where sq.session_id in (select id from recent_sessions)
    limit 150
  ),
  eligible as (
    select
      q.id as question_id,
      q.current_version_id,
      q.type as q_type,
      qv.content,
      q.difficulty
    from public.questions q
    join public.question_versions qv on qv.id = q.current_version_id
    where (q.topic_id = p_topic_id or q.subtopic_id = p_topic_id)
      and q.status = 'live'
      and q.exposure_policy = 'practice'
      and q.quality_tier <> 'quarantine'
      and not exists (
        select 1 from recently_seen rs where rs.question_id = q.id
      )
  ),
  easy_picks as (
    select question_id, current_version_id, q_type, content, 1 as tier
    from eligible where difficulty = 'easy' order by random() limit 2
  ),
  medium_picks as (
    select question_id, current_version_id, q_type, content, 2 as tier
    from eligible where difficulty = 'medium' order by random() limit 2
  ),
  hard_picks as (
    select question_id, current_version_id, q_type, content, 3 as tier
    from eligible where difficulty = 'hard' order by random() limit 1
  ),
  picked as (
    select * from easy_picks
    union all select * from medium_picks
    union all select * from hard_picks
  ),
  fillup as (
    select e.question_id, e.current_version_id, e.q_type, e.content, 4 as tier
    from eligible e
    where not exists (select 1 from picked p where p.question_id = e.question_id)
    order by random()
    limit greatest(0, 5 - (select count(*) from picked)::int)
  ),
  combined as (
    select * from picked
    union all
    select * from fillup
  )
  select
    question_id, current_version_id, q_type, content,
    row_number() over (order by tier, random())::int as rung
  from combined
  limit 5
$$;

revoke all on function public.select_ladder_questions(uuid, uuid, uuid) from public;
grant execute on function public.select_ladder_questions(uuid, uuid, uuid) to authenticated;

-- ── start_test_session: add the topic_ladder branch ────────────────────────

alter table public.test_sessions drop constraint if exists test_sessions_type_check;
alter table public.test_sessions add constraint test_sessions_type_check
check (type in (
  'diagnostic','topic','concept_retest','sectional','mock','benchmark','custom','topic_ladder'
));

create or replace function public.start_test_session(
  p_exam_id uuid,
  p_type text,
  p_template_id uuid default null,
  p_topic_id uuid default null,
  p_count int default 10,
  p_duration_minutes int default null,
  p_min_quality_tier text default 'bronze',
  p_pyq_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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

  if p_type not in ('diagnostic','topic','concept_retest','sectional','mock','benchmark','custom','topic_ladder') then
    raise exception 'invalid test session type: %', p_type;
  end if;

  if p_type = 'topic_ladder' and p_topic_id is null then
    raise exception 'topic_ladder sessions require a topic_id';
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
    when 'topic' then case when p_pyq_only then 'topic_practice_pyq_only' else 'topic_practice_balanced' end
    when 'concept_retest' then 'concept_retest_balanced'
    when 'topic_ladder' then 'topic_ladder_sequence'
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
        'pyqOnly', p_pyq_only,
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
        session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
      )
      values (
        v_session_id, v_question.question_id, v_question.current_version_id,
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence, 'diagnostic_weighted'
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
          session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
        )
        values (
          v_session_id, v_question.question_id, v_question.current_version_id,
          public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
          v_sequence, v_selection_mode
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
        v_user_id, p_exam_id, p_topic_id, v_count, v_min_quality_tier, v_exposure_policies, p_pyq_only
      )
    loop
      v_sequence := v_sequence + 1;

      insert into public.session_questions (
        session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
      )
      values (
        v_session_id, v_question.question_id, v_question.current_version_id,
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence, v_selection_mode
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
  elsif p_type = 'concept_retest' then
    for v_question in
      select *
      from public.select_topic_practice_questions(
        v_user_id, p_exam_id, p_topic_id, v_count, v_min_quality_tier, v_exposure_policies
      )
    loop
      v_sequence := v_sequence + 1;

      insert into public.session_questions (
        session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
      )
      values (
        v_session_id, v_question.question_id, v_question.current_version_id,
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence, 'concept_retest_balanced'
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
  elsif p_type = 'topic_ladder' then
    for v_question in
      select question_id, current_version_id, q_type, content
      from public.select_ladder_questions(v_user_id, p_exam_id, p_topic_id)
      order by rung
    loop
      v_sequence := v_sequence + 1;

      insert into public.session_questions (
        session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
      )
      values (
        v_session_id, v_question.question_id, v_question.current_version_id,
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence, 'topic_ladder_sequence'
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
        p_exam_id, v_count, v_min_quality_tier, v_exposure_policies, v_fixed_qids
      )
    loop
      v_sequence := v_sequence + 1;

      insert into public.session_questions (
        session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
      )
      values (
        v_session_id, v_question.question_id, v_question.current_version_id,
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence, v_selection_mode
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
        session_id, question_id, question_version_id, prompt_snapshot, sequence, selected_by_reason
      )
      values (
        v_session_id, v_question.question_id, v_question.current_version_id,
        public.build_session_prompt_snapshot(v_question.content, v_question.q_type),
        v_sequence, v_selection_mode
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

revoke all on function public.start_test_session(uuid, text, uuid, uuid, int, int, text, boolean) from public;
grant execute on function public.start_test_session(uuid, text, uuid, uuid, int, int, text, boolean) to authenticated;
