-- Migration: 202606050001_question_flags_quarantine
-- TSP-028: question flags + auto-quarantine mechanism
-- Adds:
--   1. partial unique index (one open flag per user per question)
--   2. submit_question_flag(p_question_id, p_reason, p_details) -> jsonb  [security definer, authenticated]
--   3. resolve_question_flag(p_flag_id, p_resolution, p_note) -> jsonb    [security definer, authenticated, admin-only]
--
-- Auto-quarantine threshold = 3 distinct open flags (named constant below).
-- NOTE: These are legitimately language plpgsql — each is multi-statement
-- (insert + conditional update + count). Do NOT convert to language sql.
--
-- Security checklist:
--   - Both RPCs are security definer, set search_path = public.
--   - revoke all from public, grant execute to authenticated.
--   - submit_question_flag: student never updates questions directly.
--   - resolve_question_flag: enforces is_admin() (errcode 42501) before any write.
--   - Auto-quarantine writes a question_status_events audit row.
--   - Reason allowlist enforced both in SQL CHECK (existing) and RPC validation here.

-- ============================================================
-- 1. Partial unique index — one open flag per user per question
-- ============================================================

create unique index if not exists question_flags_one_open_per_user
on public.question_flags (question_id, user_id)
where status = 'open' and user_id is not null;

-- ============================================================
-- 2. submit_question_flag
-- ============================================================

create or replace function public.submit_question_flag(
  p_question_id uuid,
  p_reason      text,
  p_details     text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Auto-quarantine threshold: tunable in one place.
  c_quarantine_threshold constant int := 3;
  v_uid        uuid;
  v_status     text;
  v_tier       text;
  v_flag_id    uuid;
  v_open       int;
  v_quarantined boolean := false;
begin
  -- 1. Auth check
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- 2. Validate reason (keep in sync with the CHECK constraint and TS allowlist)
  if p_reason not in (
    'incorrect_answer', 'ambiguous', 'wrong_topic', 'outdated', 'low_quality', 'other'
  ) then
    raise exception 'invalid flag reason: %', p_reason using errcode = '22023';
  end if;

  -- 3. Lock the question row and verify it is live
  select status, quality_tier
    into v_status, v_tier
    from public.questions
   where id = p_question_id
     for update;

  if not found then
    raise exception 'question not found' using errcode = '22023';
  end if;

  if v_status <> 'live' then
    raise exception 'question is not open for flagging' using errcode = '22023';
  end if;

  -- 4. Insert the flag; on duplicate open flag from same user, do nothing
  insert into public.question_flags (question_id, user_id, reason, details, status)
  values (p_question_id, v_uid, p_reason, p_details, 'open')
  on conflict (question_id, user_id) where status = 'open' and user_id is not null
  do nothing
  returning id into v_flag_id;

  -- Duplicate open flag from same user — skip count changes
  if v_flag_id is null then
    return jsonb_build_object(
      'flag_id',    null,
      'open_flags', null,
      'quarantined', false,
      'duplicate',  true
    );
  end if;

  -- 5. Recompute open-flag count (never a blind +1)
  select count(*)
    into v_open
    from public.question_flags
   where question_id = p_question_id
     and status = 'open';

  -- Write to questions.flag_count
  update public.questions
     set flag_count = v_open
   where id = p_question_id;

  -- Upsert question_stats.flag_count (keep in lockstep, same as set_question_quality_tier)
  insert into public.question_stats (question_id, flag_count)
  values (p_question_id, v_open)
  on conflict (question_id)
  do update set flag_count = excluded.flag_count;

  -- 6. Threshold quarantine
  if v_open >= c_quarantine_threshold and v_tier <> 'quarantine' then
    -- Flip quality tier
    update public.questions
       set quality_tier = 'quarantine'
     where id = p_question_id;

    insert into public.question_stats (question_id, quality_tier)
    values (p_question_id, 'quarantine')
    on conflict (question_id)
    do update set quality_tier = 'quarantine';

    -- Audit: live -> flagged (inline — do NOT call set_question_status, it re-checks is_admin())
    insert into public.question_status_events (
      question_id, from_status, to_status, actor, note
    ) values (
      p_question_id,
      'live',
      'flagged',
      v_uid,
      'auto-quarantine: ' || v_open || ' open flags'
    );

    update public.questions
       set status = 'flagged'
     where id = p_question_id;

    v_quarantined := true;
  end if;

  -- 7. Return result
  return jsonb_build_object(
    'flag_id',    v_flag_id,
    'open_flags', v_open,
    'quarantined', v_quarantined,
    'duplicate',  false
  );
end;
$$;

-- ============================================================
-- 3. resolve_question_flag (admin-only)
-- ============================================================

create or replace function public.resolve_question_flag(
  p_flag_id    uuid,
  p_resolution text,
  p_note       text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qid        uuid;
  v_flag_status text;
  v_open        int;
begin
  -- 1. Admin check (defense-in-depth on top of RLS)
  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  -- 2. Validate resolution value
  if p_resolution not in ('resolved', 'rejected') then
    raise exception 'invalid resolution: must be resolved or rejected' using errcode = '22023';
  end if;

  -- 3. Lock the flag row
  select question_id, status
    into v_qid, v_flag_status
    from public.question_flags
   where id = p_flag_id
     for update;

  if not found then
    raise exception 'flag not found' using errcode = '22023';
  end if;

  -- Idempotent: already closed
  if v_flag_status not in ('open', 'reviewing') then
    return jsonb_build_object(
      'flag_id',    p_flag_id,
      'question_id', v_qid,
      'resolution', p_resolution,
      'open_flags', null,
      'changed',    false
    );
  end if;

  -- 4. Close the flag
  update public.question_flags
     set status      = p_resolution,
         resolved_by = auth.uid(),
         resolved_at = now()
   where id = p_flag_id;

  -- 5. Recompute open-flag count (keep in lockstep)
  select count(*)
    into v_open
    from public.question_flags
   where question_id = v_qid
     and status = 'open';

  update public.questions
     set flag_count = v_open
   where id = v_qid;

  insert into public.question_stats (question_id, flag_count)
  values (v_qid, v_open)
  on conflict (question_id)
  do update set flag_count = excluded.flag_count;

  -- 6. Return result
  return jsonb_build_object(
    'flag_id',    p_flag_id,
    'question_id', v_qid,
    'resolution', p_resolution,
    'open_flags', v_open,
    'changed',    true
  );
end;
$$;

-- ============================================================
-- 4. Grants (mandatory — prevent TSP-024 grant bug recurrence)
-- ============================================================

revoke all on function public.submit_question_flag(uuid, text, text) from public;
revoke all on function public.resolve_question_flag(uuid, text, text) from public;
grant execute on function public.submit_question_flag(uuid, text, text) to authenticated;
grant execute on function public.resolve_question_flag(uuid, text, text) to authenticated;
