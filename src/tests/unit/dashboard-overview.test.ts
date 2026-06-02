import { describe, expect, it } from "vitest";
import {
  buildWeakTopics,
  computeWeakTopicPriority,
  toStrategyMetrics
} from "@/lib/dashboard/overview";

describe("computeWeakTopicPriority", () => {
  const cases = [
    { weightPercent: 100, masteryScore: 0, expected: 100 },
    { weightPercent: 20, masteryScore: 50, expected: 10 },
    { weightPercent: 30, masteryScore: 100, expected: 0 },
    { weightPercent: 0, masteryScore: 0, expected: 0 },
    { weightPercent: 50, masteryScore: 80, expected: 10 },
    { weightPercent: 100, masteryScore: -10, expected: 100 }
  ];

  for (const testCase of cases) {
    it(`returns ${testCase.expected} for ${testCase.weightPercent}% weight and ${testCase.masteryScore}% mastery`, () => {
      expect(computeWeakTopicPriority(testCase.weightPercent, testCase.masteryScore)).toBe(
        testCase.expected
      );
    });
  }
});

describe("buildWeakTopics", () => {
  it("sorts topics by priority descending", () => {
    const result = buildWeakTopics(
      [
        topic("topic-a", "Low priority", 10),
        topic("topic-b", "High priority", 40),
        topic("topic-c", "Medium priority", 25)
      ],
      new Map([
        ["topic-a", 20],
        ["topic-b", 25],
        ["topic-c", 0]
      ])
    );

    expect(result.map((row) => row.topicId)).toEqual(["topic-b", "topic-c", "topic-a"]);
    expect(result[0].priority).toBe(30);
  });

  it("defaults a topic without mastery to zero mastery", () => {
    const result = buildWeakTopics([topic("topic-a", "Unstarted", 30)], new Map());

    expect(result).toEqual([
      {
        topicId: "topic-a",
        topicName: "Unstarted",
        masteryScore: 0,
        weightPercent: 30,
        priority: 30
      }
    ]);
  });

  it("filters fully mastered topics", () => {
    const result = buildWeakTopics(
      [topic("topic-a", "Mastered", 30)],
      new Map([["topic-a", 100]])
    );

    expect(result).toEqual([]);
  });

  it("caps results to five topics", () => {
    const result = buildWeakTopics(
      Array.from({ length: 7 }, (_, index) =>
        topic(`topic-${index + 1}`, `Topic ${index + 1}`, 100 - index)
      ),
      new Map()
    );

    expect(result).toHaveLength(5);
    expect(result.map((row) => row.topicId)).toEqual([
      "topic-1",
      "topic-2",
      "topic-3",
      "topic-4",
      "topic-5"
    ]);
  });

  it("returns an empty array for empty topics", () => {
    expect(buildWeakTopics([], new Map())).toEqual([]);
  });

  it("parses string weight_percent values", () => {
    const result = buildWeakTopics([topic("topic-a", "String weight", "25")], new Map());

    expect(result[0]).toMatchObject({
      topicId: "topic-a",
      weightPercent: 25,
      priority: 25
    });
  });
});

describe("toStrategyMetrics", () => {
  it("returns null for null input", () => {
    expect(toStrategyMetrics(null)).toBeNull();
  });

  it("parses a valid metrics object", () => {
    expect(
      toStrategyMetrics({
        negativeMarksLost: 2,
        highConfidenceWrong: 1,
        correctGuessed: 3,
        totalRevisits: 5,
        timeOnWrongSec: 120,
        timeOnSkippedSec: 60
      })
    ).toEqual({
      negativeMarksLost: 2,
      highConfidenceWrong: 1,
      correctGuessed: 3,
      totalRevisits: 5,
      timeOnWrongSec: 120,
      timeOnSkippedSec: 60
    });
  });

  it("defaults missing metrics to zero", () => {
    expect(toStrategyMetrics({})).toEqual({
      negativeMarksLost: 0,
      highConfidenceWrong: 0,
      correctGuessed: 0,
      totalRevisits: 0,
      timeOnWrongSec: 0,
      timeOnSkippedSec: 0
    });
  });

  it("parses string metric values", () => {
    expect(
      toStrategyMetrics({
        negativeMarksLost: "1.5",
        highConfidenceWrong: "2"
      })
    ).toEqual({
      negativeMarksLost: 1.5,
      highConfidenceWrong: 2,
      correctGuessed: 0,
      totalRevisits: 0,
      timeOnWrongSec: 0,
      timeOnSkippedSec: 0
    });
  });
});

function topic(id: string, name: string, weight_percent: number | string | null) {
  return { id, name, weight_percent };
}
