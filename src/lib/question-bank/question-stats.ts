// Nightly question calibration (TSP-098) — pure statistics over accumulated attempts.
//
// Writes only to `question_stats` (the calibration/analytics record), never to
// `questions.quality_tier` directly: that column already has a live, RPC-driven
// auto-quarantine path (TSP-028) and is read by every selection query, so an
// automatic nightly overwrite would change what students see without review.
// `question_stats.quality_tier` is instead an advisory *suggested* tier an
// admin can act on — same "advisory, never auto-applied" precedent as the
// AI enrichment (TSP-167) and duplicate check (TSP-032) features.

export type SelectedAnswerShape = { options: number[] } | { integer: number } | null;

export type AttemptRecord = {
  questionId: string;
  isCorrect: boolean;
  timeSpentSec: number;
  selectedAnswer: SelectedAnswerShape;
  /** Overall accuracy (0..1) of the session this attempt belongs to; null if unavailable. */
  sessionAccuracy: number | null;
};

export type QuestionStatsResult = {
  questionId: string;
  totalAttempts: number;
  correctAttempts: number;
  difficultyIndex: number | null;
  discrimination: number | null;
  pointBiserial: number | null;
  avgTimeSec: number | null;
  stddevTimeSec: number | null;
  distractorDist: Record<string, number>;
  suggestedQualityTier: "gold" | "silver" | "bronze" | "quarantine";
};

// Minimum attempts before a discrimination/point-biserial figure is trustworthy
// enough to report rather than null (too few pairs makes both statistics noisy).
export const MIN_ATTEMPTS_FOR_DISCRIMINATION = 8;
// Kelley (1939) upper/lower split fraction for the classical D-index.
const DISCRIMINATION_SPLIT_FRACTION = 0.27;

// Suggested-tier thresholds. Named and grouped here so they can be retuned
// without touching the aggregation logic.
const TIER_THRESHOLDS = {
  quarantineFlagCount: 3, // mirrors TSP-028's auto-quarantine threshold
  quarantineMinAttempts: 20,
  quarantineDegenerateLow: 0.05, // almost nobody gets it right
  quarantineDegenerateHigh: 0.98, // almost everybody gets it right
  quarantineNegativeDiscrimination: -0.1, // weaker students do better: likely a bad key
  goldMinAttempts: 20,
  goldMinDiscrimination: 0.3,
  goldDifficultyBand: [0.2, 0.9] as const,
  silverMinAttempts: MIN_ATTEMPTS_FOR_DISCRIMINATION
};

export function groupAttemptsByQuestion(
  attempts: AttemptRecord[]
): Map<string, AttemptRecord[]> {
  const byQuestion = new Map<string, AttemptRecord[]>();
  for (const attempt of attempts) {
    const existing = byQuestion.get(attempt.questionId);
    if (existing) {
      existing.push(attempt);
    } else {
      byQuestion.set(attempt.questionId, [attempt]);
    }
  }
  return byQuestion;
}

/**
 * Point-biserial correlation between item correctness (binary) and each
 * attempt's overall session accuracy (continuous). Null when there isn't
 * enough data or no variance to correlate against.
 */
