import { describe, expect, it } from "vitest";
import {
  computeTriageSummary,
  filterGroups,
  groupFlagsByQuestion,
  type QuestionFlagGroup,
  type RawFlagRow
} from "@/lib/question-bank/flag-triage";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const Q1 = "11111111-0000-0000-0000-000000000001";
const Q2 = "22222222-0000-0000-0000-000000000002";
const Q3 = "33333333-0000-0000-0000-000000000003";
const EXAM1 = "eeeeeeee-0000-0000-0000-000000000001";

function makeFlag(
  overrides: Partial<RawFlagRow> & { question_id: string }
): RawFlagRow & { question?: { id: string; status: string; quality_tier: string; exam_id: string | null; topic_id: string | null } | null } {
  return {
    id: crypto.randomUUID(),
    reason: "ambiguous",
    details: null,
    status: "open",
    created_at: "2026-06-05T00:00:00Z",
    ...overrides,
    question: overrides.question_id
      ? {
          id: overrides.question_id,
          status: "flagged",
          quality_tier: "quarantine",
          exam_id: EXAM1,
          topic_id: null
        }
      : null
  };
}

// ---------------------------------------------------------------------------
// groupFlagsByQuestion
// ---------------------------------------------------------------------------

describe("groupFlagsByQuestion", () => {
  it("groups flags by question_id into one card per question", () => {
    const flags = [
      makeFlag({ question_id: Q1, reason: "ambiguous" }),
      makeFlag({ question_id: Q1, reason: "incorrect_answer" }),
      makeFlag({ question_id: Q2, reason: "outdated" })
    ];
    const groups = groupFlagsByQuestion(flags);
    expect(groups).toHaveLength(2);
    const g1 = groups.find((g) => g.questionId === Q1)!;
    expect(g1.flags).toHaveLength(2);
    expect(g1.openFlagCount).toBe(2);
    expect(g1.distinctReasons).toContain("ambiguous");
    expect(g1.distinctReasons).toContain("incorrect_answer");
    expect(g1.distinctReasons).toHaveLength(2);
  });

  it("sorts groups by openFlagCount descending", () => {
    const flags = [
      makeFlag({ question_id: Q2, reason: "outdated" }),
      makeFlag({ question_id: Q1, reason: "ambiguous" }),
      makeFlag({ question_id: Q1, reason: "incorrect_answer" })
    ];
    const groups = groupFlagsByQuestion(flags);
    expect(groups[0].questionId).toBe(Q1); // Q1 has 2 flags
    expect(groups[1].questionId).toBe(Q2); // Q2 has 1 flag
  });

  it("does not double-count a reason that appears twice on the same question", () => {
    const flags = [
      makeFlag({ question_id: Q1, reason: "ambiguous" }),
      makeFlag({ question_id: Q1, reason: "ambiguous" })
    ];
    const groups = groupFlagsByQuestion(flags);
    expect(groups[0].distinctReasons).toHaveLength(1);
    expect(groups[0].distinctReasons[0]).toBe("ambiguous");
  });

  it("only counts open/reviewing flags in openFlagCount", () => {
    const flags = [
      makeFlag({ question_id: Q1, reason: "ambiguous", status: "open" }),
      makeFlag({ question_id: Q1, reason: "incorrect_answer", status: "resolved" })
    ];
    const groups = groupFlagsByQuestion(flags);
    expect(groups[0].openFlagCount).toBe(1); // only the open one
    expect(groups[0].flags).toHaveLength(2); // both flags in group
  });

  it("tracks latestFlagAt as the most recent flag timestamp", () => {
    const flags = [
      makeFlag({ question_id: Q1, created_at: "2026-06-03T00:00:00Z" }),
      makeFlag({ question_id: Q1, created_at: "2026-06-05T00:00:00Z" }),
      makeFlag({ question_id: Q1, created_at: "2026-06-04T00:00:00Z" })
    ];
    const groups = groupFlagsByQuestion(flags);
    expect(groups[0].latestFlagAt).toBe("2026-06-05T00:00:00Z");
  });

  it("returns empty array for empty input", () => {
    expect(groupFlagsByQuestion([])).toEqual([]);
  });

  it("handles a flag with no question join gracefully", () => {
    const flag: RawFlagRow & { question?: null } = {
      id: "aaa",
      question_id: Q3,
      reason: "other",
      details: null,
      status: "open",
      created_at: "2026-06-05T00:00:00Z",
      question: null
    };
    const groups = groupFlagsByQuestion([flag]);
    expect(groups).toHaveLength(1);
    expect(groups[0].questionId).toBe(Q3);
    expect(groups[0].questionStatus).toBe("");
    expect(groups[0].qualityTier).toBe("");
  });
});

// ---------------------------------------------------------------------------
// computeTriageSummary
// ---------------------------------------------------------------------------

