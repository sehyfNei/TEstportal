import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONCEPTS_PER_DAY,
  MAX_CONCEPTS_PER_DAY,
  MIN_CONCEPTS_PER_DAY,
  computeConceptsPerDay,
  pickTodaysFocusTopics,
  type LadderState
} from "@/lib/dashboard/daily-focus";
import type { WeakTopic } from "@/lib/dashboard/overview";

describe("computeConceptsPerDay", () => {
  it("returns the minimum when there is nothing left to cover", () => {
    expect(computeConceptsPerDay(180, 0, null)).toBe(MIN_CONCEPTS_PER_DAY);
  });

  it("falls back to the default when the exam date is unknown", () => {
    expect(computeConceptsPerDay(null, 10, null)).toBe(DEFAULT_CONCEPTS_PER_DAY);
  });

  it("scales up as the exam gets closer with more topics remaining", () => {
    const far = computeConceptsPerDay(300, 6, null);
    const close = computeConceptsPerDay(20, 6, null);
    expect(close).toBeGreaterThanOrEqual(far);
  });

  it("respects a faster observed pace even when the required rate is low", () => {
    // Barely any rate required (5 topics over 300 days), but the student's
    // own observed pace clears one every 0.4 days (2.5/day) - the suggestion
    // should track the faster, real pace rather than the bare minimum.
    const result = computeConceptsPerDay(300, 5, 0.4);
    expect(result).toBeGreaterThan(1);
  });

  it("never exceeds the max", () => {
    const result = computeConceptsPerDay(5, 19, 0.1);
    expect(result).toBeLessThanOrEqual(MAX_CONCEPTS_PER_DAY);
  });
});

describe("pickTodaysFocusTopics", () => {
  const weakTopics: WeakTopic[] = [
    { topicId: "t1", topicName: "Economy", masteryScore: 34, weightPercent: 12, priority: 7.9 },
    { topicId: "t2", topicName: "Polity", masteryScore: 55, weightPercent: 10, priority: 4.5 },
    { topicId: "t3", topicName: "History", masteryScore: 60, weightPercent: 8, priority: 3.2 }
  ];

  it("picks the top N weak topics in priority order", () => {
    const picked = pickTodaysFocusTopics(weakTopics, new Map(), 2);
    expect(picked).toEqual(["t1", "t2"]);
  });

  it("skips a topic whose ladder is already completed this cycle", () => {
    const ladderStates = new Map<string, LadderState>([
      ["t1", { topicId: "t1", completedAt: "2026-07-01T00:00:00Z" }]
    ]);
    const picked = pickTodaysFocusTopics(weakTopics, ladderStates, 2);
    expect(picked).toEqual(["t2", "t3"]);
  });

  it("includes a topic whose ladder is in progress but not yet complete", () => {
    const ladderStates = new Map<string, LadderState>([["t1", { topicId: "t1", completedAt: null }]]);
    const picked = pickTodaysFocusTopics(weakTopics, ladderStates, 1);
    expect(picked).toEqual(["t1"]);
  });

  it("returns fewer than count if not enough eligible topics remain", () => {
    const ladderStates = new Map<string, LadderState>([
      ["t1", { topicId: "t1", completedAt: "2026-07-01T00:00:00Z" }],
      ["t2", { topicId: "t2", completedAt: "2026-07-01T00:00:00Z" }],
      ["t3", { topicId: "t3", completedAt: "2026-07-01T00:00:00Z" }]
    ]);
    const picked = pickTodaysFocusTopics(weakTopics, ladderStates, 3);
    expect(picked).toEqual([]);
  });
});
