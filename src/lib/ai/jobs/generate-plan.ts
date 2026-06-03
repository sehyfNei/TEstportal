import type { SupabaseClient } from "@supabase/supabase-js";
import { callAi } from "@/lib/ai/gateway";
import {
  PLAN_PROMPT_VERSION,
  PLAN_SCHEMA_VERSION,
  buildPlanMessages,
  validatePlanOutput,
  type PlanInput
} from "@/lib/ai/schemas/plan";
import { buildWeakTopics, type WeakTopic } from "@/lib/dashboard/overview";
import { fetchReadinessScore } from "@/lib/scoring/readiness-query";
import type { ReadinessScore } from "@/lib/scoring/readiness";

export type PlanSource = {
  resultId: string;
  userId: string;
  examId: string;
  examName: string;
  score: number;
  maxScore: number;
  accuracy: number;
  readiness: ReadinessScore;
  weakTopics: WeakTopic[];
};

export type PlanJobFinalStatus = "completed" | "failed" | "disabled";

export type InsertRunningResult = {
  conflict: boolean;
  error: string | null;
};

export type PlanJobStore = {
  insertRunningRow(resultId: string, userId: string, examId: string): Promise<InsertRunningResult>;
  finalizeRow(
    resultId: string,
    status: PlanJobFinalStatus,
    output: unknown,
    errorMessage: string | null
  ): Promise<void>;
  loadSource(resultId: string): Promise<PlanSource | null>;
};

export type GeneratePlanDeps = {
  callAiFn?: typeof callAi;
  store?: PlanJobStore;
};

type ResultRow = {
  user_id: string;
  exam_id: string;
  score: number | string | null;
  max_score: number | string | null;
  accuracy: number | string | null;
};

type ExamRow = {
  name: string | null;
};

type TopicRow = {
  id: string;
  name: string;
  weight_percent: number | string | null;
};

type MasteryRow = {
  topic_id: string | null;
  mastery_score: number | string | null;
};

export async function generatePlanJob(
  resultId: string,
  userId: string,
  examId: string,
  supabase: SupabaseClient,
  deps: GeneratePlanDeps = {}
): Promise<void> {
  const callAiFn = deps.callAiFn ?? callAi;
  const store = deps.store ?? createSupabasePlanStore(supabase);

  const insertResult = await store.insertRunningRow(resultId, userId, examId);
  if (insertResult.conflict) {
    return;
  }

  if (insertResult.error) {
    console.error("[plan] insert failed for result", resultId, insertResult.error);
    return;
  }

  let source: PlanSource | null;
  try {
    source = await store.loadSource(resultId);
  } catch (error) {
    await store.finalizeRow(resultId, "failed", null, `load_failed:${errorText(error)}`);
    return;
  }

  if (!source) {
    await store.finalizeRow(resultId, "failed", null, "result_not_found");
    return;
  }

  if (source.userId !== userId) {
    await store.finalizeRow(resultId, "failed", null, "user_mismatch");
    return;
  }

  const input = buildPlanInput(source);
  if (!input) {
    await store.finalizeRow(resultId, "failed", null, "no_weak_topics");
    return;
  }

  const aiResult = await callAiSafely(callAiFn, resultId, userId, input);
  if (!aiResult.ok) {
    const status = aiResult.status === "disabled" ? "disabled" : "failed";
    await store.finalizeRow(resultId, status, null, `ai_error:${aiResult.error}`);
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(aiResult.content);
  } catch {
    await store.finalizeRow(resultId, "failed", null, "json_parse_error");
    return;
  }

  const validation = validatePlanOutput(parsed);
  if (!validation.ok) {
    await store.finalizeRow(
      resultId,
      "failed",
      null,
      `validation_failed:${validation.errors.slice(0, 3).join("; ")}`
    );
    return;
  }

  await store.finalizeRow(resultId, "completed", validation.data, null);
}

export function buildPlanInput(source: PlanSource): PlanInput | null {
  if (source.weakTopics.length === 0) {
    return null;
  }

  return {
    examName: source.examName,
    readinessScore: source.readiness.score,
    confidenceLevel: source.readiness.confidenceLevel,
    coveragePercent: source.readiness.coveragePercent,
    score: source.score,
    maxScore: source.maxScore,
    accuracy: source.accuracy,
    weakTopics: source.weakTopics.map((topic) => ({
      topicName: topic.topicName,
      masteryScore: topic.masteryScore,
      weightPercent: topic.weightPercent,
      priority: topic.priority
    }))
  };
}

