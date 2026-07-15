-- Fixed test template ordering (TSP-161).
-- select_benchmark_questions previously ordered its fixed-template picks by
-- random(), so a hand-authored fixed paper came back shuffled — violating the
-- "every user gets the same questions in the same order" guarantee. Rewrite the
-- fixed branch to preserve the authored order of p_fixed_question_ids via
-- unnest ... with ordinality. The random-pool (non-fixed) branch is unchanged.
-- Signature and return columns are identical, so start_test_session is untouched.
-- Rollback: re-apply the prior definition from 202606010002_benchmark_selection.sql.

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
  with fixed_order as (
    select qid, ord
    from unnest(coalesce(p_fixed_question_ids, array[]::text[])) with ordinality as t(qid, ord)
  ),
  fixed_picks as (
    select
      q.id as question_id,
      q.current_version_id,
      q.type as q_type,
      qv.content,
      fo.ord as pick_order
    from fixed_order fo
    join public.questions q on q.id::text = fo.qid
    join public.question_versions qv on qv.id = q.current_version_id
    where p_fixed_question_ids is not null
      and q.exam_id = p_exam_id
      and q.status = 'live'
      and q.exposure_policy = any(coalesce(p_exposure_policies, array['practice', 'benchmark_reserved']))
      and q.quality_tier <> 'quarantine'
  ),
  priority_picks as (
    select
      q.id as question_id,
      q.current_version_id,
      q.type as q_type,
      qv.content,
      -- Keep the fixed picks strictly ahead of any pool fallback.
      1000000 + row_number() over (
        order by
          case q.quality_tier when 'gold' then 1 when 'silver' then 2 else 3 end,
          random()
      ) as pick_order
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
  )
  select question_id, current_version_id, q_type, content
  from (
    select * from fixed_picks
    union all
    select * from priority_picks
  ) combined
  order by pick_order
  limit greatest(coalesce(p_count, 0), 0)
$$;

revoke all on function public.select_benchmark_questions(uuid, int, text, text[], text[]) from public;
grant execute on function public.select_benchmark_questions(uuid, int, text, text[], text[]) to authenticated;
