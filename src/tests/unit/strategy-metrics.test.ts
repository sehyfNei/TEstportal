import { describe, expect, it } from "vitest";
import { computeStrategyMetrics } from "@/lib/scoring/strategy-metrics";
import type { ScoredAnswerInput } from "@/lib/scoring/strategy-metrics";

describe("computeStrategyMetrics", () => {
  it("returns all zeroes for empty input", () => {
    expect(computeStrategyMetrics([])).toEqual({
      negativeMarksLost: 0,
      highConfidenceWrong: 0,
      correctGuessed: 0,
      totalRevisits: 0,
      timeOnWrongSec: 0,
      timeOnSkippedSec: 0
    });
  });

  it("sums negative marks lost only for wrong answers", () => {
    const result = computeStrategyMetrics([
      answer({ isCorrect: false, marksAwarded: -0.66 }),
      answer({ isCorrect: false, marksAwarded: -0.66 }),
      answer({ isCorrect: true, marksAwarded: 2 }),
      answer({ isCorrect: null, marksAwarded: 0 })
    ]);

    expect(result.negativeMarksLost).toBeCloseTo(1.32);
  });

  it("does not count skipped rows as negative marks lost", () => {
    const result = computeStrategyMetrics([
      answer({ isCorrect: null, marksAwarded: 0 }),
      answer({ isCorrect: null, marksAwarded: -0.66 })
    ]);

    expect(result.negativeMarksLost).toBe(0);
  });

  it("counts only high-confidence wrong answers", () => {
    const result = computeStrategyMetrics([
      answer({ isCorrect: false, confidence: "sure" }),
      answer({ isCorrect: true, confidence: "sure" }),
      answer({ isCorrect: false, confidence: "unsure" }),
      answer({ isCorrect: false, confidence: null })
    ]);

    expect(result.highConfidenceWrong).toBe(1);
  });

  it("counts guessed correct answers", () => {
    const result = computeStrategyMetrics([
      answer({ isCorrect: true, confidence: "guessed" }),
      answer({ isCorrect: false, confidence: "guessed" }),
      answer({ isCorrect: true, confidence: "sure" })
    ]);

    expect(result.correctGuessed).toBe(1);
  });

  it("sums revisit counts across all answers", () => {
    const result = computeStrategyMetrics([
      answer({ revisitCount: 1 }),
      answer({ revisitCount: 3 }),
      answer({ revisitCount: 0 })
    ]);

    expect(result.totalRevisits).toBe(4);
  });

  it("sums time on wrong and skipped answers separately", () => {
    const result = computeStrategyMetrics([
      answer({ isCorrect: false, timeSpentSec: 20 }),
      answer({ isCorrect: false, timeSpentSec: 15 }),
      answer({ isCorrect: null, timeSpentSec: 30 }),
      answer({ isCorrect: true, timeSpentSec: 40 })
    ]);

    expect(result.timeOnWrongSec).toBe(35);
    expect(result.timeOnSkippedSec).toBe(30);
  });

  it("computes a mixed session summary", () => {
    const answers: ScoredAnswerInput[] = [
      answer({
        isCorrect: true,
        marksAwarded: 2,
        confidence: "sure",
        timeSpentSec: 42,
        revisitCount: 1
      }),
      answer({
        isCorrect: false,
        marksAwarded: -0.66,
        confidence: "unsure",
        timeSpentSec: 55,
        revisitCount: 2
      }),
      answer({
        isCorrect: null,
        marksAwarded: 0,
        confidence: null,
        timeSpentSec: 18,
        revisitCount: 1
      }),
      answer({
        isCorrect: false,
        marksAwarded: -0.66,
        confidence: "sure",
        timeSpentSec: 70,
        revisitCount: 4
      }),
      answer({
        isCorrect: true,
        marksAwarded: 2,
        confidence: "guessed",
        timeSpentSec: 25,
        revisitCount: 1
      })
    ];

    expect(computeStrategyMetrics(answers)).toEqual({
      negativeMarksLost: 1.32,
      highConfidenceWrong: 1,
      correctGuessed: 1,
      totalRevisits: 9,
      timeOnWrongSec: 125,
      timeOnSkippedSec: 18
    });
  });
});

function answer(overrides: Partial<ScoredAnswerInput>): ScoredAnswerInput {
  return {
    isCorrect: true,
    marksAwarded: 2,
    confidence: null,
    timeSpentSec: 0,
    revisitCount: 0,
    ...overrides
  };
}
