import { describe, expect, it } from "vitest";
import {
  aggregateConfidenceInTopic,
  averageDifficultyInTopic,
  computeTopicMastery
} from "@/lib/scoring/compute-mastery";

describe("computeTopicMastery", () => {
  it("initializes new mastery from latest accuracy with low first-row confidence", () => {
    const result = computeTopicMastery(null, 0.8, "topic", 0.8, 0.67, 5, 4);

    expect(result.masteryScore).toBeGreaterThan(60);
    expect(result.masteryScore).toBeLessThan(90);
    expect(result.confidenceLevel).toBe("low");
    expect(result.stabilityFactor).toBe(1.0);
  });

  it("blends old and new mastery conservatively on later attempts", () => {
    const result = computeTopicMastery(70, 0.85, "topic", 0.85, 0.67, 5, 4, 3, 2);

    expect(result.masteryScore).toBeGreaterThan(70);
    expect(result.masteryScore).toBeLessThan(85);
    expect(result.confidenceLevel).toBe("medium");
  });

  it("applies a strong misconception penalty for high-confidence wrong performance", () => {
    const result = computeTopicMastery(85, 0.2, "topic", 0.9, 0.67, 5, 1, 20, 16);

    expect(result.masteryScore).toBeLessThan(85);
    expect(result.masteryScore).toBeLessThan(50);
  });

  it("weights benchmark sessions above topic practice for the same result", () => {
    const topicResult = computeTopicMastery(60, 0.75, "topic", 0.7, 0.67, 10, 7, 5, 3);
    const benchmarkResult = computeTopicMastery(60, 0.75, "benchmark", 0.7, 0.67, 10, 7, 5, 3);

    expect(benchmarkResult.masteryScore).toBeGreaterThan(topicResult.masteryScore);
  });

  it("increases stability after success and caps it at 2.0", () => {
    const result = computeTopicMastery(70, 0.8, "topic", 0.8, 0.67, 5, 4, 10, 8, 1.9);

    expect(result.stabilityFactor).toBe(2.0);
  });

  it("resets stability after failure", () => {
    const result = computeTopicMastery(70, 0.3, "topic", 0.3, 0.67, 5, 1, 10, 8, 1.8);

    expect(result.stabilityFactor).toBe(1.0);
  });

  it("updates confidence level from cumulative attempt count", () => {
    const low = computeTopicMastery(50, 0.8, "topic", 0.8, 0.67, 2, 2);
    const medium = computeTopicMastery(50, 0.8, "topic", 0.8, 0.67, 2, 2, 2, 1);
    const high = computeTopicMastery(50, 0.8, "topic", 0.8, 0.67, 1, 1, 9, 7);

    expect(low.confidenceLevel).toBe("low");
    expect(medium.confidenceLevel).toBe("medium");
    expect(high.confidenceLevel).toBe("high");
  });
});

describe("aggregateConfidenceInTopic", () => {
  it("returns neutral confidence for empty input", () => {
    expect(aggregateConfidenceInTopic([])).toBe(0.6);
  });

  it("aggregates confidence signals by correctness", () => {
    const confidence = aggregateConfidenceInTopic([
      { isCorrect: true, confidence: "sure" },
      { isCorrect: true, confidence: "unsure" },
      { isCorrect: false, confidence: "sure" },
      { isCorrect: false, confidence: "guessed" }
    ]);

    expect(confidence).toBeGreaterThan(0.1);
    expect(confidence).toBeLessThan(0.4);
  });

  it("ignores skipped answers", () => {
    const confidence = aggregateConfidenceInTopic([
      { isCorrect: true, confidence: "sure" },
      { isCorrect: null, confidence: null },
      { isCorrect: true, confidence: "sure" }
    ]);

    expect(confidence).toBeCloseTo(1.0);
  });

  it("uses neutral confidence when every answer is skipped", () => {
    expect(
      aggregateConfidenceInTopic([
        { isCorrect: null, confidence: null },
        { isCorrect: null, confidence: "sure" }
      ])
    ).toBe(0.6);
  });
});

describe("averageDifficultyInTopic", () => {
  it("averages difficulty levels", () => {
    expect(averageDifficultyInTopic(["easy", "medium", "hard"])).toBeCloseTo(0.67, 2);
  });

  it("returns medium difficulty for empty input", () => {
    expect(averageDifficultyInTopic([])).toBe(0.67);
  });
});
