// Revision scheduling for a mastered topic-ladder (TSP-204): unlike the
// mistake-driven simple/FSRS schedulers, there is no pass/fail branching here
// - a ladder completion always books exactly two fixed checkpoints (~4 then
// ~6 weeks after mastery), compressed if the exam is close. Both checkpoints
// are computed from the same masteredAt anchor, not compounded from each
// other, so a delayed cycle-1 check doesn't push cycle-2 later too.

const DAY_MS = 24 * 60 * 60 * 1000;

export const LADDER_INTERVAL_DAYS = [28, 42] as const;
export const LADDER_INTERVAL_DAYS_COMPRESSED = [10, 18] as const;
export const LADDER_COMPRESSION_THRESHOLD_DAYS = 42;

export type LadderCycle = 1 | 2;

export type LadderSchedulerState = {
  source: "ladder";
  cycle: LadderCycle;
  masteredAt: string;
};

export type LadderScheduleResult = {
  dueAt: Date;
  schedulerState: LadderSchedulerState;
};

function intervalsFor(daysToExam: number | null): readonly [number, number] {
  if (daysToExam !== null && Number.isFinite(daysToExam) && daysToExam < LADDER_COMPRESSION_THRESHOLD_DAYS) {
    return LADDER_INTERVAL_DAYS_COMPRESSED;
  }
  return LADDER_INTERVAL_DAYS;
}

/**
 * cycle 1 or 2 -> a due date measured from the same masteredAt anchor.
 * daysToExam of null (unknown target date) uses the uncompressed interval.
 */
export function computeLadderRevisionSchedule(
  cycle: LadderCycle,
  masteredAtMs: number,
  daysToExam: number | null
): LadderScheduleResult {
  const [firstDays, secondDays] = intervalsFor(daysToExam);
  const days = cycle === 1 ? firstDays : secondDays;

  return {
    dueAt: new Date(masteredAtMs + days * DAY_MS),
    schedulerState: {
      source: "ladder",
      cycle,
      masteredAt: new Date(masteredAtMs).toISOString()
    }
  };
}

export function isLadderSchedulerState(value: unknown): value is LadderSchedulerState {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { source?: unknown }).source === "ladder"
  );
}

export function readLadderSchedulerState(value: unknown): LadderSchedulerState | null {
  if (!isLadderSchedulerState(value)) {
    return null;
  }

  const cycle = (value as { cycle?: unknown }).cycle;
  const masteredAt = (value as { masteredAt?: unknown }).masteredAt;

  if ((cycle !== 1 && cycle !== 2) || typeof masteredAt !== "string") {
    return null;
  }

  return { source: "ladder", cycle, masteredAt };
}
