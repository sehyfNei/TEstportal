-- Migration: 202606050002_resolve_flags_for_question
-- TSP-092: rich flag triage queue — bulk flag resolution per question
-- Adds:
--   resolve_flags_for_question(p_question_id, p_resolution, p_note) -> jsonb
--     admin-only, security definer, closes all open/reviewing flags for the question in one
--     transaction with a single lockstep recount.
--
-- Design notes:
--   - Mirrors the TSP-028 grant block exactly (TSP-024 grant-bug guard — non-negotiable).
--   - Resolving flags does NOT un-quarantine the question; restoration stays in the editor.
--   - Idempotent if no open flags exist.
--   - Single-flag path (resolve_question_flag) is unchanged; this is additive only.
--
-- Security checklist:
--   - security definer, set search_path = public.
--   - revoke all from public; grant execute to authenticated.
--   - is_admin() enforced (errcode 42501) before any write.
--   - resolution value validated before write.
--   - for update row lock on question before mutation.
--   - lockstep recount: questions.flag_count + question_stats.flag_count updated together.

create or replace function public.resolve_flags_for_question(
  p_question_id uuid,
  p_resolution  text,
  p_note        text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed_count int;
  v_open         int;
begin
  -- 1. Admin check (defense-in-depth; RLS also enforces)
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  -- 2. Validate resolution value
  if p_resolution not in ('resolved', 'rejected') then
    raise exception 'invalid resolution: must be resolved or rejected' using errcode = '22023';
  end if;

  -- 3. Lock the question row (ensures question exists + serialises concurrent triage)
  perform 1
    from public.questions
   where id = p_question_id
     for update;

  if not found then
    raise exception 'question not found' using errcode = '22023';
  end if;

  -- 4. Close all open/reviewing flags for this question in one statement
  with closed as (
    update public.question_flags
       set status      = p_resolution,
           resolved_by = auth.uid(),
           resolved_at = now()
     where question_id = p_question_id
       and status in ('open', 'reviewing')
     returning id
  )
  select count(*) into v_closed_count from closed;

  -- 5. Idempotent: nothing to close
  if v_closed_count = 0 then
    return jsonb_build_object(
      'question_id',  p_question_id,
      'closed_count', 0,
      'open_flags',   0,
      'resolution',   p_resolution
    );
  end if;

  -- 6. Recompute open-flag count (never a blind decrement — same convention as TSP-028)
  select count(*)
    into v_open
    from public.question_flags
   where question_id = p_question_id
     and status = 'open';

  update public.questions
     set flag_count = v_open
   where id = p_question_id;

  insert into public.question_stats (question_id, flag_count)
  values (p_question_id, v_open)
  on conflict (question_id)
  do update set flag_count = excluded.flag_count;

  -- 7. Return result
  return jsonb_build_object(
    'question_id',  p_question_id,
    'closed_count', v_closed_count,
    'open_flags',   v_open,
    'resolution',   p_resolution
  );
end;
$$;

-- ============================================================
-- Grants (mandatory — prevent TSP-024 grant bug recurrence)
-- ============================================================

revoke all on function public.resolve_flags_for_question(uuid, text, text) from public;
grant execute on function public.resolve_flags_for_question(uuid, text, text) to authenticated;
