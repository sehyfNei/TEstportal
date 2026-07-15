import {
  MAX_PRIORITY,
  TOPIC_BOOST_SCALE,
  type InitialScheduleInput,
  type RetestOutcome
} from "@/lib/adaptive/simple-scheduler";

/**
 * FSRS-4.5 scheduler adapter (TSP-064).
 *
 * Implements the Free Spaced Repetition Scheduler behind the same interface as
 * the simple scheduler (computeInitial* / computeRetest* returning
 * {dueAt, priority, schedulerState}), so it is a drop-in when the `fsrs`
 * feature flag is turned on. FSRS state (stability + difficulty) rides in the
 * existing jsonb `retest_queue.scheduler_state`; no migration is required and
 * `scheduler = 'fsrs'` is already an allowed enum value.
 *
 * Reference: FSRS-4.5 algorithm (github.com/open-spaced-repetition). The retest
 * loop only has a binary outcome, so pass maps to grade Good(3) and fail to
 * Again(1). The default 17-weight vector is used; exact magnitudes are not
 * load-bearing — the update rules and their direction are.
 */

// Canonical FSRS-4.5 default parameters (w0..w16).
export const FSRS_DEFAULT_WEIGHTS: readonly number[] = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
];

// Forgetting curve constants. R(t,S) = (1 + FACTOR * t / S) ^ DECAY.
const DECAY = -0.5;
const FACTOR = 19 / 81;

export const FSRS_DEFAULT_RETENTION = 0.9;
const MIN_STABILITY = 0.1;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Grades used by the binary retest loop.
const GRADE_AGAIN = 1;
const GRADE_GOOD = 3;

export type FsrsSchedulerState = {
  intervalDays: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt: string | null;
  stability: number;
  difficulty: number;
};

export type FsrsScheduleResult = {
  dueAt: Date;
  priority: number;
  schedulerState: FsrsSchedulerState;
};

type Grade = typeof GRADE_AGAIN | typeof GRADE_GOOD;

/** Initial stability for a first review at the given grade: S0(G) = w[G-1]. */
export function initialStability(grade: Grade, weights = FSRS_DEFAULT_WEIGHTS): number {
  return Math.max(MIN_STABILITY, weights[grade - 1]);
}

/** Initial difficulty: D0(G) = w4 - (G-3) * w5, clamped to [1, 10]. */
export function initialDifficulty(grade: Grade, weights = FSRS_DEFAULT_WEIGHTS): number {
  return clampDifficulty(weights[4] - (grade - 3) * weights[5]);
}

/** Retrievability after `elapsedDays` given `stability`. R(0)=1, decreasing in time. */
export function retrievability(elapsedDays: number, stability: number): number {
  const t = Math.max(0, elapsedDays);
  const s = Math.max(MIN_STABILITY, stability);
  return (1 + FACTOR * (t / s)) ** DECAY;
}

/** Interval (days) that decays `stability` to `retention`. At r=0.9, interval ≈ stability. */
export function nextInterval(stability: number, retention = FSRS_DEFAULT_RETENTION): number {
  const s = Math.max(MIN_STABILITY, stability);
  const days = (s / FACTOR) * (retention ** (1 / DECAY) - 1);
  return Math.max(1, Math.round(days));
}

/**
 * Difficulty after a review, with mean reversion toward the "Easy" baseline so
 * difficulty drifts back over time rather than ratcheting to the extremes.
 */
export function nextDifficulty(
  difficulty: number,
  grade: Grade,
  weights = FSRS_DEFAULT_WEIGHTS
): number {
  const shifted = difficulty - weights[6] * (grade - 3);
  const easyBaseline = weights[4] - (4 - 3) * weights[5];
  const reverted = weights[7] * easyBaseline + (1 - weights[7]) * shifted;
  return clampDifficulty(reverted);
}

/** Stability after a successful recall — always grows, more so at low retrievability. */
export function stabilityAfterRecall(
  stability: number,
  difficulty: number,
  reviewRetrievability: number,
  weights = FSRS_DEFAULT_WEIGHTS
): number {
  const growth =
    Math.exp(weights[8]) *
    (11 - difficulty) *
    Math.pow(stability, -weights[9]) *
    (Math.exp((1 - reviewRetrievability) * weights[10]) - 1);
  return Math.max(MIN_STABILITY, stability * (1 + growth));
}