export function createSupabasePlanStore(supabase: SupabaseClient): PlanJobStore {
  return {
    insertRunningRow,
    finalizeRow,
    loadSource
  };

  async function insertRunningRow(
    resultId: string,
    userId: string,
    examId: string
  ): Promise<InsertRunningResult> {
    const { error } = await supabase.from("improvement_plans").insert({
      session_result_id: resultId,
      user_id: userId,
      exam_id: examId,
      status: "running",
      schema_version: PLAN_SCHEMA_VERSION,
      prompt_version: PLAN_PROMPT_VERSION
    });

    if (error?.code === "23505") {
      return { conflict: true, error: null };
    }

    if (error) {
      return { conflict: false, error: error.message };
    }

    return { conflict: false, error: null };
  }

  async function finalizeRow(
    resultId: string,
    status: PlanJobFinalStatus,
    output: unknown,
    errorMessage: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from("improvement_plans")
      .update({
        status,
        output: output ?? null,
        error_message: truncateError(errorMessage),
        updated_at: new Date().toISOString()
      })
      .eq("session_result_id", resultId);

    if (error) {
      throw new Error(`Failed to finalize improvement plan row: ${error.message}`);
    }
  }

  async function loadSource(resultId: string): Promise<PlanSource | null> {
    const { data: result, error: resultError } = await supabase
      .from("session_results")
      .select("user_id,exam_id,score,max_score,accuracy")
      .eq("id", resultId)
      .maybeSingle();

    if (resultError) {
      throw new Error(`Failed to load session result for plan: ${resultError.message}`);
    }

    if (!result) {
      return null;
    }

    const resultRow = result as ResultRow;
    const userId = resultRow.user_id;
    const examId = resultRow.exam_id;

    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("name")
      .eq("id", examId)
      .maybeSingle();

    if (examError) {
      throw new Error(`Failed to load exam for plan: ${examError.message}`);
    }

    const [readiness, weakTopics] = await Promise.all([
      fetchReadinessScore(supabase, userId, examId),
      loadWeakTopics(supabase, userId, examId)
    ]);

    return {
      resultId,
      userId,
      examId,
      examName: ((exam as ExamRow | null)?.name ?? "Exam").trim() || "Exam",
      score: toNumber(resultRow.score),
      maxScore: toNumber(resultRow.max_score),
      accuracy: toNumber(resultRow.accuracy),
      readiness,
      weakTopics
    };
  }

  async function loadWeakTopics(
    supabaseClient: SupabaseClient,
    userId: string,
    examId: string
  ): Promise<WeakTopic[]> {
    const [topicResult, masteryResult] = await Promise.all([
      supabaseClient
        .from("topics")
        .select("id,name,weight_percent")
        .eq("exam_id", examId)
        .not("weight_percent", "is", null),
      supabaseClient
        .from("mastery_records")
        .select("topic_id,mastery_score")
        .eq("user_id", userId)
        .eq("exam_id", examId)
        .not("topic_id", "is", null)
    ]);

    if (topicResult.error) {
      throw new Error(`Failed to load topics for plan: ${topicResult.error.message}`);
    }

    if (masteryResult.error) {
      throw new Error(`Failed to load mastery for plan: ${masteryResult.error.message}`);
    }

    const masteryByTopicId = new Map<string, number>();
    for (const row of (masteryResult.data ?? []) as MasteryRow[]) {
      if (row.topic_id) {
        masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
      }
    }

    const topics = (topicResult.data ?? []) as TopicRow[];
    return buildWeakTopics(topics, masteryByTopicId);
  }
}

async function callAiSafely(
  callAiFn: typeof callAi,
  resultId: string,
  userId: string,
  input: PlanInput
): ReturnType<typeof callAi> {
  try {
    return await callAiFn({
      feature: "improvement_plan",
      messages: buildPlanMessages(input),
      promptVersion: PLAN_PROMPT_VERSION,
      outputSchemaVersion: PLAN_SCHEMA_VERSION,
      userId,
      jsonMode: true,
      relatedEntityType: "session_result",
      relatedEntityId: resultId
    });
  } catch (error) {
    console.error("[plan] AI call threw for result", resultId, error);

    return {
      ok: false,
      error: "network_error",
      status: "failed",
      latencyMs: 0
    };
  }
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function truncateError(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.length > 1000 ? value.slice(0, 1000) : value;
}
