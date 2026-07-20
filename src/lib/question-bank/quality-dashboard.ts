// Question quality analytics dashboard (TSP-100) — pure view logic over
// question_stats joined with questions. Read-only: this module never writes
// anything, it only decides what to highlight and how to sort what the admin
// already has (question_stats.quality_tier from TSP-098, questions.quality_tier
// from TSP-029/028).

import {
  MIN_ATTEMPTS_FOR_DISCRIMINATION,
  QUARANTINE_NEGATIVE_DISCRIMINATION
} from "@/lib/question-bank/question-stats";

export type QualityTier = "gold" | "silver" | "bronze" | "quarantine";

export type QualityRow = {
  questionId: string;
  examName: string;
  topicName: string;
  stem: string;
  status: string;
  actualTier: QualityTier;
  suggestedTier: QualityTier;
  totalAttempts: number;
  difficultyIndex: number | null;
  discrimination: number | null;
  avgTimeSec: number | null;
  flagCount: number;
  usageCount: number;
  lastCalibrated: string | null;
};

// A nightly job that hasn't completed in this long is stale — same threshold
// the ops dashboard already alerts on (OPS_THRESHOLDS.nightlyStaleRedHours),
// reused here so "stale calibration" means the same thing in both places.
export const CALIBRATION_STALE_HOURS = 36;

export type CalibrationStatus = "fresh" | "stale" | "never";

export function calibrationStatus(
  lastCalibrated: string | null,
  now: Date = new Date()
): CalibrationStatus {
  if (!lastCalibrated) {
    return "never";
  }
  const last = new Date(lastCalibrated).getTime();
  if (!Number.isFinite(last)) {
    return "never";
  }
  const hoursSince = (now.getTime() - last) / (60 * 60 * 1000);
  return hoursSince > CALIBRATION_STALE_HOURS ? "stale" : "fresh";
}

export type AttentionReason = "tier_divergence" | "negative_discrimination" | "flag_threshold";

/**
 * Why a row deserves an admin's eyes right now — empty when nothing does.
 * A row can have more than one reason (e.g. flagged AND negatively
 * discriminating), each surfaced independently.
 */
export function attentionReasons(row: QualityRow): AttentionReason[] {
  const reasons: AttentionReason[] = [];

  if (row.suggestedTier === "quarantine" && row.actualTier !== "quarantine" && row.status !== "retired") {
    reasons.push("tier_divergence");
  }

  if (
    row.totalAttempts >= MIN_ATTEMPTS_FOR_DISCRIMINATION &&
    row.discrimination !== null &&
    row.discrimination < QUARANTINE_NEGATIVE_DISCRIMINATION
  ) {
    reasons.push("negative_discrimination");
  }

  if (row.flagCount >= 3) {
    reasons.push("flag_threshold");
  }

  return reasons;
}

export function needsAttention(row: QualityRow): boolean {
  return attentionReasons(row).length > 0;
}

export type QualitySortKey = "attempts" | "difficulty" | "discrimination" | "usage" | "flags";

const SORT_ACCESSORS: Record<QualitySortKey, (row: QualityRow) => number> = {
  attempts: (row) => row.totalAttempts,
  difficulty: (row) => row.difficultyIndex ?? -1,
  discrimination: (row) => row.discrimination ?? -Infinity,
  usage: (row) => row.usageCount,
  flags: (row) => row.flagCount
};

export function isQualitySortKey(value: string | null | undefined): value is QualitySortKey {
  return Boolean(value && value in SORT_ACCESSORS);
}

/**
 * Sort rows by a chosen metric, descending, with a stable questionId tiebreak
 * so pagination/rendering order doesn't jitter between requests.
 */
export function sortQualityRows(rows: QualityRow[], sortKey: QualitySortKey): QualityRow[] {
  const accessor = SORT_ACCESSORS[sortKey];
  return [...rows].sort((a, b) => {
    const diff = accessor(b) - accessor(a);
    return diff !== 0 ? diff : a.questionId.localeCompare(b.questionId);
  });
}

/** Rows needing attention first (most-flagged first), then everything else by attempt count. */
export function prioritizeQualityRows(rows: QualityRow[]): {
  attention: QualityRow[];
  rest: QualityRow[];
} {
  const attention: QualityRow[] = [];
  const rest: QualityRow[] = [];

  for (const row of rows) {
    (needsAttention(row) ? attention : rest).push(row);
  }

  return {
    attention: sortQualityRows(attention, "flags"),
    rest: sortQualityRows(rest, "attempts")
  };
}
