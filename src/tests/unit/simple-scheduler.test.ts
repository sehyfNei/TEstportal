import { describe, expect, it } from "vitest";
import {
  INTERVAL_DAYS_SEQUENCE,
  MAX_PRIORITY,
  MISTAKE_TYPE_PRIORITY,
  TOPIC_BOOST_SCALE,
  computeInitialSchedule,
  computeRetestSchedule,
  type SchedulerState
} from "@/lib/adaptive/simple-scheduler";

const NOW = Date.UTC(2026, 5, 2, 12, 0, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeInitialSchedule", () => {
  const cases: Array<{
    name: string;
    mistakeTypes: string[];
    topicWeightPercent: number | null;
    expectedPriority: number;
  }> = [
    {
      name: "prioritizes overconfidence at 3",
      mistakeTypes: ["overconfidence"],
      topicWeightPercent: null,
      expectedPriority: 3
    },
    {
      name: "prioritizes conceptual gaps at 2",
      mistakeTypes: ["conceptual_gap"],
      topicWeightPercent: null,
      expectedPriority: 2
    },
    {
      name: "prioritizes lucky guesses at 1",
      mistakeTypes: ["lucky_guess"],
      topicWeightPercent: null,
      expectedPriority: 1
    },
    {
      name: "uses the max mistake priority for mixed groups",
      mistakeTypes: ["overconfidence", "conceptual_gap"],
      topicWeightPercent: null,
      expectedPriority: 3
    },
    {
      name: "adds a topic boost for 50 percent weight",
      mistakeTypes: ["overconfidence"],
      topicWeightPercent: 50,
      expectedPriority: 4
    },
    {
      name: "adds the max normal topic boost for 100 percent weight",
      mistakeTypes: ["overconfidence"],
      topicWeightPercent: 100,
      expectedPriority: 5
    },
    {
      name: "caps priority at 10",
      mistakeTypes: ["overconfidence"],
      topicWeightPercent: 350,
      expectedPriority: 10
    },
    {
      name: "handles empty mistake types",
      mistakeTypes: [],
      topicWeightPercent: null,
      expectedPriority: 0
    },
    {
      name: "keeps bookmarked at 0.5 when topic weight is zero",
      mistakeTypes: ["bookmarked"],
      topicWeightPercent: 0,
      expectedPriority: 0.5
    }
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      const result = computeInitialSchedule(
        {
          mistakeTypes: testCase.mistakeTypes,
          topicWeightPercent: testCase.topicWeightPercent
        },
        NOW
      );

      expect(result.priority).toBe(testCase.expectedPriority);
      expect(result.dueAt.getTime()).toBe(NOW + DAY_MS);

      if (testCase.mistakeTypes[0] === "overconfidence" && testCase.topicWeightPercent === null) {
        expect(result.schedulerState).toEqual({
          intervalDays: 1,
          repetitions: 0,
          lapses: 0,
          lastReviewedAt: null
        });
        expect(MISTAKE_TYPE_PRIORITY.overconfidence).toBe(3);
        expect(INTERVAL_DAYS_SEQUENCE[0]).toBe(1);
        expect(MAX_PRIORITY).toBe(10);
        expect(TOPIC_BOOST_SCALE).toBe(2);
      }
    });
  }
});

describe("computeRetestSchedule", () => {
  it("doubles a one-day interval on pass", () => {
    const result = computeRetestSchedule("pass", state(1, 0, 0), null, NOW);

    expect(result.schedulerState.intervalDays).toBe(2);
    expect(result.schedulerState.repetitions).toBe(1);
    expect(result.schedulerState.lastReviewedAt).toBe(new Date(NOW).toISOString());
    expect(result.priority).toBe(1);
    expect(result.dueAt.getTime()).toBe(NOW + 2 * DAY_MS);
  });

  it("doubles a two-day interval on pass", () => {
    const result = computeRetestSchedule("pass", state(2, 1, 0), null, NOW);

    expect(result.schedulerState.intervalDays).toBe(4);
    expect(result.priority).toBe(1);
    expect(result.dueAt.getTime()).toBe(NOW + 4 * DAY_MS);
  });

  it("caps passing intervals at the last sequence value", () => {
    const result = computeRetestSchedule("pass", state(21, 5, 0), null, NOW);

    expect(result.schedulerState.intervalDays).toBe(30);
    expect(result.priority).toBe(1);
    expect(result.dueAt.getTime()).toBe(NOW + 30 * DAY_MS);
  });

  it("resets interval and repetitions on fail", () => {
    const result = computeRetestSchedule("fail", state(8, 3, 0), null, NOW);

    expect(result.schedulerState.intervalDays).toBe(1);
    expect(result.schedulerState.repetitions).toBe(0);
    expect(result.schedulerState.lapses).toBe(1);
    expect(result.schedulerState.lastReviewedAt).toBe(new Date(NOW).toISOString());
    expect(result.priority).toBe(2.5);
    expect(result.dueAt.getTime()).toBe(NOW + DAY_MS);
  });

  it("compounds lapse priority up to the lapse boost cap", () => {
    const result = computeRetestSchedule("fail", state(1, 0, 2), null, NOW);

    expect(result.schedulerState.intervalDays).toBe(1);
    expect(result.schedulerState.lapses).toBe(3);
    expect(result.priority).toBe(3.5);
  });

  it("applies topic boost after a passing retest", () => {
    const result = computeRetestSchedule("pass", state(1, 0, 0), 50, NOW);

    expect(result.schedulerState.intervalDays).toBe(2);
    expect(result.priority).toBe(2);
  });
});

function state(intervalDays: number, repetitions: number, lapses: number): SchedulerState {
  return {
    intervalDays,
    repetitions,
    lapses,
    lastReviewedAt: null
  };
}
