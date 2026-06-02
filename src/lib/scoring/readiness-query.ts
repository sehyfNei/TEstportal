import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeReadinessScore,
  type MasteryRecordForReadiness,
  type ReadinessScore,
  type ReadinessTopicWeight
} from "@/lib/scoring/readiness";

type MasteryRow = {
  topic_id: string | null;
  mastery_score: number | string | null;
  confidence_level: string | null;
  questions_attempted: number | string | null;
  last_tested_at: string | Date | null;
};

type TopicRow = {
  id: string | null;
  weight_percent: number | string | null;
};

type BenchmarkRow = {
  id: string;
};

export async function fetchReadinessScore(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<ReadinessScore> {
  try {
    const { data: masteryRows, error: masteryError } = await supabase
      .from("mastery_records")
      .select("topic_id,mastery_score,confidence_level,questions_attempted,last_tested_at")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .not("topic_id", "is", null);

    if (masteryError) {
      console.error("[readiness] mastery query failed", masteryError);
      return computeReadinessScore({
        masteryRecords: [],
        topicWeights: [],
        hasBenchmarkSession: false
      });
    }

    const { data: topicRows, error: topicError } = await supabase
      .from("topics")
      .select("id,weight_percent")
      .eq("exam_id", examId)
      .not("weight_percent", "is", null);

    if (topicError) {
      console.error("[readiness] topic weight query failed", topicError);
      return computeReadinessScore({
        masteryRecords: [],
        topicWeights: [],
        hasBenchmarkSession: false
      });
    }

    const { data: benchmarkRows, error: benchmarkError } = await supabase
      .from("test_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .eq("status", "scored")
      .in("type", ["benchmark", "mock"])
      .limit(1);

    if (benchmarkError) {
      console.error("[readiness] benchmark query failed", benchmarkError);
      return computeReadinessScore({
        masteryRecords: [],
        topicWeights: [],
        hasBenchmarkSession: false
      });
    }

    const hasBenchmarkSession = (benchmarkRows?.length ?? 0) > 0;

    const masteryRecords: MasteryRecordForReadiness[] = ((masteryRows ?? []) as MasteryRow[]).map(
      (row) => ({
        topicId: row.topic_id,
        masteryScore: toNumber(row.mastery_score),
        confidenceLevel: toConfidenceLevel(row.confidence_level),
        questionsAttempted: toNumber(row.questions_attempted),
        lastTestedAt: row.last_tested_at ? new Date(row.last_tested_at) : null
      })
    );

    const topicWeights: ReadinessTopicWeight[] = ((topicRows ?? []) as TopicRow[])
      .filter((row) => toNumber(row.weight_percent) > 0 && typeof row.id === "string")
      .map((row) => ({
        topicId: row.id as string,
        weightPercent: toNumber(row.weight_percent)
      }));

    return computeReadinessScore({
      masteryRecords,
      topicWeights,
      hasBenchmarkSession
    });
  } catch (error) {
    console.error("[readiness] readiness query failed", error);
    return computeReadinessScore({
      masteryRecords: [],
      topicWeights: [],
      hasBenchmarkSession: false
    });
  }
}

function toConfidenceLevel(value: string | null): "low" | "medium" | "high" {
  return value === "medium" || value === "high" ? value : "low";
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
