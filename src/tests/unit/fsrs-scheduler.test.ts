import { describe, expect, it } from "vitest";
import {
  computeInitialScheduleFsrs,
  computeRetestScheduleFsrs,
  FSRS_DEFAULT_RETENTION,
  initialDifficulty,
  initialStability,
  nextInterval,
  retrievability,
  stabilityAfterLapse,
  stabilityAfterRecall,
  type FsrsSchedulerState
} from "@/lib/adaptive/fsrs-scheduler";

const NOW = Date.UTC(2026, 6, 14, 0, 0, 0);

describe("FSRS building blocks", () => {
  it("seeds initial stability/difficulty from the grade", () => {
    // Again(1) is harder and less stable than Good(3).
    expect(initialStability(1)).toBeLessThan(initialStability(3));
    expect(initialDifficulty(1)).toBeGreaterThan(initialDifficulty(3));
    expect(initialDifficulty(1)).toBeGreaterThanOrEqual(1);
    expect(initialDifficulty(1)).toBeLessThanOrEqual(10);
  });

  it("has retrievability 1 at t=0 and decreasing over time", () => {
    expect(retrievability(0, 5)).toBeCloseTo(1, 10);
    expect(retrievability(5, 5)).toBeLessThan(retrievability(1, 5));
    expect(retrievability(5, 5)).toBeGreaterThan(0);
  });

  it("recalls to ~90% retention interval near the stability value", () => {
    // At the default 0.9 retention the interval is approximately the stability.
    expect(nextInterval(10, FSRS_DEFAULT_RETENTION)).toBe(10);
    expect(nextInterval(1)).toBeGreaterThanOrEqual(1);
    // Higher stability -> longer interval.
    expect(nextInterval(30)).toBeGreaterThan(nextInterval(10));
  });

  it("grows stability on recall and shrinks it on a lapse", () => {
    const s = 5;
    const d = 5;
    const r = retrievability(5, s);
    expect(stabilityAfterRecall(s, d, r)).toBeGreaterThan(s);
    expect(stabilityAfterLapse(s, d, r)).toBeLessThanOrEqual(s);
    expect(stabilityAfterLapse(s, d, r)).toBeGreaterThan(0);
  });
});

describe("computeInitialScheduleFsrs", () => {
  it("produces a first-review state due at least a day out", () => {
    const result = computeInitialScheduleFsrs(
      { mistakeTypes: ["conceptual_gap"], topicWeightPercent: 20 },
      NOW
    );

    expect(result.schedulerState.repetitions).toBe(0);
    expect(result.schedulerState.lapses).toBe(0);
    expect(result.schedulerState.lastReviewedAt).toBeNull();
    expect(result.schedulerState.stability).toBeGreaterThan(0);
    expect(result.schedulerState.intervalDays).toBeGreaterThanOrEqual(1);
    expect(result.dueAt.getTime()).toBeGreaterThan(NOW);
    expect(result.priority).toBeGreaterThan(0);
  });
});

describe("computeRetestScheduleFsrs", () => {
  const initial: FsrsSchedulerState = computeInitialScheduleFsrs(
    { mistakeTypes: ["conceptual_gap"], topicWeightPercent: null },
    NOW
  ).schedulerState;

  it("on pass: grows stability, lengthens interval, counts a repetition", () => {
    const reviewAt = NOW + initial.intervalDays * 24 * 60 * 60 * 1000;
    const result = computeRetestScheduleFsrs("pass", initial, null, reviewAt);

    expect(result.schedulerState.stability).toBeGreaterThan(initial.stability);
    expect(result.schedulerState.repetitions).toBe(1);
    expect(result.schedulerState.lapses).toBe(0);
    expect(result.schedulerState.intervalDays).toBeGreaterThanOrEqual(initial.intervalDays);
    expect(result.schedulerState.lastReviewedAt).toBe(new Date(reviewAt).toISOString());
  });

  it("on fail: counts a lapse, raises difficulty, resets repetitions, short interval", () => {
    const passed = computeRetestScheduleFsrs(
      "pass",
      initial,
      null,
      NOW + initial.intervalDays * 24 * 60 * 60 * 1000
    ).schedulerState;
    const reviewAt = NOW + (initial.intervalDays + passed.intervalDays) * 24 * 60 * 60 * 1000;

    const failed = computeRetestScheduleFsrs("fail", passed, null, reviewAt);

    expect(failed.schedulerState.lapses).toBe(1);
    expect(failed.schedulerState.repetitions).toBe(0);
    expect(failed.schedulerState.difficulty).toBeGreaterThan(passed.difficulty);
    expect(failed.schedulerState.stability).toBeLessThanOrEqual(passed.stability);
    expect(failed.schedulerState.intervalDays).toBeLessThan(passed.intervalDays);
  });

  it("shows the spacing effect: repeated passes keep lengthening intervals", () => {
    let state = initial;
    let clock = NOW;
    const intervals: number[] = [];

    for (let i = 0; i < 4; i += 1) {
      clock += state.intervalDays * 24 * 60 * 60 * 1000;
      const result = computeRetestScheduleFsrs("pass", state, null, clock);
      state = result.schedulerState;
      intervals.push(state.intervalDays);
    }

    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
    expect(intervals[intervals.length - 1]).toBeGreaterThan(intervals[0]);
  });

  it("keeps difficulty within [1,10] across many lapses", () => {
    let state = initial;
    let clock = NOW;

    for (let i = 0; i < 8; i += 1) {
      clock += state.intervalDays * 24 * 60 * 60 * 1000;
      state = computeRetestScheduleFsrs("fail", state, null, clock).schedulerState;
      expect(state.difficulty).toBeGreaterThanOrEqual(1);
      expect(state.difficulty).toBeLessThanOrEqual(10);
      expect(state.stability).toBeGreaterThan(0);
    }

    expect(state.lapses).toBe(8);
  });
});
