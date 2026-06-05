// Pure flag triage helpers (TSP-092).
// No DB or Next.js imports — all functions are unit-testable offline.

import { FLAG_REASON_LABELS, isValidFlagReason } from "./flag-reasons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlagReason = string;

export interface RawFlagRow {
  id: string;
  question_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

export interface RawQuestionInfo {
  id: string;
  status: string;
  quality_tier: string;
  exam_id: string | null;
  topic_id: string | null;
}

/** One card per flagged question aggregated from multiple flag rows. */
export interface QuestionFlagGroup {
  questionId: string;
  questionStatus: string;
  qualityTier: string;
  examId: string | null;
  topicId: string | null;
  openFlagCount: number;
  distinctReasons: string[];
  /** ISO string of the most recent flag in the group. */
  latestFlagAt: string;
  flags: RawFlagRow[];
}

/** Per-reason count across all open flags. */
export interface ReasonStat {
  reason: string;
  label: string;
  count: number;
}

/** Summary analytics rendered at the top of the triage queue. */
export interface TriageSummary {
  totalOpenFlags: number;
  totalFlaggedQuestions: number;
  reasonStats: ReasonStat[];
  topFlaggedQuestions: Array<{ questionId: string; openFlagCount: number }>;
}

// ---------------------------------------------------------------------------
// groupFlagsByQuestion
// ---------------------------------------------------------------------------

/**
 * Converts a flat list of flag rows (each containing its question's metadata
 * in the optional `question` field) into one card per flagged question.
 *
 * Flags whose `question` join is absent are grouped under the raw `question_id`
 * with empty metadata so they are still surfaced to the admin.
 */
export function groupFlagsByQuestion(
  flags: Array<RawFlagRow & { question?: RawQuestionInfo | null }>
): QuestionFlagGroup[] {
  const map = new Map<string, QuestionFlagGroup>();

  for (const flag of flags) {
    const q = flag.question ?? null;
    const qid = flag.question_id;

    let group = map.get(qid);
    if (!group) {
      group = {
        questionId: qid,
        questionStatus: q?.status ?? "",
        qualityTier: q?.quality_tier ?? "",
        examId: q?.exam_id ?? null,
        topicId: q?.topic_id ?? null,
        openFlagCount: 0,
        distinctReasons: [],
        latestFlagAt: flag.created_at,
        flags: []
      };
      map.set(qid, group);
    }

    group.flags.push(flag);

    if (flag.status === "open" || flag.status === "reviewing") {
      group.openFlagCount += 1;
    }

    if (!group.distinctReasons.includes(flag.reason)) {
      group.distinctReasons.push(flag.reason);
    }

    // Track the most recent flag timestamp.
    if (flag.created_at > group.latestFlagAt) {
      group.latestFlagAt = flag.created_at;
    }
  }

  // Return sorted: highest open-flag-count first, then most recent.
  return Array.from(map.values()).sort(
    (a, b) =>
      b.openFlagCount - a.openFlagCount ||
      b.latestFlagAt.localeCompare(a.latestFlagAt)
  );
}

// ---------------------------------------------------------------------------
// computeTriageSummary
// ---------------------------------------------------------------------------

/**
 * Computes the analytics summary displayed at the top of the triage page.
 * Only counts flags where status is 'open' or 'reviewing'.
 */
export function computeTriageSummary(groups: QuestionFlagGroup[]): TriageSummary {
  const reasonCounts = new Map<string, number>();
  let totalOpenFlags = 0;

  for (const group of groups) {
    for (const flag of group.flags) {
      if (flag.status !== "open" && flag.status !== "reviewing") continue;
      totalOpenFlags += 1;
      reasonCounts.set(flag.reason, (reasonCounts.get(flag.reason) ?? 0) + 1);
    }
  }

  const reasonStats: ReasonStat[] = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      label: isValidFlagReason(reason) ? FLAG_REASON_LABELS[reason] : reason,
      count
    }))
    .sort((a, b) => b.count - a.count);

  const topFlaggedQuestions = groups
    .filter((g) => g.openFlagCount > 0)
    .slice(0, 5)
    .map((g) => ({ questionId: g.questionId, openFlagCount: g.openFlagCount }));

  return {
    totalOpenFlags,
    totalFlaggedQuestions: groups.filter((g) => g.openFlagCount > 0).length,
    reasonStats,
    topFlaggedQuestions
  };
}

// ---------------------------------------------------------------------------
// filterGroups — URL-driven filter application (pure)
// ---------------------------------------------------------------------------

export interface TriageFilters {
  reason?: string;
  /** comma-separated list of question statuses, e.g. "flagged,live" */
  statuses?: string;
  examId?: string;
}

/**
 * Applies URL-driven filters to a list of question flag groups.
 * All filter values are optional; an absent filter matches everything.
 */
export function filterGroups(
  groups: QuestionFlagGroup[],
  filters: TriageFilters
): QuestionFlagGroup[] {
  return groups.filter((g) => {
    if (filters.reason && !g.distinctReasons.includes(filters.reason)) return false;

    if (filters.statuses) {
      const allowed = filters.statuses.split(",").map((s) => s.trim());
      if (!allowed.includes(g.questionStatus)) return false;
    }

    if (filters.examId && g.examId !== filters.examId) return false;

    return true;
  });
}
