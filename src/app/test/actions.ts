"use server";

import { revalidatePath } from "next/cache";
import { createMistakeItemsJob } from "@/lib/jobs/handlers/create-mistake-items";
import { updateMasteryJob } from "@/lib/jobs/handlers/update-mastery";
import { createSupabaseMasteryRepository } from "@/lib/jobs/handlers/update-mastery-supabase";
import { updateRetestQueueJob } from "@/lib/jobs/handlers/update-retest-queue";
import { isValidQualityTier } from "@/lib/question-bank/quality-tier";
import { toAnalysisView, type AnalysisRow } from "@/lib/ai/analysis-read";
import type { AnalysisView } from "@/lib/ai/analysis-view";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type AuthCheckResult = { ok: false; message: string } | { ok: true; userId: string };

export type SessionPrompt = {
  question_id?: string;
  session_question_id?: string;
  sequence?: number;
  prompt_snapshot?: unknown;
};

export type StartSessionActionState = {
  ok: boolean;
  message: string;
  sessionId?: string;
  expiresAt?: string;
  questions?: SessionPrompt[];
};

export type SaveAnswerActionState = {
  ok: boolean;
  message: string;
  sessionId?: string;
  questionId?: string;
};

export type SubmitSessionActionState = {
  ok: boolean;
  message: string;
  result?: {
    resultId?: string;
    sessionId?: string;
    score?: number;
    maxScore?: number;
    accuracy?: number;
    attempted?: number;
    correct?: number;
    incorrect?: number;
    skipped?: number;
    status?: string;
  };
};

export const initialStartSessionActionState: StartSessionActionState = {
  ok: false,
  message: ""
};

export const initialSaveAnswerActionState: SaveAnswerActionState = {
  ok: false,
  message: ""
};

export const initialSubmitSessionActionState: SubmitSessionActionState = {
  ok: false,
  message: ""
};

