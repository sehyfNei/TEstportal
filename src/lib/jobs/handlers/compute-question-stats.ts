import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeQuestionStats,
  groupAttemptsByQuestion,
  type AttemptRecord,
  type SelectedAnswerShape
} from "@/lib/question-bank/question-stats";

// Cap per run so a single nightly pass stays a bounded, predictable query even
// as the bank and attempt history grow; the next night picks up the rest via
// the most-recently-answered-first ordering.
const MAX_ATTEMPTS_PER_RUN = 20_000;
const UPSERT_BATCH_SIZE = 200;

type AnswerRow = {
  question_id: string;
  session_id: string;
  is_correct: boolean | null;
  time_spent_sec: number | null;
  selected_answer: unknown;
};

type ResultRow = {
  session_id: string;
  accuracy: number | string | null;
};

type QuestionFlagRow = {
  id: string;
  flag_count: number | null;
};

export async function computeQuestionStatsJob(
  supabase: SupabaseClient
): Promise<{ questionsUpdated: number; attemptsProcessed: number }> {
  const { data: answerRows, error: answerError } = await supabase
    .from("session_answers")
    .select("question_id,session_id,is_correct,time_spent_sec,selected_answer")
    .not("is_correct", "is", null)
    .order("last_saved_at", { ascending: false })
    .limit(MAX_ATTEMPTS_PER_RUN);

  if (answerError) {
    throw new Error(`[question_stats] session_answers lookup failed: ${answerError.message}`);
  }

  const answers = (answerRows ?? []) as AnswerRow[];
  if (answers.length === 0) {
    return { questionsUpdated: 0, attemptsProcessed: 0 };
  }

  const sessionIds = [...new Set(answers.map((row) => row.session_id))];
  const questionIds = [...new Set(answers.map((row) => row.question_id))];

  const [resultsResponse, flagsResponse] = await Promise.all([
    supabase.from("session_results").select("session_id,accuracy").in("session_id", sessionIds),
    supabase.from("questions").select("id,flag_count").in("id", questionIds)
  ]);

  if (resultsResponse.error) {
    throw new Error(`[question_stats] session_results lookup failed: ${resultsResponse.error.message}`);
  }
  if (flagsResponse.error) {
    throw new Error(`[question_stats] questions lookup failed: ${flagsResponse.error.message}`);
  }

  const accuracyBySession = new Map(
    ((resultsResponse.data ?? []) as ResultRow[]).map((row) => [row.session_id, toNumberOrNull(row.accuracy)])
  );
  const flagCountByQuestion = new Map(
    ((flagsResponse.data ?? []) as QuestionFlagRow[]).map((row) => [row.id, row.flag_count ?? 0])
  );

  const attempts: AttemptRecord[] = answers.map((row) => ({
    questionId: row.question_id,
    isCorrect: Boolean(row.is_correct),
    timeSpentSec: typeof row.time_spent_sec === "number" ? row.time_spent_sec : 0,
    selectedAnswer: toSelectedAnswerShape(row.selected_answer),
    sessionAccuracy: accuracyBySession.get(row.session_id) ?? null
  }));

  const byQuestion = groupAttemptsByQuestion(attempts);
  const rows = [...byQuestion.entries()].map(([questionId, questionAttempts]) => {
    const stats = computeQuestionStats(questionId, questionAttempts, flagCountByQuestion.get(questionId) ?? 0);
    return {
      question_id: stats.questionId,
      total_attempts: stats.totalAttempts,
      correct_attempts: stats.correctAttempts,
      difficulty_index: stats.difficultyIndex,
      discrimination: stats.discrimination,
      point_biserial: stats.pointBiserial,
      avg_time_sec: stats.avgTimeSec,
      stddev_time_sec: stats.stddevTimeSec,
      distractor_dist: stats.distractorDist,
      flag_count: flagCountByQuestion.get(questionId) ?? 0,
      quality_tier: stats.suggestedQualityTier,
      last_calibrated: new Date().toISOString()
    };
  });

  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error: upsertError } = await supabase
      .from("question_stats")
      .upsert(batch, { onConflict: "question_id" });

    if (upsertError) {
      throw new Error(`[question_stats] upsert failed: ${upsertError.message}`);
    }
  }

  return { questionsUpdated: rows.length, attemptsProcessed: answers.length };
}

function toNumberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSelectedAnswerShape(value: unknown): SelectedAnswerShape {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;

  if (Array.isArray(record.options) && record.options.every((v) => typeof v === "number")) {
    return { options: record.options as number[] };
  }
  if (typeof record.integer === "number") {
    return { integer: record.integer };
  }
  return null;
}
