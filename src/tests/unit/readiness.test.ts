import { describe, expect, it } from "vitest";
import { fetchReadinessScore } from "@/lib/scoring/readiness-query";
import {
  BENCHMARK_FACTOR_WITH,
  BENCHMARK_FACTOR_WITHOUT,
  RECENCY_DEDUCTION_PER_STALE,
  RECENCY_FLOOR,
  STALE_THRESHOLD_DAYS,
  computeReadinessScore
} from "@/lib/scoring/readiness";

const NOW = Date.UTC(2026, 5, 2, 12, 0, 0, 0);
const DAY_MS = 1000 * 60 * 60 * 24;

describe("computeReadinessScore", () => {
  it("returns zero readiness for zero records and zero weights", () => {
    const result = computeReadinessScore({
      masteryRecords: [],
      topicWeights: [],
      hasBenchmarkSession: false,
      nowMs: NOW
    });

    expect(result).toEqual({
      score: 0,
      confidenceLevel: "low",
      coveragePercent: 0,
      staleTopicIds: [],
      hasBenchmarkSession: false,
      breakdown: {}
    });
  });

  it("scores a single fully mastered topic at 100 with benchmark", () => {
    const result = computeReadinessScore({
      masteryRecords: [
        topicRecord("topic-a", 100, "high", 6, nowMinusDays(1))
      ],
      topicWeights: [{ topicId: "topic-a", weightPercent: 100 }],
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.score).toBe(100);
    expect(result.confidenceLevel).toBe("high");
    expect(result.coveragePercent).toBe(1);
    expect(BENCHMARK_FACTOR_WITH).toBe(1);
    expect(result.breakdown["topic-a"]).toMatchObject({
      masteryScore: 100,
      weight: 1,
      contribution: 100,
      covered: true,
      stale: false
    });
  });

  it("applies the 0.9 benchmark penalty when no benchmark session exists", () => {
    const result = computeReadinessScore({
      masteryRecords: [topicRecord("topic-a", 100, "high", 6, nowMinusDays(1))],
      topicWeights: [{ topicId: "topic-a", weightPercent: 100 }],
      hasBenchmarkSession: false,
      nowMs: NOW
    });

    expect(result.score).toBe(90);
    expect(BENCHMARK_FACTOR_WITHOUT).toBe(0.9);
  });

  it("keeps uncovered topics in the denominator and drags the score down", () => {
    const result = computeReadinessScore({
      masteryRecords: [topicRecord("topic-a", 80, "medium", 4, nowMinusDays(1))],
      topicWeights: [
        { topicId: "topic-a", weightPercent: 50 },
        { topicId: "topic-b", weightPercent: 50 }
      ],
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.coveragePercent).toBe(0.5);
    expect(result.score).toBe(40);
    expect(result.breakdown["topic-b"]).toMatchObject({
      masteryScore: 0,
      covered: false,
      stale: false
    });
  });

  it("marks stale topics and applies the recency deduction", () => {
    const result = computeReadinessScore({
      masteryRecords: [topicRecord("topic-a", 100, "high", 5, nowMinusDays(20))],
      topicWeights: [{ topicId: "topic-a", weightPercent: 100 }],
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.staleTopicIds).toEqual(["topic-a"]);
    expect(result.score).toBe(98);
    expect(result.breakdown["topic-a"].stale).toBe(true);
  });

  it("floors the recency factor at 0.80 for many stale topics", () => {
    const masteryRecords = Array.from({ length: 10 }, (_, index) =>
      topicRecord(`topic-${index + 1}`, 100, "high", 3, nowMinusDays(20))
    );
    const topicWeights = masteryRecords.map((record) => ({
      topicId: record.topicId as string,
      weightPercent: 10
    }));

    const result = computeReadinessScore({
      masteryRecords,
      topicWeights,
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.score).toBe(80);
    expect(result.staleTopicIds).toHaveLength(10);
    expect(RECENCY_FLOOR).toBe(0.8);
    expect(RECENCY_DEDUCTION_PER_STALE).toBe(0.02);
    expect(STALE_THRESHOLD_DAYS).toBe(14);
  });

  it("keeps confidence low when coverage is below 0.30 even with a benchmark", () => {
    const result = computeReadinessScore({
      masteryRecords: [topicRecord("topic-a", 100, "high", 4, nowMinusDays(1))],
      topicWeights: [
        { topicId: "topic-a", weightPercent: 25 },
        { topicId: "topic-b", weightPercent: 25 },
        { topicId: "topic-c", weightPercent: 25 },
        { topicId: "topic-d", weightPercent: 25 }
      ],
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.coveragePercent).toBe(0.25);
    expect(result.confidenceLevel).toBe("low");
  });

  it("promotes confidence to high when coverage is strong and benchmark exists", () => {
    const result = computeReadinessScore({
      masteryRecords: [
        topicRecord("topic-a", 70, "medium", 4, nowMinusDays(1)),
        topicRecord("topic-b", 80, "medium", 4, nowMinusDays(1)),
        topicRecord("topic-c", 90, "medium", 4, nowMinusDays(1))
      ],
      topicWeights: [
        { topicId: "topic-a", weightPercent: 40 },
        { topicId: "topic-b", weightPercent: 30 },
        { topicId: "topic-c", weightPercent: 30 }
      ],
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.coveragePercent).toBe(1);
    expect(result.confidenceLevel).toBe("high");
  });

  it("keeps confidence at medium when coverage is 0.50 and no benchmark exists", () => {
    const result = computeReadinessScore({
      masteryRecords: [topicRecord("topic-a", 90, "high", 5, nowMinusDays(1))],
      topicWeights: [
        { topicId: "topic-a", weightPercent: 50 },
        { topicId: "topic-b", weightPercent: 50 }
      ],
      hasBenchmarkSession: false,
      nowMs: NOW
    });

    expect(result.coveragePercent).toBe(0.5);
    expect(result.confidenceLevel).toBe("medium");
  });

  it("normalizes un-normalized topic weights before scoring", () => {
    const result = computeReadinessScore({
      masteryRecords: [
        topicRecord("topic-a", 60, "medium", 4, nowMinusDays(1)),
        topicRecord("topic-b", 30, "medium", 4, nowMinusDays(1))
      ],
      topicWeights: [
        { topicId: "topic-a", weightPercent: 2 },
        { topicId: "topic-b", weightPercent: 1 }
      ],
      hasBenchmarkSession: false,
      nowMs: NOW
    });

    expect(result.score).toBe(45);
    expect(result.breakdown["topic-a"].weight).toBeCloseTo(2 / 3, 5);
    expect(result.breakdown["topic-b"].weight).toBeCloseTo(1 / 3, 5);
  });

  it("treats a missing mastery record as zero contribution", () => {
    const result = computeReadinessScore({
      masteryRecords: [topicRecord("topic-a", 100, "high", 5, nowMinusDays(1))],
      topicWeights: [
        { topicId: "topic-a", weightPercent: 50 },
        { topicId: "topic-b", weightPercent: 50 }
      ],
      hasBenchmarkSession: true,
      nowMs: NOW
    });

    expect(result.score).toBe(50);
    expect(result.breakdown["topic-b"]).toMatchObject({
      masteryScore: 0,
      weight: 0.5,
      contribution: 0,
      covered: false
    });
  });
});

describe("fetchReadinessScore", () => {
  it("parses string mastery_score values from Supabase rows", async () => {
    const supabase = createSupabaseMock({
      mastery_records: [
        {
          data: [
            {
              topic_id: "topic-a",
              mastery_score: "75.5",
              confidence_level: "medium",
              questions_attempted: "4",
              last_tested_at: new Date(NOW - DAY_MS).toISOString()
            }
          ],
          error: null
        }
      ],
      topics: [
        {
          data: [
            {
              id: "topic-a",
              weight_percent: "100"
            }
          ],
          error: null
        }
      ],
      test_sessions: [
        {
          data: [{ id: "bench-1" }],
          error: null
        }
      ]
    });

    const result = await fetchReadinessScore(supabase as never, "user-1", "exam-1");

    expect(result.score).toBe(75.5);
    expect(result.hasBenchmarkSession).toBe(true);
    expect(result.confidenceLevel).toBe("high");
    expect(result.breakdown["topic-a"].masteryScore).toBe(75.5);
  });
});

function topicRecord(
  topicId: string,
  masteryScore: number,
  confidenceLevel: "low" | "medium" | "high",
  questionsAttempted: number,
  lastTestedAt: Date | null
) {
  return {
    topicId,
    masteryScore,
    confidenceLevel,
    questionsAttempted,
    lastTestedAt
  };
}

function nowMinusDays(days: number): Date {
  return new Date(NOW - days * DAY_MS);
}

function createSupabaseMock(
  responses: Record<
    string,
    Array<{
      data: unknown;
      error: unknown;
    }>
  >
) {
  const responseQueues = new Map<string, Array<{ data: unknown; error: unknown }>>(
    Object.entries(responses).map(([table, queue]) => [table, [...queue]])
  );

  return {
    from(table: string) {
      const queue = responseQueues.get(table) ?? [];
      const response = queue.shift() ?? { data: null, error: null };
      responseQueues.set(table, queue);
      return createQueryBuilder(response);
    }
  };
}

function createQueryBuilder(response: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select() {
      return builder;
    },
    eq() {
      return builder;
    },
    not() {
      return builder;
    },
    in() {
      return builder;
    },
    limit() {
      return builder;
    },
    then(onFulfilled: (value: { data: unknown; error: unknown }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve(response).then(onFulfilled, onRejected);
    }
  };

  return builder;
}