export function pointBiserialCorrelation(
  pairs: Array<{ correct: boolean; sessionAccuracy: number }>
): number | null {
  if (pairs.length < MIN_ATTEMPTS_FOR_DISCRIMINATION) {
    return null;
  }

  const n = pairs.length;
  const correctCount = pairs.filter((p) => p.correct).length;
  const p = correctCount / n;
  const q = 1 - p;
  if (p === 0 || p === 1) {
    return null;
  }

  const mean = pairs.reduce((sum, row) => sum + row.sessionAccuracy, 0) / n;
  const variance = pairs.reduce((sum, row) => sum + (row.sessionAccuracy - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) {
    return null;
  }

  const meanCorrect = pairs.filter((p) => p.correct).reduce((s, r) => s + r.sessionAccuracy, 0) / correctCount;
  const meanIncorrect =
    pairs.filter((p) => !p.correct).reduce((s, r) => s + r.sessionAccuracy, 0) / (n - correctCount);

  return ((meanCorrect - meanIncorrect) / stddev) * Math.sqrt(p * q);
}

/**
 * Classical D-index: fraction correct among the top 27% of attempts by
 * session accuracy minus the fraction correct among the bottom 27%. Null
 * when there isn't enough data for a meaningful split.
 */
export function discriminationIndex(
  pairs: Array<{ correct: boolean; sessionAccuracy: number }>
): number | null {
  if (pairs.length < MIN_ATTEMPTS_FOR_DISCRIMINATION) {
    return null;
  }

  const sorted = [...pairs].sort((a, b) => b.sessionAccuracy - a.sessionAccuracy);
  const groupSize = Math.max(1, Math.round(sorted.length * DISCRIMINATION_SPLIT_FRACTION));
  const upper = sorted.slice(0, groupSize);
  const lower = sorted.slice(-groupSize);

  const upperRate = upper.filter((p) => p.correct).length / upper.length;
  const lowerRate = lower.filter((p) => p.correct).length / lower.length;

  return upperRate - lowerRate;
}

export function buildDistractorDist(attempts: AttemptRecord[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const attempt of attempts) {
    const answer = attempt.selectedAnswer;
    if (!answer || !("options" in answer)) {
      continue;
    }
    for (const optionIndex of answer.options) {
      const key = String(optionIndex);
      dist[key] = (dist[key] ?? 0) + 1;
    }
  }
  return dist;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function stddev(values: number[], avg: number): number | null {
  if (values.length < 2) {
    return null;
  }
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function suggestQualityTier(
  input: {
    totalAttempts: number;
    difficultyIndex: number | null;
    discrimination: number | null;
  },
  flagCount: number
): QuestionStatsResult["suggestedQualityTier"] {
  const { totalAttempts, difficultyIndex, discrimination } = input;
  const t = TIER_THRESHOLDS;

  const isDegenerate =
    totalAttempts >= t.quarantineMinAttempts &&
    difficultyIndex !== null &&
    (difficultyIndex <= t.quarantineDegenerateLow || difficultyIndex >= t.quarantineDegenerateHigh);
  const isNegativelyDiscriminating =
    discrimination !== null && discrimination < t.quarantineNegativeDiscrimination;

  if (flagCount >= t.quarantineFlagCount || isDegenerate || isNegativelyDiscriminating) {
    return "quarantine";
  }

  const isGold =
    totalAttempts >= t.goldMinAttempts &&
    discrimination !== null &&
    discrimination >= t.goldMinDiscrimination &&
    difficultyIndex !== null &&
    difficultyIndex >= t.goldDifficultyBand[0] &&
    difficultyIndex <= t.goldDifficultyBand[1];

  if (isGold) {
    return "gold";
  }

  return totalAttempts >= t.silverMinAttempts ? "silver" : "bronze";
}

/** Compute a full question_stats row for one question's accumulated attempts. */
export function computeQuestionStats(
  questionId: string,
  attempts: AttemptRecord[],
  flagCount: number
): QuestionStatsResult {
  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const difficultyIndex = totalAttempts > 0 ? correctAttempts / totalAttempts : null;

  const scorablePairs = attempts
    .filter((a): a is AttemptRecord & { sessionAccuracy: number } => a.sessionAccuracy !== null)
    .map((a) => ({ correct: a.isCorrect, sessionAccuracy: a.sessionAccuracy }));

  const times = attempts.map((a) => a.timeSpentSec).filter((t) => Number.isFinite(t) && t >= 0);
  const avgTimeSec = mean(times);

  return {
    questionId,
    totalAttempts,
    correctAttempts,
    difficultyIndex,
    discrimination: discriminationIndex(scorablePairs),
    pointBiserial: pointBiserialCorrelation(scorablePairs),
    avgTimeSec,
    stddevTimeSec: avgTimeSec === null ? null : stddev(times, avgTimeSec),
    distractorDist: buildDistractorDist(attempts),
    suggestedQualityTier: suggestQualityTier(
      { totalAttempts, difficultyIndex, discrimination: discriminationIndex(scorablePairs) },
      flagCount
    )
  };
}
