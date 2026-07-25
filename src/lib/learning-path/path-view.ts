export type PathMilestoneView = {
  topicId: string;
  topicName: string;
  weekNumber: number;
  targetMastery: number;
  currentMastery: number;
  completed: boolean;
};

export type WeekGroup = {
  weekNumber: number;
  isCurrentWeek: boolean;
  milestones: PathMilestoneView[];
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Week 1 starts the day the path is created; clamped to the plan's own range. */
export function computeCurrentWeekNumber(createdAtIso: string, now: Date, maxWeek: number): number {
  const createdAt = new Date(createdAtIso);
  if (Number.isNaN(createdAt.getTime()) || maxWeek <= 0) {
    return 1;
  }

  const weeksElapsed = Math.floor((now.getTime() - createdAt.getTime()) / MS_PER_WEEK);
  return Math.min(maxWeek, Math.max(1, weeksElapsed + 1));
}

export function groupMilestonesByWeek(milestones: PathMilestoneView[], currentWeekNumber: number): WeekGroup[] {
  const byWeek = new Map<number, PathMilestoneView[]>();

  for (const milestone of milestones) {
    const list = byWeek.get(milestone.weekNumber) ?? [];
    list.push(milestone);
    byWeek.set(milestone.weekNumber, list);
  }

  return [...byWeek.keys()]
    .sort((a, b) => a - b)
    .map((weekNumber) => ({
      weekNumber,
      isCurrentWeek: weekNumber === currentWeekNumber,
      milestones: [...(byWeek.get(weekNumber) ?? [])].sort((a, b) => a.topicName.localeCompare(b.topicName))
    }));
}
