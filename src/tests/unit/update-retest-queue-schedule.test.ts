import { describe, expect, it } from "vitest";
import { computeInitialScheduleFsrs } from "@/lib/adaptive/fsrs-scheduler";
import { chooseInsertSchedule } from "@/lib/jobs/handlers/update-retest-queue";

const NOW = Date.UTC(2026, 6, 14, 0, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

const BASE_INPUT = {
  mistakeTypes: ["conceptual_gap"],
  topicWeightPercent: 20,
  nowMs: NOW
};

describe("chooseInsertSchedule", () => {
  it("keeps legacy simple-scheduler behavior when the fsrs flag is off", () => {
    const schedule = chooseInsertSchedule({ ...BASE_INPUT, useFsrs: false, priorState: null });

    expect(schedule.scheduler).toBe("simple");
    expect(schedule.schedulerState.intervalDays).toBe(1);
    expect(schedule.dueAt.getTime()).toBe(NOW + DAY_MS);
    expect("stability" in schedule.schedulerState).toBe(false);
  });

  it("uses an FSRS initial schedule when the flag is on and no prior row exists", () => {
    const schedule = chooseInsertSchedule({ ...BASE_INPUT, useFsrs: true, priorState: null });

    expect(schedule.scheduler).toBe("fsrs");
    expect(schedule.schedulerState.intervalDays).toBeGreaterThanOrEqual(1);
    if (schedule.scheduler === "fsrs") {
      expect(schedule.schedulerState.stability).toBeGreaterThan(0);
      expect(schedule.schedulerState.lapses).toBe(0);
    }
  });

  it("ranks initial priority identically under both schedulers", () => {
    const simple = chooseInsertSchedule({ ...BASE_INPUT, useFsrs: false, priorState: null });
    const fsrs = chooseInsertSchedule({ ...BASE_INPUT, useFsrs: true, priorState: null });

    expect(fsrs.priority).toBe(simple.priority);
  });

  it("treats a resurfacing group as a lapse of its prior FSRS state", () => {
    const prior = computeInitialScheduleFsrs(
      { mistakeTypes: ["conceptual_gap"], topicWeightPercent: 20 },
      NOW - 10 * DAY_MS
    ).schedulerState;

    const schedule = chooseInsertSchedule({ ...BASE_INPUT, useFsrs: true, priorState: prior });

    expect(schedule.scheduler).toBe("fsrs");
    if (schedule.scheduler === "fsrs") {
      expect(schedule.schedulerState.lapses).toBe(prior.lapses + 1);
      expect(schedule.schedulerState.repetitions).toBe(0);
      expect(schedule.schedulerState.stability).toBeLessThanOrEqual(prior.stability);
      expect(schedule.schedulerState.lastReviewedAt).toBe(new Date(NOW).toISOString());
    }
  });

  it("seeds simple-shaped prior state before applying the lapse (mixed-state rows)", () => {
    const simpleShapedPrior = {
      intervalDays: 4,
      repetitions: 2,
      lapses: 1,
      lastReviewedAt: new Date(NOW - 6 * DAY_MS).toISOString()
    };

    const schedule = chooseInsertSchedule({
      ...BASE_INPUT,
      useFsrs: true,
      priorState: simpleShapedPrior
    });

    expect(schedule.scheduler).toBe("fsrs");
    if (schedule.scheduler === "fsrs") {
      expect(schedule.schedulerState.lapses).toBe(2);
      expect(schedule.schedulerState.repetitions).toBe(0);
      expect(schedule.schedulerState.stability).toBeGreaterThan(0);
      expect(schedule.schedulerState.difficulty).toBeGreaterThanOrEqual(1);
      expect(schedule.schedulerState.difficulty).toBeLessThanOrEqual(10);
    }
    expect(schedule.dueAt.getTime()).toBeGreaterThan(NOW);
  });
});
