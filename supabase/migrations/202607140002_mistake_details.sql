-- Mistake details (TSP-185).
-- Session prompt snapshots are answer-stripped by design, and questions
-- content/explanation are not directly readable by students. This
-- security-definer RPC exposes the correct answer + explanation ONLY for
-- mistakes the caller owns (i.e., questions they have already attempted).
-- Rollback: supabase/rollbacks/202607140002_mistake_details_down.sql

create or replace function public.get_mistake_details(p_mistake_ids uuid[])
returns table (
  mistake_id      uuid,
  question_type   text,
  options         jsonb,
  correct_options jsonb,
  selected_answer jsonb,
  explanation     text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    mi.id                          as mistake_id,
    q.type                         as question_type,
    qv.content -> 'options'        as options,
    qv.content -> 'correct_options' as correct_options,
    sa.selected_answer             as selected_answer,
    coalesce(qv.explanation, qv.explanation_detail) as explanation
  from public.mistake_items mi
  join public.questions q on q.id = mi.question_id
  left join public.question_versions qv on qv.id = q.current_version_id
  left join public.session_answers sa
    on sa.session_id = mi.session_id
   and sa.question_id = mi.question_id
  where mi.id = any(p_mistake_ids)
    and mi.user_id = auth.uid();
$$;

revoke all on function public.get_mistake_details(uuid[]) from public;
revoke all on function public.get_mistake_details(uuid[]) from anon;
grant execute on function public.get_mistake_details(uuid[]) to authenticated;
