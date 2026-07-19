import { describe, expect, it } from "vitest";
import {
  buildDistractorDist,
  computeQuestionStats,
  discriminationIndex,
  groupAttemptsByQuestion,
  pointBiserialCorrelation,
  suggestQualityTier,
  MIN_ATTEMPTS_FOR_DISCRIMINATION,
  type AttemptRecord
} from "@/lib/question-bank/question-stats";

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    questionId: "q1",
    isCorrect: true,
    timeSpentSec: 30,
    selectedAnswer: { options: [0] },
    sessionAccuracy: 0.7,
    ...overrides
  };
}

describe("groupAttemptsByQuestion", () => {
  it("groups attempts by questionId, preserving order within a group", () => {
    const a1 = attempt({ questionId: "q1" });
    const a2 = attempt({ questionId: "q2" });
    const a3 = attempt({ questionId: "q1" });

    const grouped = groupAttemptsByQuestion([a1, a2, a3]);
    expect([...grouped.keys()].sort()).toEqual(["q1", "q2"]);
    expect(grouped.get("q1")).toEqual([a1, a3]);
  });
});

describe("pointBiserialCorrelation", () => {
  it("is null below the minimum attempt threshold", () => {
    const pairs = Array.from({ length: MIN_ATTEMPTS_FOR_DISCRIMINATION - 1 }, (_, i) => ({
      correct: i % 2 === 0,
      sessionAccuracy: 0.5
    }));
    expect(pointBiserialCorrelation(pairs)).toBeNull();
  });

  it("is null when everyone gets it right or everyone gets it wrong (no variance in x)", () => {
    const allCorrect = Array.from({ length: 10 }, () => ({ correct: true, sessionAccuracy: Math.random() }));
    expect(pointBiserialCorrelation(allCorrect)).toBeNull();
  });

  it("is positive when correctness tracks higher overall accuracy", () => {
    const pairs = [
      ...Array.from({ length: 8 }, () => ({ correct: true, sessionAccuracy: 0.9 })),
      ...Array.from({ length: 8 }, () => ({ correct: false, sessionAccuracy: 0.3 }))
    ];
    const r = pointBiserialCorrelation(pairs);
    expect(r).not.toBeNull();
    expect(r as number).toBeGreaterThan(0.5);
  });

  it("is negative when weaker students do better (a likely-broken item)", () => {
    const pairs = [
      ...Array.from({ length: 8 }, () => ({ correct: true, sessionAccuracy: 0.2 })),
      ...Array.from({ length: 8 }, () => ({ correct: false, sessionAccuracy: 0.9 }))
    ];
    const r = pointBiserialCorrelation(pairs);
    expect(r).not.toBeNull();
    expect(r as number).toBeLessThan(-0.5);
  });
});

describe("discriminationIndex", () => {
  it("is null below the minimum attempt threshold", () => {
    expect(discriminationIndex([{ correct: true, sessionAccuracy: 0.5 }])).toBeNull();
  });

  it("is 1 when only top scorers get it right and only bottom scorers get it wrong", () => {
    const pairs = [
      ...Array.from({ length: 10 }, (_, i) => ({ correct: true, sessionAccuracy: 0.9 + i * 0.001 })),
      ...Array.from({ length: 10 }, (_, i) => ({ correct: false, sessionAccuracy: 0.1 + i * 0.001 }))
    ];
    expect(discriminationIndex(pairs)).toBeCloseTo(1, 5);
  });

  it("is close to 0 when correctness is unrelated to overall accuracy", () => {
    const pairs = Array.from({ length: 20 }, (_, i) => ({
      correct: i % 2 === 0,
      sessionAccuracy: i / 20
    }));
    // Top and bottom deciles here alternate correct/incorrect identically.
    expect(Math.abs(discriminationIndex(pairs) as number)).toBeLessThan(0.5);
  });
});

