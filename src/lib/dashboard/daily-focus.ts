import type { WeakTopic } from "@/lib/dashboard/overview";

export const MIN_CONCEPTS_PER_DAY = 1;
export const MAX_CONCEPTS_PER_DAY = 8;
export const DEFAULT_CONCEPTS_PER_DAY = 2;

// Reserve the last quarter of the runway to the exam for pure revision/mocks
// rather than new-topic coverage, so the suggested pace finishes content
// with buffer instead of right up against the exam date.
const COVERAGE_BUFFER_FRACTION = 0.75;

/**
 * Suggests how many topics/day to surface, from days-to-exam, how many
 * topics still need laddering, and the student's own observed pace (days
 * per topic mastered so far, if any). First-pass heuristic - tune with real
 * usage data once this ships, not a formally derived formula.
 */
export function computeConceptsPerDay(
  daysToExam: number | null,
  topicsRemaining: number,
  observedPaceDaysPerTopic: number | null
): number {
  if (topicsRemaining <= 0) {
    return MIN_CONCEPTS_PER_DAY;
  }

  const bufferedDays =
    daysToExam !== null && Number.isFinite(daysToExam) && daysToExam > 0
      ? daysToExam * COVERAGE_BUFFER_FRACTION
      : null;

  const requiredPerDay = bufferedDays !== null && bufferedDays > 0 ? topicsRemaining / bufferedDays : null;
  const pacedPerDay =
    observedPaceDaysPerTopic !== null && Number.isFinite(observedPaceDaysPerTopic) && observedPaceDaysPerTopic > 0
      ? 1 / observedPaceDaysPerTopic
      : null;

  const candidates = [requiredPerDay, pacedPerDay].filter(
    (value): value is number => value !== null && Number.isFinite(value) && value > 0
  );

  const suggested = candidates.length > 0 ? Math.max(...candidates) : DEFAULT_CONCEPTS_PER_DAY;

  return clamp(Math.ceil(suggested), MIN_CONCEPTS_PER_DAY, MAX_CONCEPTS_PER_DAY);
}

export type LadderState = {
  topicId: string;
  completedAt: string | null;
};

/**
 * Picks today's focus topics from the shared weak-topics priority list
 * (buildWeakTopics, already sorted by weight x mastery-gap, capped at 5),
 * skipping any topic whose ladder is already complete for this cycle.
 */
export function pickTodaysFocusTopics(
  weakTopics: WeakTopic[],
  ladderStates: Map<string, LadderState>,
  count: number
): string[] {
  const boundedCount = clamp(count, MIN_CONCEPTS_PER_DAY, MAX_CONCEPTS_PER_DAY);

  return weakTopics
    .filter((topic) => {
      const state = ladderStates.get(topic.topicId);
      return !state || !state.completedAt;
    })
    .slice(0, boundedCount)
    .map((topic) => topic.topicId);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