export async function startSessionAction(
  _previousState: StartSessionActionState,
  formData: FormData
): Promise<StartSessionActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const examId = getString(formData, "examId");
  const type = getString(formData, "type") || "diagnostic";
  const templateId = nullableString(formData, "templateId");
  const topicId = nullableString(formData, "topicId");
  const count = integerValue(formData, "count", 10);
  const durationMinutes = nullableIntegerValue(formData, "durationMinutes");
  const rawMinQualityTier = getString(formData, "minQualityTier");
  const minQualityTier = isValidQualityTier(rawMinQualityTier) ? rawMinQualityTier : "bronze";

  if (!isUuid(examId)) {
    return { ok: false, message: "Valid exam id is required." };
  }

  if (templateId && !isUuid(templateId)) {
    return { ok: false, message: "Template id must be a valid UUID." };
  }

  if (topicId && !isUuid(topicId)) {
    return { ok: false, message: "Topic id must be a valid UUID." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_test_session", {
    p_exam_id: examId,
    p_type: type,
    p_template_id: templateId,
    p_topic_id: topicId,
    p_count: count,
    p_duration_minutes: durationMinutes,
    p_min_quality_tier: minQualityTier
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = toStartSessionResult(data);
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Started session with ${result.questions.length} question${result.questions.length === 1 ? "" : "s"}.`,
    sessionId: result.session_id,
    expiresAt: result.expires_at,
    questions: result.questions
  };
}

export async function saveAnswerAction(
  _previousState: SaveAnswerActionState,
  formData: FormData
): Promise<SaveAnswerActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const sessionId = getString(formData, "sessionId");
  const questionId = getString(formData, "questionId");
  const confidence = nullableConfidence(formData);
  const markedReview = booleanValue(formData, "markedReview");
  const timeSpentIncrement = integerValue(formData, "timeSpentSec", 0);
  const timeToFirstAnswerMs = nullableIntegerValue(formData, "timeToFirstAnswerMs");
  const revisitIncrement = Math.max(0, integerValue(formData, "revisitIncrement", 1));
  const selectedAnswerResult = parseSelectedAnswer(formData);

  if (!selectedAnswerResult.ok) {
    return { ok: false, message: selectedAnswerResult.message };
  }

  if (!isUuid(sessionId) || !isUuid(questionId)) {
    return { ok: false, message: "Valid session and question ids are required." };
  }

  const supabase = await createClient();
  const sessionResult = await supabase
    .from("test_sessions")
    .select("id,user_id,status,expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionResult.error) {
    return { ok: false, message: sessionResult.error.message };
  }

  const session = sessionResult.data as
    | { expires_at: string | null; id: string; status: string; user_id: string }
    | null;

  if (!session || session.user_id !== auth.userId) {
    return { ok: false, message: "Session not found." };
  }

  if (session.status !== "in_progress") {
    return { ok: false, message: "Answers can only be saved for an in-progress session." };
  }

  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "This session has expired." };
  }

  const sessionQuestionResult = await supabase
    .from("session_questions")
    .select("question_id")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (sessionQuestionResult.error) {
    return { ok: false, message: sessionQuestionResult.error.message };
  }

  if (!sessionQuestionResult.data) {
    return { ok: false, message: "Question does not belong to this session." };
  }

  const existingResult = await supabase
    .from("session_answers")
    .select("time_spent_sec,revisit_count,time_to_first_answer_ms")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (existingResult.error) {
    return { ok: false, message: existingResult.error.message };
  }

  const existing = existingResult.data as
    | {
        revisit_count: number | null;
        time_spent_sec: number | null;
        time_to_first_answer_ms: number | null;
      }
    | null;
  const now = new Date().toISOString();

  const { error } = await supabase.from("session_answers").upsert(
    {
      session_id: sessionId,
      question_id: questionId,
      user_id: auth.userId,
      selected_answer: selectedAnswerResult.selectedAnswer,
      confidence,
      marked_review: markedReview,
      is_correct: null,
      marks_awarded: null,
      time_spent_sec: Math.max(0, existing?.time_spent_sec ?? 0) + Math.max(0, timeSpentIncrement),
      time_to_first_answer_ms: existing?.time_to_first_answer_ms ?? timeToFirstAnswerMs,
      revisit_count: Math.max(0, existing?.revisit_count ?? 0) + revisitIncrement,
      answered_at: selectedAnswerResult.selectedAnswer === null ? null : now,
      last_saved_at: now
    },
    { onConflict: "session_id,question_id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "Answer saved.",
    sessionId,
    questionId
  };
}

export async function logTabSwitchAction(formData: FormData): Promise<void> {
  if (!hasSupabaseConfig()) {
    return;
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return;
  }

  const sessionId = getString(formData, "sessionId");

  if (!isUuid(sessionId)) {
    return;
  }

  const supabase = await createClient();
  const sessionResult = await supabase
    .from("test_sessions")
    .select("id,user_id,status,metadata,tab_switch_count")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionResult.error) {
    return;
  }

  const session = sessionResult.data as
    | {
        id: string;
        metadata: unknown;
        status: string;
        tab_switch_count: number | null;
        user_id: string;
      }
    | null;

  if (!session || session.user_id !== auth.userId || session.status !== "in_progress") {
    return;
  }

  const metadata = toMetadataRecord(session.metadata);
  const tabSwitches = numericMetadataValue(metadata.tabSwitches) + 1;

  await supabase
    .from("test_sessions")
    .update({
      metadata: {
        ...metadata,
        tabSwitches
      },
      tab_switch_count: Math.max(0, session.tab_switch_count ?? 0) + 1
    })
    .eq("id", sessionId);
}

export async function submitSessionAction(
  _previousState: SubmitSessionActionState,
  formData: FormData
): Promise<SubmitSessionActionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const sessionId = getString(formData, "sessionId");

  if (!isUuid(sessionId)) {
    return { ok: false, message: "Valid session id is required." };
  }

  const supabase = await createClient();
  const statusResult = await supabase.from("test_sessions").select("status").eq("id", sessionId).maybeSingle();

  if (statusResult.error) {
    return { ok: false, message: statusResult.error.message };
  }

  const wasAlreadyScored =
    (statusResult.data as { status?: string } | null | undefined)?.status === "scored";
  const { data, error } = await supabase.rpc("submit_test_session", {
    p_session_id: sessionId
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = toSubmitSessionResult(data);
  if (result.resultId && !wasAlreadyScored) {
    try {
      await updateMasteryJob(result.resultId, createSupabaseMasteryRepository(supabase));
    } catch (masteryError) {
      console.error("[mastery] update failed for result", result.resultId, masteryError);
    }

    try {
      await createMistakeItemsJob(result.resultId, supabase);
    } catch (mistakeError) {
      console.error("[mistake] create failed for result", result.resultId, mistakeError);
    }

    try {
      await updateRetestQueueJob(result.resultId, supabase);
    } catch (retestError) {
      console.error("[retest] update failed for result", result.resultId, retestError);
    }

    try {
      const { generateAnalysisJob } = await import("@/lib/ai/jobs/generate-analysis");
      await generateAnalysisJob(result.resultId, auth.userId, supabase);
    } catch (analysisError) {
      console.error("[analysis] failed for result", result.resultId, analysisError);
    }
  }

  revalidatePath("/dashboard");

  return {
    ok: true,
    message: "Session scored.",
    result
  };
}

export type AnalysisActionResult =
  | { ok: true; analysis: AnalysisView }
  | { ok: false; message: string };

export async function getSessionAnalysisAction(
  sessionId: string
): Promise<AnalysisActionResult> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!isUuid(sessionId)) {
    return { ok: false, message: "Valid session id is required." };
  }

  const supabase = await createClient();
  const resultLookup = await supabase
    .from("session_results")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (resultLookup.error) {
    return { ok: false, message: resultLookup.error.message };
  }

  const resultId = (resultLookup.data as { id: string } | null)?.id;
  if (!resultId) {
    return { ok: true, analysis: { status: "absent", output: null } };
  }

  const analysisLookup = await supabase
    .from("ai_analyses")
    .select("status,output")
    .eq("session_result_id", resultId)
    .maybeSingle();

  if (analysisLookup.error) {
    return { ok: false, message: analysisLookup.error.message };
  }

  return {
    ok: true,
    analysis: toAnalysisView(analysisLookup.data as AnalysisRow | null)
  };
}

async function requireAuth(): Promise<AuthCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, message: error?.message ?? "Sign in to continue." };
  }

  return { ok: true, userId: user.id };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? value : null;
}

function integerValue(formData: FormData, key: string, fallback: number) {
  const value = getString(formData, key);
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function nullableIntegerValue(formData: FormData, key: string) {
  const value = getString(formData, key);
  const parsed = Number(value);
  return value && Number.isInteger(parsed) ? parsed : null;
}

function booleanValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function nullableConfidence(formData: FormData) {
  const value = getString(formData, "confidence");
  return value === "sure" || value === "unsure" || value === "guessed" ? value : null;
}

function parseSelectedAnswer(formData: FormData):
  | { ok: true; selectedAnswer: unknown }
  | { ok: false; message: string } {
  const value = getString(formData, "selectedAnswer");

  if (!value) {
    return { ok: true, selectedAnswer: null };
  }

  try {
    const selectedAnswer = JSON.parse(value) as unknown;

    if (
      selectedAnswer !== null &&
      (typeof selectedAnswer !== "object" || Array.isArray(selectedAnswer))
    ) {
      return { ok: false, message: "Selected answer must be a JSON object or null." };
    }

    return { ok: true, selectedAnswer };
  } catch {
    return { ok: false, message: "Selected answer must be valid JSON." };
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toStartSessionResult(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const questions = Array.isArray(record.questions) ? (record.questions as SessionPrompt[]) : [];

  return {
    session_id: typeof record.session_id === "string" ? record.session_id : undefined,
    expires_at: typeof record.expires_at === "string" ? record.expires_at : undefined,
    questions
  };
}

function toSubmitSessionResult(value: unknown): SubmitSessionActionState["result"] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    resultId: stringField(record, "result_id"),
    sessionId: stringField(record, "session_id"),
    score: numberField(record, "score"),
    maxScore: numberField(record, "max_score"),
    accuracy: numberField(record, "accuracy"),
    attempted: numberField(record, "attempted"),
    correct: numberField(record, "correct"),
    incorrect: numberField(record, "incorrect"),
    skipped: numberField(record, "skipped"),
    status: stringField(record, "status")
  };
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
}

function toMetadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numericMetadataValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
