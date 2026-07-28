import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLadderRevisionSchedule, readLadderSchedulerState } from "@/lib/adaptive/ladder-scheduler";

type ResultRow = { user_id: string; exam_id: string; session_id: string };
type SessionQuestionRow = { question_id: string; sequence: number };
type AnswerRow = { question_id: string; is_correct: boolean | null };

export type RungResult = { questionId: string; rung: number; correct: boolean };

/**
 * Runs in the submit side-effect fan-out (src/app/test/actions.ts) alongside
 * updateMasteryJob/updatePathProgressJob. A no-op for any session that isn't
 * a topic_ladder attempt. Records per-rung correctness, and on a clean sweep
 * (all rungs correct) schedules the first spaced-revision check via
 * retest_queue - the existing due-retests dashboard surface and
 * startRetestAction pick this up with no further changes, since a
 * topic-keyed retest_queue row is already exactly what they render/start.
 */
export async function updateLadderProgressJob(resultId: string, supabase: SupabaseClient): Promise<void> {
  const { data: result, error: resultError } = await supabase
    .from("session_results")
    .select("user_id,exam_id,session_id")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError || !result) {
    throw new Error(`[ladder] session_results lookup failed for ${resultId}: ${resultError?.message ?? "not found"}`);
  }

  const { user_id: userId, exam_id: examId, session_id: sessionId } = result as ResultRow;

  const { data: session, error: sessionError } = await supabase
    .from("test_sessions")
    .select("type,metadata")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`[ladder] test_sessions lookup failed: ${sessionError.message}`);
  }

  const sessionRow = session as { type?: string; metadata?: unknown } | null;

  if (!sessionRow || sessionRow.type !== "topic_ladder") {
    return;
  }

  const topicId = readTopicId(sessionRow.metadata);

  if (!topicId) {
    throw new Error(`[ladder] topic_ladder session ${sessionId} has no topicId in metadata`);
  }

  const [questionsResult, answersResult] = await Promise.all([
    supabase
      .from("session_questions")
      .select("question_id,sequence")
      .eq("session_id", sessionId)
      .order("sequence", { ascending: true }),
    supabase.from("session_answers").select("question_id,is_correct").eq("session_id", sessionId)
  ]);

  if (questionsResult.error) {
    throw new Error(`[ladder] session_questions lookup failed: ${questionsResult.error.message}`);
  }

  if (answersResult.error) {
    throw new Error(`[ladder] session_answers lookup failed: ${answersResult.error.message}`);
  }

  const correctByQuestionId = new Map<string, boolean>();
  for (const row of (answersResult.data ?? []) as AnswerRow[]) {
    correctByQuestionId.set(row.question_id, row.is_correct === true);
  }

  const rungResults: RungResult[] = ((questionsResult.data ?? []) as SessionQuestionRow[]).map((row) => ({
    questionId: row.question_id,
    rung: row.sequence,
    correct: correctByQuestionId.get(row.question_id) ?? false
  }));

  const allCorrect = rungResults.length > 0 && rungResults.every((rung) => rung.correct);
  const now = new Date();

  const { data: existingProgress } = await supabase
    .from("topic_ladder_progress")
    .select("cycle_count")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("topic_id", topicId)
    .maybeSingle();

  const cycleCount = (existingProgress as { cycle_count?: number } | null)?.cycle_count ?? 1;

  const { error: upsertError } = await supabase.from("topic_ladder_progress").upsert(
    {
      user_id: userId,
      exam_id: examId,
      topic_id: topicId,
      rung_index: rungResults.length,
      rung_results: rungResults,
      completed_at: allCorrect ? now.toISOString() : null,
      cycle_count: cycleCount,
      updated_at: now.toISOString()
    },
    { onConflict: "user_id,exam_id,topic_id" }
  );

  if (upsertError) {
    throw new Error(`[ladder] topic_ladder_progress upsert failed: ${upsertError.message}`);
  }

  if (!allCorrect) {
    return;
  }

  const daysToExam = await loadDaysToExam(supabase, userId, examId);
  const schedule = computeLadderRevisionSchedule(1, now.getTime(), daysToExam);

  const { data: existingQueueRow } = await supabase
    .from("retest_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("topic_id", topicId)
    .in("status", ["due", "scheduled", "snoozed"])
    .maybeSingle();

  if (existingQueueRow) {
    const { error: updateError } = await supabase
      .from("retest_queue")
      .update({
        due_at: schedule.dueAt.toISOString(),
        scheduler: "simple",
        scheduler_state: schedule.schedulerState,
        status: "due",
        priority: 1
      })
      .eq("id", (existingQueueRow as { id: string }).id);

    if (updateError) {
      throw new Error(`[ladder] retest_queue update failed: ${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabase.from("retest_queue").insert({
    user_id: userId,
    exam_id: examId,
    topic_id: topicId,
    due_at: schedule.dueAt.toISOString(),
    scheduler: "simple",
    scheduler_state: schedule.schedulerState,
    priority: 1,
    status: "due"
  });

  if (insertError) {
    throw new Error(`[ladder] retest_queue insert failed: ${insertError.message}`);
  }
}

/**
 * Runs when a `concept_retest` session completes (src/app/test/actions.ts,
 * right after the existing "mark retest_queue completed" step). A no-op
 * unless the just-completed row was ladder-sourced and is cycle 1 - in that
 * case it books cycle 2 (~6 weeks post-mastery) so the second check isn't
 * lost once the first one is answered.
 */
export async function completeLadderRevisionCheck(
  retestQueueId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data, error } = await supabase
    .from("retest_queue")
    .select("user_id,exam_id,topic_id,scheduler_state")
    .eq("id", retestQueueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const row = data as {
    user_id: string;
    exam_id: string;
    topic_id: string | null;
    scheduler_state: unknown;
  };
  const ladderState = readLadderSchedulerState(row.scheduler_state);

  if (!ladderState || ladderState.cycle !== 1 || !row.topic_id) {
    return;
  }

  const daysToExam = await loadDaysToExam(supabase, row.user_id, row.exam_id);
  const masteredAtMs = new Date(ladderState.masteredAt).getTime();
  const schedule = computeLadderRevisionSchedule(2, masteredAtMs, daysToExam);

  const { error: insertError } = await supabase.from("retest_queue").insert({
    user_id: row.user_id,
    exam_id: row.exam_id,
    topic_id: row.topic_id,
    due_at: schedule.dueAt.toISOString(),
    scheduler: "simple",
    scheduler_state: schedule.schedulerState,
    priority: 1,
    status: "due"
  });

  if (insertError) {
    throw new Error(`[ladder] cycle-2 retest_queue insert failed: ${insertError.message}`);
  }
}

async function loadDaysToExam(supabase: SupabaseClient, userId: string, examId: string): Promise<number | null> {
  const { data } = await supabase
    .from("learning_paths")
    .select("target_date")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "active")
    .maybeSingle();

  const targetDate = (data as { target_date?: string | null } | null)?.target_date;

  if (!targetDate) {
    return null;
  }

  const diffMs = new Date(targetDate).getTime() - Date.now();
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return Number.isFinite(days) ? days : null;
}

function readTopicId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const selection = (metadata as Record<string, unknown>).selection;

  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    return null;
  }

  const topicId = (selection as Record<string, unknown>).topicId;
  return typeof topicId === "string" ? topicId : null;
}
