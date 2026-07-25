import { describe, expect, it } from "vitest";
import {
  computeCurrentWeekNumber,
  groupMilestonesByWeek,
  type PathMilestoneView
} from "@/lib/learning-path/path-view";

describe("computeCurrentWeekNumber", () => {
  it("returns week 1 on the day the path is created", () => {
    const createdAt = "2026-07-01T00:00:00.000Z";
    const now = new Date("2026-07-01T12:00:00.000Z");
    expect(computeCurrentWeekNumber(createdAt, now, 8)).toBe(1);
  });

  it("advances by whole weeks elapsed", () => {
    const createdAt = "2026-07-01T00:00:00.000Z";
    const now = new Date("2026-07-16T00:00:00.000Z");
    expect(computeCurrentWeekNumber(createdAt, now, 8)).toBe(3);
  });

  it("clamps to the plan's max week", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const now = new Date("2026-07-01T00:00:00.000Z");
    expect(computeCurrentWeekNumber(createdAt, now, 8)).toBe(8);
  });

  it("falls back to week 1 for an unparseable created_at", () => {
    expect(computeCurrentWeekNumber("not-a-date", new Date(), 8)).toBe(1);
  });

  it("falls back to week 1 when maxWeek is zero", () => {
    expect(computeCurrentWeekNumber("2026-07-01T00:00:00.000Z", new Date(), 0)).toBe(1);
  });
});

describe("groupMilestonesByWeek", () => {
  const milestone = (overrides: Partial<PathMilestoneView>): PathMilestoneView => ({
    topicId: "topic-1",
    topicName: "Polity",
    weekNumber: 1,
    targetMastery: 60,
    currentMastery: 30,
    completed: false,
    ...overrides
  });

  it("groups milestones by week number in ascending order", () => {
    const groups = groupMilestonesByWeek(
      [milestone({ weekNumber: 2 }), milestone({ weekNumber: 1 })],
      1
    );

    expect(groups.map((group) => group.weekNumber)).toEqual([1, 2]);
  });

  it("sorts milestones within a week alphabetically by topic name", () => {
    const groups = groupMilestonesByWeek(
      [
        milestone({ topicId: "t2", topicName: "Zoology" }),
        milestone({ topicId: "t1", topicName: "Ancient History" })
      ],
      1
    );

    expect(groups[0].milestones.map((m) => m.topicName)).toEqual(["Ancient History", "Zoology"]);
  });

  it("flags the group matching currentWeekNumber", () => {
    const groups = groupMilestonesByWeek(
      [milestone({ weekNumber: 1 }), milestone({ weekNumber: 2 })],
      2
    );

    expect(groups.find((g) => g.weekNumber === 1)?.isCurrentWeek).toBe(false);
    expect(groups.find((g) => g.weekNumber === 2)?.isCurrentWeek).toBe(true);
  });

  it("returns an empty array for no milestones", () => {
    expect(groupMilestonesByWeek([], 1)).toEqual([]);
  });
});
