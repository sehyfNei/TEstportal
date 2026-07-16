-- Avoid returning every prompt snapshot across the network when a test starts.
-- The canonical start function still creates the session atomically; this
-- wrapper returns only the metadata needed before redirecting to the runner.
create or replace function public.start_test_session_compact(
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
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.start_test_session(
    p_exam_id,
    p_type,
    p_template_id,
    p_topic_id,
    p_count,
    p_duration_minutes,
    p_min_quality_tier,
    p_pyq_only
  );

  return (v_result - 'questions') || jsonb_build_object(
    'question_count',
    jsonb_array_length(coalesce(v_result -> 'questions', '[]'::jsonb))
  );
end;
$$;

revoke all on function public.start_test_session_compact(uuid, text, uuid, uuid, int, int, text, boolean) from public;
grant execute on function public.start_test_session_compact(uuid, text, uuid, uuid, int, int, text, boolean) to authenticated;