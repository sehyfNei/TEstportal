import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWeakTopics } from "@/lib/dashboard/overview";
import { fetchReadinessScore } from "@/lib/scoring/readiness-query";

export type WeakTopicContext = {
  topicName: string;
  masteryScore: number;
  weightPercent: number;
};

export type MistakeContext = {
  topicName: string | null;
  mistakeType: string;
};

export type ContextPayload = {
  examName: string | null;
  readinessScore: number;
  readinessConfidence: "low" | "medium" | "high";
  weakTopics: WeakTopicContext[];
  recentMistakes: MistakeContext[];
  improvementPlanHeadline: string | null;
  hasData: boolean;
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

type MistakeRow = {
  mistake_type: string | null;
  topics: unknown;
};

export async function assembleContext(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<ContextPayload> {
  const [examResult, readinessResult, weakTopicsResult, mistakesResult, planResult] =
    await Promise.allSettled([
      loadExamName(supabase, examId),
      fetchReadinessScore(supabase, userId, examId),
      loadWeakTopicData(supabase, userId, examId),
      loadRecentMistakes(supabase, userId, examId),
      loadPlanHeadline(supabase, userId, examId)
    ]);

  const readiness = readinessResult.status === "fulfilled" ? readinessResult.value : null;
  const weakTopicData =
    weakTopicsResult.status === "fulfilled"
      ? weakTopicsResult.value
      : { topics: [], masteryByTopicId: new Map<string, number>() };
  const weakTopics = buildWeakTopics(weakTopicData.topics, weakTopicData.masteryByTopicId).map(
    (topic) => ({
      topicName: topic.topicName,
      masteryScore: topic.masteryScore,
      weightPercent: topic.weightPercent
    })
  );

  return {
    examName: examResult.status === "fulfilled" ? examResult.value : null,
    readinessScore: readiness?.score ?? 0,
    readinessConfidence: readiness?.confidenceLevel ?? "low",
    weakTopics,
    recentMistakes: mistakesResult.status === "fulfilled" ? mistakesResult.value : [],
    improvementPlanHeadline: planResult.status === "fulfilled" ? planResult.value : null,
    hasData: (readiness?.coveragePercent ?? 0) > 0
  };
}

async function loadExamName(supabase: SupabaseClient, examId: string): Promise<string | null> {
  const { data, error } = await supabase.from("exams").select("name").eq("id", examId).single();

  if (error) {
    throw error;
  }

  return typeof data?.name === "string" ? data.name : null;
}

async function loadWeakTopicData(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ topics: TopicRow[]; masteryByTopicId: Map<string, number> }> {
  const [topicResult, masteryResult] = await Promise.all([
    supabase
      .from("topics")
      .select("id,name,weight_percent")
      .eq("exam_id", examId)
      .not("weight_percent", "is", null),
    supabase
      .from("mastery_records")
      .select("topic_id,mastery_score")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .not("topic_id", "is", null)
  ]);

  if (topicResult.error) {
    throw topicResult.error;
  }

  if (masteryResult.error) {
    throw masteryResult.error;
  }

  const masteryByTopicId = new Map<string, number>();
  for (const row of (masteryResult.data ?? []) as MasteryRow[]) {
    if (row.topic_id) {
      masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
    }
  }

  return {
    topics: (topicResult.data ?? []) as TopicRow[],
    masteryByTopicId
  };
}

async function loadRecentMistakes(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<MistakeContext[]> {
  const { data, error } = await supabase
    .from("mistake_items")
    .select("mistake_type, topics!mistake_items_topic_id_fkey(name)")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "unresolved")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  return ((data ?? []) as MistakeRow[]).map((row) => ({
    topicName: readTopicName(row.topics),
    mistakeType: typeof row.mistake_type === "string" ? row.mistake_type : "unknown"
  }));
}

async function loadPlanHeadline(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("improvement_plans")
    .select("output")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  const output = data?.output;
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return null;
  }

  const headline = (output as Record<string, unknown>).overallStrategy;
  return typeof headline === "string" && headline.trim() ? headline : null;
}

function readTopicName(value: unknown): string | null {
  const topic = Array.isArray(value) ? value[0] : value;

  if (!topic || typeof topic !== "object") {
    return null;
  }

  const name = (topic as { name?: unknown }).name;
  return typeof name === "string" ? name : null;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
