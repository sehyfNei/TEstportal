import { describe, expect, it } from "vitest";
import {
  computeDifficultyAllocations,
  computeTopicAllocations
} from "@/lib/test-session/selection";

describe("computeTopicAllocations", () => {
  it("allocates exact 50/30/20 weights", () => {
    expect(
      computeTopicAllocations(
        [
          { topicId: "polity", weightPercent: 50 },
          { topicId: "history", weightPercent: 30 },
          { topicId: "economy", weightPercent: 20 }
        ],
        10
      )
    ).toEqual([
      { topicId: "polity", alloc: 5 },
      { topicId: "history", alloc: 3 },
      { topicId: "economy", alloc: 2 }
    ]);
  });

  it("fills remainder slots when weights sum below 100", () => {
    const allocations = computeTopicAllocations(
      [
        { topicId: "polity", weightPercent: 50 },
        { topicId: "history", weightPercent: 30 },
        { topicId: "economy", weightPercent: 10 }
      ],
      10
    );

    expect(allocations.reduce((sum, topic) => sum + topic.alloc, 0)).toBe(10);
    expect(allocations[0]).toEqual({ topicId: "polity", alloc: 6 });
  });

  it("returns no allocations for all-zero weights", () => {
    expect(
      computeTopicAllocations(
        [
          { topicId: "polity", weightPercent: 0 },
          { topicId: "history", weightPercent: 0 }
        ],
        10
      )
    ).toEqual([]);
  });

  it("allocates a single full-weight topic", () => {
    expect(computeTopicAllocations([{ topicId: "polity", weightPercent: 100 }], 7)).toEqual([
      { topicId: "polity", alloc: 7 }
    ]);
  });

  it("assigns equal-third remainder slots by stable order", () => {
    expect(
      computeTopicAllocations(
        [
          { topicId: "first", weightPercent: 33 },
          { topicId: "second", weightPercent: 33 },
          { topicId: "third", weightPercent: 33 }
        ],
        10
      )
    ).toEqual([
      { topicId: "first", alloc: 4 },
      { topicId: "second", alloc: 3 },
      { topicId: "third", alloc: 3 }
    ]);
  });
});

describe("computeDifficultyAllocations", () => {
  it("allocates a 10-question practice set as 30/40/30", () => {
    expect(computeDifficultyAllocations(10)).toEqual({ easy: 3, medium: 4, hard: 3 });
  });

  it("puts the remainder into medium difficulty", () => {
    expect(computeDifficultyAllocations(7)).toEqual({ easy: 2, medium: 3, hard: 2 });
  });

  it("keeps very small counts assigned to medium", () => {
    expect(computeDifficultyAllocations(3)).toEqual({ easy: 0, medium: 3, hard: 0 });
    expect(computeDifficultyAllocations(1)).toEqual({ easy: 0, medium: 1, hard: 0 });
  });

  it("returns zeros for non-positive counts", () => {
    expect(computeDifficultyAllocations(0)).toEqual({ easy: 0, medium: 0, hard: 0 });
  });

  it("always sums to the requested count", () => {
    for (let count = 1; count <= 20; count += 1) {
      const allocation = computeDifficultyAllocations(count);
      expect(allocation.easy + allocation.medium + allocation.hard).toBe(count);
    }
  });
});