describe("buildDistractorDist", () => {
  it("counts selected mcq/msq options and ignores integer/null answers", () => {
    const dist = buildDistractorDist([
      attempt({ selectedAnswer: { options: [0] } }),
      attempt({ selectedAnswer: { options: [0] } }),
      attempt({ selectedAnswer: { options: [2] } }),
      attempt({ selectedAnswer: { options: [1, 2] } }),
      attempt({ selectedAnswer: { integer: 42 } }),
      attempt({ selectedAnswer: null })
    ]);
    expect(dist).toEqual({ "0": 2, "1": 1, "2": 2 });
  });

  it("is empty for an all-integer-type question", () => {
    expect(buildDistractorDist([attempt({ selectedAnswer: { integer: 7 } })])).toEqual({});
  });
});

describe("suggestQualityTier", () => {
  it("quarantines on flag count alone regardless of stats", () => {
    expect(
      suggestQualityTier({ totalAttempts: 0, difficultyIndex: null, discrimination: null }, 3)
    ).toBe("quarantine");
  });

  it("quarantines a degenerate item with enough attempts (everyone right or everyone wrong)", () => {
    expect(
      suggestQualityTier({ totalAttempts: 25, difficultyIndex: 0.99, discrimination: null }, 0)
    ).toBe("quarantine");
    expect(
      suggestQualityTier({ totalAttempts: 25, difficultyIndex: 0.01, discrimination: null }, 0)
    ).toBe("quarantine");
  });

  it("quarantines strongly negative discrimination", () => {
    expect(
      suggestQualityTier({ totalAttempts: 10, difficultyIndex: 0.5, discrimination: -0.4 }, 0)
    ).toBe("quarantine");
  });

  it("suggests gold for a well-discriminating item in a healthy difficulty band with enough attempts", () => {
    expect(
      suggestQualityTier({ totalAttempts: 25, difficultyIndex: 0.6, discrimination: 0.4 }, 0)
    ).toBe("gold");
  });

  it("falls back to silver with moderate attempts, bronze with too few", () => {
    expect(
      suggestQualityTier({ totalAttempts: 10, difficultyIndex: 0.6, discrimination: 0.1 }, 0)
    ).toBe("silver");
    expect(
      suggestQualityTier({ totalAttempts: 2, difficultyIndex: 0.6, discrimination: null }, 0)
    ).toBe("bronze");
  });
});

describe("computeQuestionStats", () => {
  it("aggregates totals, difficulty index, and timing from a mixed attempt set", () => {
    const attempts = [
      attempt({ isCorrect: true, timeSpentSec: 20, sessionAccuracy: 0.8 }),
      attempt({ isCorrect: false, timeSpentSec: 40, sessionAccuracy: 0.4 }),
      attempt({ isCorrect: true, timeSpentSec: 30, sessionAccuracy: 0.9 })
    ];
    const result = computeQuestionStats("q1", attempts, 0);

    expect(result.questionId).toBe("q1");
    expect(result.totalAttempts).toBe(3);
    expect(result.correctAttempts).toBe(2);
    expect(result.difficultyIndex).toBeCloseTo(2 / 3, 10);
    expect(result.avgTimeSec).toBeCloseTo(30, 10);
    expect(result.suggestedQualityTier).toBe("bronze"); // too few attempts for silver/gold
  });

  it("returns null discrimination/point-biserial and empty distractor_dist with zero attempts", () => {
    const result = computeQuestionStats("q1", [], 0);
    expect(result.totalAttempts).toBe(0);
    expect(result.difficultyIndex).toBeNull();
    expect(result.discrimination).toBeNull();
    expect(result.pointBiserial).toBeNull();
    expect(result.avgTimeSec).toBeNull();
    expect(result.stddevTimeSec).toBeNull();
    expect(result.distractorDist).toEqual({});
    expect(result.suggestedQualityTier).toBe("bronze");
  });

  it("excludes attempts with no session accuracy from discrimination but keeps them in totals", () => {
    const attempts = [
      ...Array.from({ length: 8 }, () => attempt({ isCorrect: true, sessionAccuracy: 0.9 })),
      ...Array.from({ length: 8 }, () => attempt({ isCorrect: false, sessionAccuracy: 0.2 })),
      attempt({ isCorrect: true, sessionAccuracy: null })
    ];
    const result = computeQuestionStats("q1", attempts, 0);
    expect(result.totalAttempts).toBe(17);
    expect(result.discrimination).not.toBeNull();
  });
});