/** Post-lapse stability after a failure — typically well below the prior stability. */
export function stabilityAfterLapse(
  stability: number,
  difficulty: number,
  reviewRetrievability: number,
  weights = FSRS_DEFAULT_WEIGHTS
): number {
  const postLapse =
    weights[11] *
    Math.pow(difficulty, -weights[12]) *
    (Math.pow(stability + 1, weights[13]) - 1) *
    Math.exp((1 - reviewRetrievability) * weights[14]);
  // Never let a lapse increase stability.
  return Math.max(MIN_STABILITY, Math.min(postLapse, stability));
}

export function computeInitialScheduleFsrs(
  input: InitialScheduleInput,
  nowMs?: number,
  weights = FSRS_DEFAULT_WEIGHTS
): FsrsScheduleResult {
  const now = new Date(nowMs ?? Date.now());
  // Retest-queue entries come from mistakes, so seed as a lapse (Again).
  const stability = initialStability(GRADE_AGAIN, weights);
  const difficulty = initialDifficulty(GRADE_AGAIN, weights);
  const intervalDays = nextInterval(stability);
  const basePriority =
    input.mistakeTypes.length > 0
      ? Math.max(...input.mistakeTypes.map((type) => MISTAKE_TYPE_PRIORITY[type] ?? 0))
      : 0;

  return {
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    priority: clampPriority(basePriority + topicBoost(input.topicWeightPercent)),
    schedulerState: {
      intervalDays,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
      stability,
      difficulty
    }
  };
}

export function computeRetestScheduleFsrs(
  outcome: RetestOutcome,
  existingState: FsrsSchedulerState,
  topicWeightPercent: number | null,
  nowMs?: number,
  weights = FSRS_DEFAULT_WEIGHTS
): FsrsScheduleResult {
  const now = new Date(nowMs ?? Date.now());
  const elapsedDays = elapsedSince(existingState.lastReviewedAt, existingState.intervalDays, now);
  const reviewR = retrievability(elapsedDays, existingState.stability);
  const grade: Grade = outcome === "pass" ? GRADE_GOOD : GRADE_AGAIN;
  const difficulty = nextDifficulty(existingState.difficulty, grade, weights);

  if (outcome === "pass") {
    const stability = stabilityAfterRecall(
      existingState.stability,
      existingState.difficulty,
      reviewR,
      weights
    );
    const intervalDays = nextInterval(stability);

    return {
      dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
      priority: clampPriority(1 + topicBoost(topicWeightPercent)),
      schedulerState: {
        intervalDays,
        repetitions: Math.max(0, existingState.repetitions) + 1,
        lapses: Math.max(0, existingState.lapses),
        lastReviewedAt: now.toISOString(),
        stability,
        difficulty
      }
    };
  }

  const stability = stabilityAfterLapse(
    existingState.stability,
    existingState.difficulty,
    reviewR,
    weights
  );
  const intervalDays = nextInterval(stability);
  const lapses = Math.max(0, existingState.lapses) + 1;
  const lapseBoost = Math.min(lapses, 3) * 0.5;

  return {
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
    priority: clampPriority(2 + lapseBoost + topicBoost(topicWeightPercent)),
    schedulerState: {
      intervalDays,
      repetitions: 0,
      lapses,
      lastReviewedAt: now.toISOString(),
      stability,
      difficulty
    }
  };
}

// Mirrors simple-scheduler's mistake-type priorities so the two adapters rank
// consistently for the shared retest queue.
const MISTAKE_TYPE_PRIORITY: Record<string, number> = {
  overconfidence: 3,
  conceptual_gap: 2,
  not_attempted: 1,
  lucky_guess: 1,
  bookmarked: 0.5
};

function elapsedSince(lastReviewedAt: string | null, fallbackDays: number, now: Date): number {
  if (!lastReviewedAt) {
    return Math.max(0, fallbackDays);
  }

  const last = new Date(lastReviewedAt).getTime();
  if (!Number.isFinite(last)) {
    return Math.max(0, fallbackDays);
  }

  return Math.max(0, (now.getTime() - last) / DAY_MS);
}

function topicBoost(topicWeightPercent: number | null): number {
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

function clampDifficulty(difficulty: number): number {
  if (!Number.isFinite(difficulty)) {
    return MIN_DIFFICULTY;
  }

  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, difficulty));
}
