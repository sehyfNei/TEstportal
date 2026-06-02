-- TSP-031 admin question search/filter RPC.

create or replace function public.search_admin_questions(
  p_query text default null,
  p_exam_id uuid default null,
  p_topic_id uuid default null,
  p_status text default null,
  p_difficulty text default null,
  p_quality_tier text default null,
  p_exposure_policy text default null,
  p_source text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_total int;
  v_questions jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  with filtered as (
    select q.id
    from public.questions q
    left join public.question_versions qv on qv.id = q.current_version_id
    where (p_exam_id is null or q.exam_id = p_exam_id)
      and (p_topic_id is null or q.topic_id = p_topic_id or q.subtopic_id = p_topic_id)
      and (p_status is null or q.status = p_status)
      and (p_difficulty is null or q.difficulty = p_difficulty)
      and (p_quality_tier is null or q.quality_tier = p_quality_tier)
      and (p_exposure_policy is null or q.exposure_policy = p_exposure_policy)
      and (p_source is null or q.source = p_source)
      and (
        v_query is null
        or to_tsvector(
          'english',
          coalesce(qv.content ->> 'text', '') || ' ' || coalesce(qv.content ->> 'stem', '')
        ) @@ plainto_tsquery('english', v_query)
      )
  )
  select count(*) into v_total from filtered;

  with filtered as (
    select
      q.id,
      q.type,
      q.difficulty,
      q.source,
      q.status,
      q.quality_tier,
      q.exposure_policy,
      q.language,
      q.created_at,
      e.name as exam_name,
      e.slug as exam_slug,
      t.name as topic_name,
      t.slug as topic_slug,
      qv.version,
      left(coalesce(nullif(qv.content ->> 'text', ''), nullif(qv.content ->> 'stem', ''), ''), 200)
        as question_text
    from public.questions q
    join public.exams e on e.id = q.exam_id
    join public.topics t on t.id = q.topic_id
    left join public.question_versions qv on qv.id = q.current_version_id
    where (p_exam_id is null or q.exam_id = p_exam_id)
      and (p_topic_id is null or q.topic_id = p_topic_id or q.subtopic_id = p_topic_id)
      and (p_status is null or q.status = p_status)
      and (p_difficulty is null or q.difficulty = p_difficulty)
      and (p_quality_tier is null or q.quality_tier = p_quality_tier)
      and (p_exposure_policy is null or q.exposure_policy = p_exposure_policy)
      and (p_source is null or q.source = p_source)
      and (
        v_query is null
        or to_tsvector(
          'english',
          coalesce(qv.content ->> 'text', '') || ' ' || coalesce(qv.content ->> 'stem', '')
        ) @@ plainto_tsquery('english', v_query)
      )
  ),
  paged as (
    select *
    from filtered
    order by created_at desc
    limit v_limit
    offset v_offset
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'type', type,
        'difficulty', difficulty,
        'source', source,
        'status', status,
        'quality_tier', quality_tier,
        'exposure_policy', exposure_policy,
        'language', language,
        'created_at', created_at,
        'question_text', question_text,
        'exams', jsonb_build_object('name', exam_name, 'slug', exam_slug),
        'topic', jsonb_build_object('name', topic_name, 'slug', topic_slug),
        'current_version',
        jsonb_build_object(
          'version', version,
          'content', jsonb_build_object('text', question_text)
        )
      )
      order by created_at desc
    ),
    '[]'::jsonb
  )
  into v_questions
  from paged;

  return jsonb_build_object(
    'total', v_total,
    'questions', v_questions
  );
end;
$$;

revoke all on function public.search_admin_questions(text, uuid, uuid, text, text, text, text, text, int, int) from public;
grant execute on function public.search_admin_questions(text, uuid, uuid, text, text, text, text, text, int, int) to authenticated;
