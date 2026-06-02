import { describe, expect, it } from "vitest";
import {
  computeNextAction,
  type NextActionInput
} from "@/lib/dashboard/next-action";

describe("computeNextAction", () => {
  it("prioritizes overdue retests over every other action", () => {
    const action = computeNextAction(
      overview({
        overdueRetestCount: 2,
        dueRetests: [dueRetest("retest-1")],
        weakTopics: [weakTopic("topic-1", "Polity", 20)],
        readiness: readiness({ hasBenchmarkSession: false })
      })
    );

    expect(action).toMatchObject({
      type: "start_overdue_retest",
      href: "#due-retests"
    });
    expect(action.title).toContain("2");
  });

  it("recommends due retests when there are no overdue retests", () => {
    const action = computeNextAction(
      overview({
        overdueRetestCount: 0,
        dueRetests: [dueRetest("retest-1")]
      })
    );

    expect(action).toMatchObject({
      type: "start_due_retest",
      description: "On schedule",
      href: "#due-retests"
    });
  });

  it("prioritizes due retests over weak topics", () => {
    const action = computeNextAction(
      overview({
        dueRetests: [dueRetest("retest-1")],
        weakTopics: [weakTopic("topic-1", "Economy", 35)]
      })
    );

    expect(action.type).toBe("start_due_retest");
  });

  it("recommends the top weak topic when retests are empty", () => {
    const action = computeNextAction(
      overview({
        weakTopics: [weakTopic("topic-1", "Geography", 48)],
        readiness: readiness({ hasBenchmarkSession: true })
      })
    );

    expect(action).toMatchObject({
      type: "practice_weak_topic",
      title: "Practice Geography",
      description: "48% mastery - highest priority topic",
      href: "/tests"
    });
  });

  it("recommends a diagnostic when benchmark calibration is missing", () => {
    const action = computeNextAction(
      overview({
        readiness: readiness({ hasBenchmarkSession: false })
      })
    );

    expect(action).toMatchObject({
      type: "take_diagnostic",
      title: "Take a diagnostic test",
      href: "/tests"
    });
  });

  it("keeps practicing when there are no urgent signals and benchmark exists", () => {
    const action = computeNextAction(
      overview({
        readiness: readiness({ hasBenchmarkSession: true })
      })
    );

    expect(action).toMatchObject({
      type: "keep_practicing",
      title: "Keep practicing",
      href: "/tests"
    });
  });

  it("treats an otherwise empty overview without a benchmark as diagnostic-first", () => {
    expect(computeNextAction(overview()).type).toBe("take_diagnostic");
  });

  it("surfaces singular and plural overdue counts in the title", () => {
    expect(computeNextAction(overview({ overdueRetestCount: 1 })).title).toContain(
      "1 overdue retest"
    );
    expect(computeNextAction(overview({ overdueRetestCount: 2 })).title).toContain(
      "2 overdue retests"
    );
  });
});

function overview(overrides: Partial<NextActionInput> = {}): NextActionInput {
  return {
    overdueRetestCount: 0,
    dueRetests: [],
    weakTopics: [],
    readiness: readiness({ hasBenchmarkSession: false }),
    ...overrides
  };
}

function dueRetest(id: string): NextActionInput["dueRetests"][number] {
  return {
    id,
    conceptId: null,
    topicId: "topic-1",
    dueAt: "2026-06-03T00:00:00.000Z",
    priority: 1,
    scheduler: "simple_v1"
  };
}

function weakTopic(
  topicId: string,
  topicName: string,
  masteryScore: number
): NextActionInput["weakTopics"][number] {
  return {
    topicId,
    topicName,
    masteryScore,
    weightPercent: 25,
    priority: 12.5
  };
}

function readiness(
  overrides: Partial<NextActionInput["readiness"]> = {}
): NextActionInput["readiness"] {
  return {
    score: 0,
    confidenceLevel: "low",
    coveragePercent: 0,
    staleTopicIds: [],
    hasBenchmarkSession: false,
    breakdown: {},
    ...overrides
  };
}
