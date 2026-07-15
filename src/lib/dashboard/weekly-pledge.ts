import type { SupabaseClient } from "@supabase/supabase-js";
import { STREAK_EVENT_TYPES } from "@/lib/dashboard/streaks";

export type WeeklyPledgeSummary = {
  /** The user's standing weekly target, or null if they haven't pledged. */
  target: number | null;
  /** Tests completed since the start of the current IST week. */
  completed: number;
  /** ISO date (YYYY-MM-DD, IST) of this week's Monday. */
  weekStartDay: string;
  /** Whole days left in the week, including today. */
  daysLeftInWeek: number;
};

export const MIN_WEEKLY_TARGET = 1;
export const MAX_WEEKLY_TARGET = 50;

// Pledges are counted on the same IST calendar as streaks so a late-evening
// session lands in the week the user experienced it, not the next UTC week.
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The instant (as a Date) at IST midnight starting the Monday of `now`'s IST week. */
export function istWeekStart(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  // getUTCDay on the IST-shifted clock gives the IST weekday: 0=Sun..6=Sat.
  const istWeekday = shifted.getUTCDay();
  const daysSinceMonday = (istWeekday + 6) % 7;
  const istMidnightToday = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  const istMondayMidnight = istMidnightToday - daysSinceMonday * MS_PER_DAY;
  // Convert the IST wall-clock midnight back to a real (UTC) instant.
  return new Date(istMondayMidnight - IST_OFFSET_MINUTES * 60 * 1000);
}

function istDayKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Whole days remaining in the current IST week, counting today (1..7). */
export function daysLeftInIstWeek(now: Date = new Date()): number {
  const weekStart = istWeekStart(now);
  const elapsedDays = Math.floor((now.getTime() - weekStart.getTime()) / MS_PER_DAY);
  return Math.min(7, Math.max(1, 7 - elapsedDays));
}

/**
 * Build a pledge summary from a target and the user's activity timestamps.
 * Pure: `completed` counts timestamps at or after this week's IST Monday.
 */
export function computePledgeProgress(
  target: number | null,
  activityTimestamps: Array<string | Date>,
  now: Date = new Date()
): WeeklyPledgeSummary {
  const weekStart = istWeekStart(now);
  const completed = activityTimestamps.reduce((count, ts) => {
    const instant = typeof ts === "string" ? new Date(ts) : ts;
    return Number.isFinite(instant.getTime()) && instant.getTime() >= weekStart.getTime()
      ? count + 1
      : count;
  }, 0);

  return {
    target: target && target > 0 ? target : null,
    completed,
    weekStartDay: istDayKey(weekStart),
    daysLeftInWeek: daysLeftInIstWeek(now)
  };
}

export async function loadWeeklyPledge(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<WeeklyPledgeSummary> {
  const weekStart = istWeekStart(now);

  const [pledgeResult, eventsResult] = await Promise.all([
    supabase.from("weekly_pledges").select("weekly_target").eq("user_id", userId).maybeSingle(),
    supabase
      .from("user_events")
      .select("occurred_at")
      .eq("user_id", userId)
      .in("event_type", Array.from(STREAK_EVENT_TYPES))
      .gte("occurred_at", weekStart.toISOString())
      .limit(200)
  ]);

  const target =
    !pledgeResult.error && pledgeResult.data
      ? Number((pledgeResult.data as { weekly_target: number | null }).weekly_target)
      : null;

  const timestamps = eventsResult.error
    ? []
    : (eventsResult.data ?? [])
        .map((row) => (row as { occurred_at: string | null }).occurred_at)
        .filter((value): value is string => Boolean(value));

  return computePledgeProgress(Number.isFinite(target) ? target : null, timestamps, now);
}
