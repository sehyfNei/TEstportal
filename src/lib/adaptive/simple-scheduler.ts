export const MISTAKE_TYPE_PRIORITY: Record<string, number> = {
  overconfidence: 3,
  conceptual_gap: 2,
  not_attempted: 1,
  lucky_guess: 1,
  bookmarked: 0.5
};

export const INTERVAL_DAYS_SEQUENCE = [1, 2, 4, 8, 14, 21, 30] as const;
export const MAX_PRIORITY = 10;
export const TOPIC_BOOST_SCALE = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SchedulerState = {
  intervalDays: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt: string | null;
};

export type InitialScheduleInput = {
  mistakeTypes: string[];
  topicWeightPercent: number | null;
};

export type RetestOutcome = "pass" | "fail";

export type ScheduleResult = {
  dueAt: Date;
  priority: number;
  schedulerState: SchedulerState;
};

export function computeInitialSchedule(
  input: InitialScheduleInput,
  nowMs?: number
): ScheduleResult {
  const now = new Date(nowMs ?? Date.now());
  const basePriority =
    input.mistakeTypes.length > 0
      ? Math.max(...input.mistakeTypes.map((type) => MISTAKE_TYPE_PRIORITY[type] ?? 0))
      : 0;
  const topicBoost = computeTopicBoost(input.topicWeightPercent);
  const intervalDays = INTERVAL_DAYS_SEQUENCE[0];

  return {
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    priority: clampPriority(basePriority + topicBoost),
    schedulerState: {
      intervalDays,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null
    }
  };
}

export function computeRetestSchedule(
  outcome: RetestOutcome,
  existingState: SchedulerState,
  topicWeightPercent: number | null,
  nowMs?: number
): ScheduleResult {
  const now = new Date(nowMs ?? Date.now());
  const topicBoost = computeTopicBoost(topicWeightPercent);

  if (outcome === "pass") {
    const repetitions = Math.max(0, existingState.repetitions) + 1;
    const intervalIndex = Math.min(repetitions, INTERVAL_DAYS_SEQUENCE.length - 1);
    const intervalDays = INTERVAL_DAYS_SEQUENCE[intervalIndex];

    return {
      dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
      priority: clampPriority(1 + topicBoost),
      schedulerState: {
        intervalDays,
        repetitions,
        lapses: Math.max(0, existingState.lapses),
        lastReviewedAt: now.toISOString()
      }
    };
  }

  const lapses = Math.max(0, existingState.lapses) + 1;
  const lapseBoost = Math.min(lapses, 3) * 0.5;
  const intervalDays = INTERVAL_DAYS_SEQUENCE[0];

  return {
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    priority: clampPriority(2 + lapseBoost + topicBoost),
    schedulerState: {
      intervalDays,
      repetitions: 0,
      lapses,
      lastReviewedAt: now.toISOString()
    }
  };
}

function computeTopicBoost(topicWeightPercent: number | null): number {
  return topicWeightPercent !== null && Number.isFinite(topicWeightPercent)
    ? (topicWeightPercent / 100) * TOPIC_BOOST_SCALE
    : 0;
}

function clampPriority(priority: number): number {
  if (!Number.isFinite(priority)) {
    return 0;
  }

  return Math.min(MAX_PRIORITY, Math.max(0, priority));
}
