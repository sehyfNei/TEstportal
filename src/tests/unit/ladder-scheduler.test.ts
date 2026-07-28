import { describe, expect, it } from "vitest";
import {
  LADDER_INTERVAL_DAYS,
  LADDER_INTERVAL_DAYS_COMPRESSED,
  computeLadderRevisionSchedule,
  isLadderSchedulerState,
  readLadderSchedulerState
} from "@/lib/adaptive/ladder-scheduler";

const DAY_MS = 24 * 60 * 60 * 1000;
const MASTERED_AT = Date.UTC(2026, 5, 1, 0, 0, 0, 0);

describe("computeLadderRevisionSchedule", () => {
  it("schedules cycle 1 at the uncompressed interval when the exam is far away", () => {
    const result = computeLadderRevisionSchedule(1, MASTERED_AT, 180);
    expect(result.dueAt.getTime()).toBe(MASTERED_AT + LADDER_INTERVAL_DAYS[0] * DAY_MS);
    expect(result.schedulerState).toEqual({
      source: "ladder",
      cycle: 1,
      masteredAt: new Date(MASTERED_AT).toISOString()
    });
  });

  it("schedules cycle 2 at the uncompressed interval, anchored to the same masteredAt", () => {
    const result = computeLadderRevisionSchedule(2, MASTERED_AT, 180);
    expect(result.dueAt.getTime()).toBe(MASTERED_AT + LADDER_INTERVAL_DAYS[1] * DAY_MS);
  });

  it("compresses both intervals when the exam is close", () => {
    const cycle1 = computeLadderRevisionSchedule(1, MASTERED_AT, 30);
    const cycle2 = computeLadderRevisionSchedule(2, MASTERED_AT, 30);
    expect(cycle1.dueAt.getTime()).toBe(MASTERED_AT + LADDER_INTERVAL_DAYS_COMPRESSED[0] * DAY_MS);
    expect(cycle2.dueAt.getTime()).toBe(MASTERED_AT + LADDER_INTERVAL_DAYS_COMPRESSED[1] * DAY_MS);
  });

  it("treats an unknown exam date (null) as far away - uncompressed", () => {
    const result = computeLadderRevisionSchedule(1, MASTERED_AT, null);
    expect(result.dueAt.getTime()).toBe(MASTERED_AT + LADDER_INTERVAL_DAYS[0] * DAY_MS);
  });

  it("does not compound - cycle 2 is not measured from cycle 1's due date", () => {
    const cycle1 = computeLadderRevisionSchedule(1, MASTERED_AT, 180);
    const cycle2 = computeLadderRevisionSchedule(2, MASTERED_AT, 180);
    const gapDays = (cycle2.dueAt.getTime() - cycle1.dueAt.getTime()) / DAY_MS;
    expect(gapDays).toBe(LADDER_INTERVAL_DAYS[1] - LADDER_INTERVAL_DAYS[0]);
  });
});

describe("isLadderSchedulerState / readLadderSchedulerState", () => {
  it("recognizes a valid ladder scheduler_state", () => {
    const state = { source: "ladder", cycle: 1, masteredAt: new Date(MASTERED_AT).toISOString() };
    expect(isLadderSchedulerState(state)).toBe(true);
    expect(readLadderSchedulerState(state)).toEqual(state);
  });

  it("rejects a mistake-scheduler state (no source field)", () => {
    const state = { intervalDays: 4, repetitions: 1, lapses: 0, lastReviewedAt: null };
    expect(isLadderSchedulerState(state)).toBe(false);
    expect(readLadderSchedulerState(state)).toBeNull();
  });

  it("rejects null, arrays, and malformed cycle values", () => {
    expect(readLadderSchedulerState(null)).toBeNull();
    expect(readLadderSchedulerState([])).toBeNull();
    expect(readLadderSchedulerState({ source: "ladder", cycle: 3, masteredAt: "x" })).toBeNull();
  });
});
