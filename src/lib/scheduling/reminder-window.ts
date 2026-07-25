export const REMINDER_WINDOW_HOURS = 24;

export type ReminderCandidate = {
  status: string;
  scheduledFor: string;
  reminderSentAt: string | null;
};

/** Due now (overdue) or due within the next REMINDER_WINDOW_HOURS - and not already reminded. */
export function isDueForReminder(
  item: ReminderCandidate,
  now: Date,
  windowHours: number = REMINDER_WINDOW_HOURS
): boolean {
  if (item.status !== "planned" || item.reminderSentAt !== null) {
    return false;
  }

  const scheduledForMs = new Date(item.scheduledFor).getTime();
  if (Number.isNaN(scheduledForMs)) {
    return false;
  }

  return scheduledForMs <= now.getTime() + windowHours * 60 * 60 * 1000;
}
