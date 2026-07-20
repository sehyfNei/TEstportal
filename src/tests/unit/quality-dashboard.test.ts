import { describe, expect, it } from "vitest";
import {
  attentionReasons,
  calibrationStatus,
  needsAttention,
  prioritizeQualityRows,
  sortQualityRows,
  isQualitySortKey,
  type QualityRow
} from "@/lib/question-bank/quality-dashboard";

function row(overrides: Partial<QualityRow> = {}): QualityRow {
  return {
    questionId: "q1",
    examName: "UPSC Prelims",
    topicName: "Polity",
    stem: "Sample question",
    status: "live",
    actualTier: "bronze",
    suggestedTier: "bronze",
    totalAttempts: 10,
    difficultyIndex: 0.5,
    discrimination: 0.2,
    avgTimeSec: 30,
    flagCount: 0,
    usageCount: 10,
    lastCalibrated: new Date().toISOString(),
    ...overrides
  };
}

describe("calibrationStatus", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it("is 'never' when the row has not been calibrated", () => {
    expect(calibrationStatus(null, now)).toBe("never");
  });

  it("is 'fresh' within the staleness window and 'stale' beyond it", () => {
    const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
    const fortyHoursAgo = new Date(now.getTime() - 40 * 60 * 60 * 1000).toISOString();
    expect(calibrationStatus(tenHoursAgo, now)).toBe("fresh");
    expect(calibrationStatus(fortyHoursAgo, now)).toBe("stale");
  });

  it("treats an unparseable timestamp as never calibrated", () => {
    expect(calibrationStatus("not-a-date", now)).toBe("never");
  });
});

describe("attentionReasons / needsAttention", () => {
  it("flags a suggested-quarantine question still marked live", () => {
    const r = row({ suggestedTier: "quarantine", actualTier: "bronze", status: "live" });
    expect(attentionReasons(r)).toEqual(["tier_divergence"]);
    expect(needsAttention(r)).toBe(true);
  });

  it("does not flag tier divergence for a retired question", () => {
    const r = row({ suggestedTier: "quarantine", actualTier: "bronze", status: "retired" });
    expect(attentionReasons(r)).toEqual([]);
  });

  it("does not flag divergence once the actual tier already matches", () => {
    const r = row({ suggestedTier: "quarantine", actualTier: "quarantine" });
    expect(attentionReasons(r)).toEqual([]);
  });

  it("flags strongly negative discrimination with enough attempts", () => {
    const r = row({ totalAttempts: 10, discrimination: -0.3 });
    expect(attentionReasons(r)).toEqual(["negative_discrimination"]);
  });

  it("does not flag negative discrimination below the attempt floor", () => {
    const r = row({ totalAttempts: 3, discrimination: -0.5 });
    expect(attentionReasons(r)).toEqual([]);
  });

  it("flags the auto-quarantine flag threshold", () => {
    expect(attentionReasons(row({ flagCount: 3 }))).toEqual(["flag_threshold"]);
  });

  it("can report multiple reasons at once", () => {
    const r = row({ flagCount: 3, totalAttempts: 10, discrimination: -0.4 });
    expect(attentionReasons(r)).toEqual(
      expect.arrayContaining(["flag_threshold", "negative_discrimination"])
    );
    expect(attentionReasons(r)).toHaveLength(2);
  });

  it("reports no reasons for a healthy question", () => {
    expect(attentionReasons(row())).toEqual([]);
    expect(needsAttention(row())).toBe(false);
  });
});

describe("isQualitySortKey", () => {
  it("accepts known keys and rejects unknown/empty values", () => {
    expect(isQualitySortKey("attempts")).toBe(true);
    expect(isQualitySortKey("discrimination")).toBe(true);
    expect(isQualitySortKey("nonsense")).toBe(false);
    expect(isQualitySortKey(null)).toBe(false);
    expect(isQualitySortKey(undefined)).toBe(false);
  });
});

describe("sortQualityRows", () => {
  it("sorts descending by the chosen metric", () => {
    const rows = [row({ questionId: "a", totalAttempts: 5 }), row({ questionId: "b", totalAttempts: 20 })];
    expect(sortQualityRows(rows, "attempts").map((r) => r.questionId)).toEqual(["b", "a"]);
  });

  it("treats null difficulty/discrimination as lower than any real value", () => {
    const rows = [
      row({ questionId: "a", difficultyIndex: null }),
      row({ questionId: "b", difficultyIndex: 0.1 })
    ];
    expect(sortQualityRows(rows, "difficulty").map((r) => r.questionId)).toEqual(["b", "a"]);
  });

  it("breaks ties deterministically by questionId", () => {
    const rows = [
      row({ questionId: "z", totalAttempts: 10 }),
      row({ questionId: "a", totalAttempts: 10 })
    ];
    expect(sortQualityRows(rows, "attempts").map((r) => r.questionId)).toEqual(["a", "z"]);
  });
});

describe("prioritizeQualityRows", () => {
  it("puts attention-needing rows first, healthy rows sorted by attempts after", () => {
    const flagged = row({ questionId: "flagged", flagCount: 5, totalAttempts: 1 });
    const healthyHigh = row({ questionId: "high", totalAttempts: 50 });
    const healthyLow = row({ questionId: "low", totalAttempts: 5 });

    const { attention, rest } = prioritizeQualityRows([healthyLow, flagged, healthyHigh]);
    expect(attention.map((r) => r.questionId)).toEqual(["flagged"]);
    expect(rest.map((r) => r.questionId)).toEqual(["high", "low"]);
  });
});
