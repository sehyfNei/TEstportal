-- Transactional exam manifest import RPC.
-- Replaces the active hierarchy for one exam slug while preserving manifest history.

drop function if exists public.import_exam_manifest(jsonb, jsonb);

create or replace function public.import_exam_manifest(
  p_manifest jsonb,
  p_topics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exam_id uuid;
  v_exam_slug text;
  v_imported_by uuid;
  v_manifest_version int;
  v_topic_count int := 0;
  v_cluster_count int := 0;
  v_concept_count int := 0;
  v_cutoff_count int := 0;
  v_topic_id uuid;
  v_parent_id uuid;
  v_cluster_id uuid;
  v_topic_ids jsonb := '{}'::jsonb;
  v_cluster_ids jsonb := '{}'::jsonb;
  topic_record record;
  cluster_record record;
  concept_record record;
  cutoff_record record;
begin
  if not public.is_admin() then
    raise exception 'Admin role required to import exam manifests.' using errcode = '42501';
  end if;

  if p_manifest is null or jsonb_typeof(p_manifest) <> 'object' then
    raise exception 'Manifest payload must be a JSON object.' using errcode = '22023';
  end if;

  if p_topics is null or jsonb_typeof(p_topics) <> 'array' then
    raise exception 'Flattened topic payload must be a JSON array.' using errcode = '22023';
  end if;

  v_imported_by := auth.uid();
  v_exam_slug := nullif(trim(p_manifest #>> '{exam,slug}'), '');

  if v_exam_slug is null then
    raise exception 'Manifest exam.slug is required.' using errcode = '23502';
  end if;

  insert into public.exams (
    slug,
    name,
    description,
    is_active,
    updated_at
  )
  values (
    v_exam_slug,
    p_manifest #>> '{exam,name}',
    p_manifest #>> '{exam,description}',
    true,
    now()
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    is_active = true,
    updated_at = now()
  returning id into v_exam_id;

  select coalesce(max(version), 0) + 1
  into v_manifest_version
  from public.exam_manifests
  where slug = v_exam_slug;

  update public.exam_manifests
  set is_active = false
  where exam_id = v_exam_id
    and is_active = true;

  delete from public.historical_cutoffs where exam_id = v_exam_id;
  delete from public.concepts where exam_id = v_exam_id;
  delete from public.concept_clusters where exam_id = v_exam_id;
  delete from public.topics where exam_id = v_exam_id;

  for topic_record in
    select *
    from jsonb_to_recordset(p_topics) as topic(
      slug text,
      name text,
      description text,
      weight_percent numeric,
      parent_slug text,
      level int,
      order_index int
    )
    order by topic.level, topic.order_index
  loop
    if topic_record.parent_slug is null then
      v_parent_id := null;
    else
      v_parent_id := (v_topic_ids ->> topic_record.parent_slug)::uuid;

      if v_parent_id is null then
        raise exception 'Topic "%" references unknown parent "%".',
          topic_record.slug,
          topic_record.parent_slug
          using errcode = '23503';
      end if;
    end if;

    insert into public.topics (
      exam_id,
      parent_id,
      slug,
      name,
      description,
      level,
      weight_percent,
      order_index
    )
    values (
      v_exam_id,
      v_parent_id,
      topic_record.slug,
      topic_record.name,
      topic_record.description,
      topic_record.level,
      topic_record.weight_percent,
      topic_record.order_index
    )
    returning id into v_topic_id;

    v_topic_ids := jsonb_set(v_topic_ids, array[topic_record.slug], to_jsonb(v_topic_id::text), true);
    v_topic_count := v_topic_count + 1;
  end loop;

  for cluster_record in
    select *
    from jsonb_to_recordset(coalesce(p_manifest -> 'conceptClusters', '[]'::jsonb)) as cluster(
      slug text,
      name text,
      description text
    )
  loop
    insert into public.concept_clusters (
      exam_id,
      slug,
      name,
      description
    )
    values (
      v_exam_id,
      cluster_record.slug,
      cluster_record.name,
      cluster_record.description
    )
    returning id into v_cluster_id;

    v_cluster_ids := jsonb_set(
      v_cluster_ids,
      array[cluster_record.slug],
      to_jsonb(v_cluster_id::text),
      true
    );
    v_cluster_count := v_cluster_count + 1;
  end loop;

  for concept_record in
    select *
    from jsonb_to_recordset(coalesce(p_manifest -> 'concepts', '[]'::jsonb)) as concept(
      slug text,
      name text,
      "topicSlug" text,
      "clusterSlug" text,
      description text
    )
  loop
    v_topic_id := (v_topic_ids ->> concept_record."topicSlug")::uuid;

    if v_topic_id is null then
      raise exception 'Concept "%" references unknown topic "%".',
        concept_record.slug,
        concept_record."topicSlug"
        using errcode = '23503';
    end if;

    if concept_record."clusterSlug" is null then
      v_cluster_id := null;
    else
      v_cluster_id := (v_cluster_ids ->> concept_record."clusterSlug")::uuid;

      if v_cluster_id is null then
        raise exception 'Concept "%" references unknown concept cluster "%".',
          concept_record.slug,
          concept_record."clusterSlug"
          using errcode = '23503';
      end if;
    end if;

    insert into public.concepts (
      exam_id,
      topic_id,
      cluster_id,
      slug,
      name,
      description
    )
    values (
      v_exam_id,
      v_topic_id,
      v_cluster_id,
      concept_record.slug,
      concept_record.name,
      concept_record.description
    );

    v_concept_count := v_concept_count + 1;
  end loop;

  for cutoff_record in
    select *
    from jsonb_to_recordset(coalesce(p_manifest -> 'historicalCutoffs', '[]'::jsonb)) as cutoff(
      year int,
      category text,
      "cutoffScore" numeric,
      "maxScore" numeric,
      metadata jsonb
    )
  loop
    insert into public.historical_cutoffs (
      exam_id,
      year,
      category,
      cutoff_score,
      max_score,
      metadata
    )
    values (
      v_exam_id,
      cutoff_record.year,
      coalesce(cutoff_record.category, 'general'),
      cutoff_record."cutoffScore",
      cutoff_record."maxScore",
      coalesce(cutoff_record.metadata, '{}'::jsonb)
    );

    v_cutoff_count := v_cutoff_count + 1;
  end loop;

  insert into public.exam_manifests (
    exam_id,
    slug,
    version,
    manifest,
    is_active,
    imported_by
  )
  values (
    v_exam_id,
    v_exam_slug,
    v_manifest_version,
    p_manifest,
    true,
    v_imported_by
  );

  return jsonb_build_object(
    'exam_id', v_exam_id,
    'exam_slug', v_exam_slug,
    'manifest_version', v_manifest_version,
    'topic_count', v_topic_count,
    'cluster_count', v_cluster_count,
    'concept_count', v_concept_count,
    'cutoff_count', v_cutoff_count
  );
end;
$$;

revoke all on function public.import_exam_manifest(jsonb, jsonb) from public;
grant execute on function public.import_exam_manifest(jsonb, jsonb) to authenticated;