describe("computeTriageSummary", () => {
  function makeGroup(overrides: Partial<QuestionFlagGroup>): QuestionFlagGroup {
    return {
      questionId: Q1,
      questionStatus: "flagged",
      qualityTier: "quarantine",
      examId: EXAM1,
      topicId: null,
      openFlagCount: 2,
      distinctReasons: ["ambiguous"],
      latestFlagAt: "2026-06-05T00:00:00Z",
      flags: [],
      ...overrides
    };
  }

  it("counts total open flags and unique flagged questions", () => {
    const groups: QuestionFlagGroup[] = [
      makeGroup({
        questionId: Q1,
        openFlagCount: 2,
        flags: [
          makeFlag({ question_id: Q1, reason: "ambiguous", status: "open" }),
          makeFlag({ question_id: Q1, reason: "incorrect_answer", status: "open" })
        ]
      }),
      makeGroup({
        questionId: Q2,
        openFlagCount: 1,
        flags: [makeFlag({ question_id: Q2, reason: "ambiguous", status: "open" })]
      })
    ];
    const summary = computeTriageSummary(groups);
    expect(summary.totalOpenFlags).toBe(3);
    expect(summary.totalFlaggedQuestions).toBe(2);
  });

  it("computes reason stats sorted by count desc", () => {
    const groups: QuestionFlagGroup[] = [
      makeGroup({
        openFlagCount: 3,
        flags: [
          makeFlag({ question_id: Q1, reason: "ambiguous", status: "open" }),
          makeFlag({ question_id: Q1, reason: "ambiguous", status: "open" }),
          makeFlag({ question_id: Q1, reason: "incorrect_answer", status: "open" })
        ]
      })
    ];
    const summary = computeTriageSummary(groups);
    expect(summary.reasonStats[0].reason).toBe("ambiguous");
    expect(summary.reasonStats[0].count).toBe(2);
    expect(summary.reasonStats[1].reason).toBe("incorrect_answer");
    expect(summary.reasonStats[1].count).toBe(1);
  });

  it("excludes already-closed flags from counts", () => {
    const groups: QuestionFlagGroup[] = [
      makeGroup({
        openFlagCount: 1,
        flags: [
          makeFlag({ question_id: Q1, reason: "ambiguous", status: "open" }),
          makeFlag({ question_id: Q1, reason: "outdated", status: "resolved" })
        ]
      })
    ];
    const summary = computeTriageSummary(groups);
    expect(summary.totalOpenFlags).toBe(1);
    expect(summary.reasonStats).toHaveLength(1);
    expect(summary.reasonStats[0].reason).toBe("ambiguous");
  });

  it("returns zeros for empty groups", () => {
    const summary = computeTriageSummary([]);
    expect(summary.totalOpenFlags).toBe(0);
    expect(summary.totalFlaggedQuestions).toBe(0);
    expect(summary.reasonStats).toHaveLength(0);
    expect(summary.topFlaggedQuestions).toHaveLength(0);
  });

  it("limits topFlaggedQuestions to 5", () => {
    const groups = [Q1, Q2, Q3, "q4", "q5", "q6"].map((qid) =>
      makeGroup({ questionId: qid, openFlagCount: 1, flags: [makeFlag({ question_id: qid, status: "open" })] })
    );
    const summary = computeTriageSummary(groups);
    expect(summary.topFlaggedQuestions).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// filterGroups
// ---------------------------------------------------------------------------

describe("filterGroups", () => {
  const groups: QuestionFlagGroup[] = [
    {
      questionId: Q1,
      questionStatus: "flagged",
      qualityTier: "quarantine",
      examId: EXAM1,
      topicId: null,
      openFlagCount: 2,
      distinctReasons: ["ambiguous", "incorrect_answer"],
      latestFlagAt: "2026-06-05T00:00:00Z",
      flags: []
    },
    {
      questionId: Q2,
      questionStatus: "live",
      qualityTier: "standard",
      examId: EXAM1,
      topicId: null,
      openFlagCount: 1,
      distinctReasons: ["outdated"],
      latestFlagAt: "2026-06-04T00:00:00Z",
      flags: []
    },
    {
      questionId: Q3,
      questionStatus: "flagged",
      qualityTier: "quarantine",
      examId: "other-exam",
      topicId: null,
      openFlagCount: 1,
      distinctReasons: ["ambiguous"],
      latestFlagAt: "2026-06-03T00:00:00Z",
      flags: []
    }
  ];

  it("returns all groups when no filter is set", () => {
    expect(filterGroups(groups, {})).toHaveLength(3);
  });

  it("filters by reason", () => {
    const result = filterGroups(groups, { reason: "outdated" });
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe(Q2);
  });

  it("filters by single status", () => {
    const result = filterGroups(groups, { statuses: "live" });
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe(Q2);
  });

  it("filters by multiple comma-separated statuses", () => {
    const result = filterGroups(groups, { statuses: "flagged,live" });
    expect(result).toHaveLength(3);
  });

  it("filters by examId", () => {
    const result = filterGroups(groups, { examId: EXAM1 });
    expect(result).toHaveLength(2);
  });

  it("applies reason AND examId together", () => {
    const result = filterGroups(groups, { reason: "ambiguous", examId: EXAM1 });
    expect(result).toHaveLength(1);
    expect(result[0].questionId).toBe(Q1);
  });

  it("returns empty when no groups match the filter", () => {
    const result = filterGroups(groups, { reason: "low_quality" });
    expect(result).toHaveLength(0);
  });
});
