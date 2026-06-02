export type ReadinessTopicWeight = {
  topicId: string;
  weightPercent: number;
};

export type MasteryRecordForReadiness = {
  topicId: string | null;
  masteryScore: number;
  confidenceLevel: "low" | "medium" | "high";
  questionsAttempted: number;
  lastTestedAt: Date | null;
};

export type ReadinessInput = {
  masteryRecords: MasteryRecordForReadiness[];
  topicWeights: ReadinessTopicWeight[];
  hasBenchmarkSession: boolean;
  nowMs?: number;
};

export type TopicBreakdown = {
  masteryScore: number;
  weight: number;
  contribution: number;
  covered: boolean;
  stale: boolean;
};

export type ReadinessConfidenceLevel = "low" | "medium" | "high";

export type ReadinessScore = {
  score: number;
  confidenceLevel: ReadinessConfidenceLevel;
  coveragePercent: number;
  staleTopicIds: string[];
  hasBenchmarkSession: boolean;
  breakdown: Record<string, TopicBreakdown>;
};

export const STALE_THRESHOLD_DAYS = 14;
export const BENCHMARK_FACTOR_WITH = 1.0;
export const BENCHMARK_FACTOR_WITHOUT = 0.9;
export const RECENCY_DEDUCTION_PER_STALE = 0.02;
export const RECENCY_FLOOR = 0.8;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeReadinessScore(input: ReadinessInput): ReadinessScore {
  const nowMs = input.nowMs ?? Date.now();
  const hasBenchmarkSession = input.hasBenchmarkSession;
  const totalWeight = input.topicWeights.reduce((sum, topic) => sum + topic.weightPercent, 0);

  if (input.topicWeights.length === 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) {
    return zeroReadiness(hasBenchmarkSession);
  }

  const normalizedWeights = input.topicWeights.map((topic) => ({
    topicId: topic.topicId,
    weight: topic.weightPercent / totalWeight
  }));

  const masteryByTopic = new Map<string, MasteryRecordForReadiness>();
  for (const record of input.masteryRecords) {
    if (record.topicId) {
      masteryByTopic.set(record.topicId, record);
    }
  }

  let weightedSum = 0;
  let coveredWeight = 0;
  let staleCount = 0;
  const staleTopicIds: string[] = [];
  const breakdown: Record<string, TopicBreakdown> = {};

  for (const { topicId, weight } of normalizedWeights) {
    const record = masteryByTopic.get(topicId);
    const masteryScore = record ? toNumber(record.masteryScore) : 0;
    const covered = (record?.questionsAttempted ?? 0) > 0;
    const stale = isStale(record?.lastTestedAt ?? null, nowMs);

    if (covered) {
      coveredWeight += weight;
    }

    if (stale && record?.topicId) {
      staleCount += 1;
      staleTopicIds.push(record.topicId);
    }

    weightedSum += masteryScore * weight;
    breakdown[topicId] = {
      masteryScore,
      weight,
      contribution: masteryScore * weight,
      covered,
      stale
    };
  }

  const benchmarkFactor = hasBenchmarkSession ? BENCHMARK_FACTOR_WITH : BENCHMARK_FACTOR_WITHOUT;
  const recencyFactor = Math.max(RECENCY_FLOOR, 1.0 - staleCount * RECENCY_DEDUCTION_PER_STALE);
  const score = roundScore(weightedSum * benchmarkFactor * recencyFactor);
  const confidenceLevel = deriveReadinessConfidence(
    coveredWeight,
    hasBenchmarkSession,
    averageConfidenceLevel(
      input.masteryRecords
        .filter((record) => record.topicId && record.questionsAttempted > 0)
        .map((record) => record.confidenceLevel)
    )
  );

  return {
    score,
    confidenceLevel,
    coveragePercent: coveredWeight,
    staleTopicIds,
    hasBenchmarkSession,
    breakdown
  };
}

export function deriveReadinessConfidence(
  coverage: number,
  hasBenchmarkSession: boolean,
  avgTopicConfidence: ReadinessConfidenceLevel
): ReadinessConfidenceLevel {
  if (coverage < 0.3 || avgTopicConfidence === "low") {
    return "low";
  }

  if (coverage >= 0.7 && hasBenchmarkSession && avgTopicConfidence !== "low") {
    return "high";
  }

  return "medium";
}

export function averageConfidenceLevel(
  levels: ReadinessConfidenceLevel[]
): ReadinessConfidenceLevel {
  if (levels.length === 0) {
    return "low";
  }

  const numericMap: Record<ReadinessConfidenceLevel, number> = {
    low: 0,
    medium: 1,
    high: 2
  };

  const average = levels.reduce((sum, level) => sum + numericMap[level], 0) / levels.length;
  if (average < 0.5) {
    return "low";
  }

  if (average < 1.5) {
    return "medium";
  }

  return "high";
}

export function isStale(lastTestedAt: Date | null, nowMs: number): boolean {
  if (!lastTestedAt) {
    return false;
  }

  return (nowMs - lastTestedAt.getTime()) / MS_PER_DAY > STALE_THRESHOLD_DAYS;
}

export function zeroReadiness(hasBenchmarkSession: boolean): ReadinessScore {
  return {
    score: 0,
    confidenceLevel: "low",
    coveragePercent: 0,
    staleTopicIds: [],
    hasBenchmarkSession,
    breakdown: {}
  };
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
