import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchReadinessScore } from "@/lib/scoring/readiness-query";
import type { ReadinessScore } from "@/lib/scoring/readiness";

export type WeakTopic = {
  topicId: string;
  topicName: string;
  masteryScore: number;
  weightPercent: number;
  priority: number;
};

export type DueRetest = {
  id: string;
  conceptId: string | null;
  topicId: string | null;
  dueAt: string;
  priority: number;
  scheduler: string;
};

export type RecentSession = {
  sessionId: string;
  type: string;
  score: number;
  maxScore: number;
  accuracy: number;
  createdAt: string;
};

export type StrategyMetrics = {
  negativeMarksLost: number;
  highConfidenceWrong: number;
  correctGuessed: number;
  totalRevisits: number;
  timeOnWrongSec: number;
  timeOnSkippedSec: number;
};

export type DashboardOverview = {
  examId: string;
  readiness: ReadinessScore;
  weakTopics: WeakTopic[];
  dueRetests: DueRetest[];
  overdueRetestCount: number;
  recentSessions: RecentSession[];
  unresolvedMistakeCount: number;
  strategyMetrics: StrategyMetrics | null;
};

type TopicRow = {
  id: string;
  name: string;
  weight_percent: number | string | null;
};

const READINESS_ZERO: ReadinessScore = {
  score: 0,
  confidenceLevel: "low",
  coveragePercent: 0,
  staleTopicIds: [],
  hasBenchmarkSession: false,
  breakdown: {}
};

/** Priority score: higher weight and lower mastery means higher urgency. */
export function computeWeakTopicPriority(weightPercent: number, masteryScore: number): number {
  const weight = Number.isFinite(weightPercent) ? Math.max(0, weightPercent) : 0;
  const mastery = Number.isFinite(masteryScore)
    ? Math.min(100, Math.max(0, masteryScore))
    : 0;

  return (weight / 100) * (100 - mastery);
}

export function buildWeakTopics(
  topics: TopicRow[],
  masteryByTopicId: Map<string, number>
): WeakTopic[] {
  return topics
    .map((topic) => {
      const weightPercent = toNumber(topic.weight_percent);
      const masteryScore = masteryByTopicId.get(topic.id) ?? 0;

      return {
        topicId: topic.id,
        topicName: topic.name,
        masteryScore,
        weightPercent,
        priority: computeWeakTopicPriority(weightPercent, masteryScore)
      };
    })
    .filter((topic) => topic.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

export function toStrategyMetrics(value: unknown): StrategyMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  return {
    negativeMarksLost: toNumber(row.negativeMarksLost),
    highConfidenceWrong: toNumber(row.highConfidenceWrong),
    correctGuessed: toNumber(row.correctGuessed),
    totalRevisits: toNumber(row.totalRevisits),
    timeOnWrongSec: toNumber(row.timeOnWrongSec),
    timeOnSkippedSec: toNumber(row.timeOnSkippedSec)
  };
}

export async function fetchDashboardOverview(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<DashboardOverview> {
  const [readinessResult, weakTopicsResult, retestsResult, sessionsResult, mistakeCountResult] =
    await Promise.allSettled([
      fetchReadinessScore(supabase, userId, examId),
      loadWeakTopics(supabase, userId, examId),
      loadDueRetests(supabase, userId, examId),
      loadRecentSessions(supabase, userId, examId),
      loadUnresolvedMistakeCount(supabase, userId, examId)
    ]);

  return {
    examId,
    readiness: readinessResult.status === "fulfilled" ? readinessResult.value : READINESS_ZERO,
    weakTopics: weakTopicsResult.status === "fulfilled" ? weakTopicsResult.value.weakTopics : [],
    dueRetests: retestsResult.status === "fulfilled" ? retestsResult.value.dueRetests : [],
    overdueRetestCount:
      retestsResult.status === "fulfilled" ? retestsResult.value.overdueRetestCount : 0,
    recentSessions:
      sessionsResult.status === "fulfilled" ? sessionsResult.value.recentSessions : [],
    unresolvedMistakeCount:
      mistakeCountResult.status === "fulfilled" ? mistakeCountResult.value : 0,
    strategyMetrics:
      sessionsResult.status === "fulfilled" ? sessionsResult.value.strategyMetrics : null
  };
}

async function loadWeakTopics(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ weakTopics: WeakTopic[] }> {
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
  for (const row of (masteryResult.data ?? []) as Array<{
    topic_id: string | null;
    mastery_score: number | string | null;
  }>) {
    if (row.topic_id) {
      masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
    }
  }

  const topics = (topicResult.data ?? []) as TopicRow[];
  return { weakTopics: buildWeakTopics(topics, masteryByTopicId) };
}

// Exported for reuse on /mistakes (TSP-186) — retests are due-date gated and
// this is the single source for what is startable right now.
export async function loadDueRetests(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ dueRetests: DueRetest[]; overdueRetestCount: number }> {
  const { data, error } = await supabase
    .from("retest_queue")
    .select("id,concept_id,topic_id,due_at,priority,scheduler")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "due")
    .order("due_at", { ascending: true })
    .order("priority", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    concept_id: string | null;
    topic_id: string | null;
    due_at: string;
    priority: number | string | null;
    scheduler: string;
  }>;
  const now = new Date().toISOString();

  return {
    dueRetests: rows.slice(0, 10).map((row) => ({
      id: row.id,
      conceptId: row.concept_id,
      topicId: row.topic_id,
      dueAt: row.due_at,
      priority: toNumber(row.priority),
      scheduler: row.scheduler
    })),
    overdueRetestCount: rows.filter((row) => row.due_at <= now).length
  };
}

async function loadRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<{ recentSessions: RecentSession[]; strategyMetrics: StrategyMetrics | null }> {
  const { data: resultRows, error: resultError } = await supabase
    .from("session_results")
    .select("session_id,score,max_score,accuracy,strategy_metrics,created_at")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (resultError) {
    throw resultError;
  }

  const results = (resultRows ?? []) as Array<{
    session_id: string;
    score: number | string | null;
    max_score: number | string | null;
    accuracy: number | string | null;
    strategy_metrics: unknown;
    created_at: string;
  }>;

  if (results.length === 0) {
    return { recentSessions: [], strategyMetrics: null };
  }

  const { data: sessionRows } = await supabase
    .from("test_sessions")
    .select("id,type")
    .in(
      "id",
      results.map((result) => result.session_id)
    );

  const typeBySessionId = new Map<string, string>();
  for (const row of (sessionRows ?? []) as Array<{ id: string; type: string }>) {
    typeBySessionId.set(row.id, row.type);
  }

  return {
    recentSessions: results.map((result) => ({
      sessionId: result.session_id,
      type: typeBySessionId.get(result.session_id) ?? "unknown",
      score: toNumber(result.score),
      maxScore: toNumber(result.max_score),
      accuracy: toNumber(result.accuracy),
      createdAt: result.created_at
    })),
    strategyMetrics: toStrategyMetrics(results[0]?.strategy_metrics ?? null)
  };
}

async function loadUnresolvedMistakeCount(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("mistake_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("status", "unresolved");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
