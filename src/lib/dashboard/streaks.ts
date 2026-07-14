import type { SupabaseClient } from "@supabase/supabase-js";

export type StreakSummary = {
  current: number;
  longest: number;
  lastActiveDay: string | null;
};

/**
 * Meaningful activity for streak purposes. A streak should reward genuine
 * practice, not merely opening the app — so it is keyed off completed tests,
 * not page views. Kept as a list so more types (e.g. reviews) can qualify
 * later without touching the reducer.
 */
export const STREAK_EVENT_TYPES = ["test_submit"] as const;

// Streaks are counted in India Standard Time so a session finished at 11pm
// local doesn't land on the "next" UTC day and split a real streak.
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Calendar day (YYYY-MM-DD) an instant falls on in IST. */
export function istDayKey(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function dayKeyToUtcNoon(dayKey: string): number {
  // Noon avoids DST/rounding edge cases when diffing whole days.
  return new Date(`${dayKey}T12:00:00.000Z`).getTime();
}

function daysBetween(earlier: string, later: string): number {
  return Math.round((dayKeyToUtcNoon(later) - dayKeyToUtcNoon(earlier)) / MS_PER_DAY);
}

/**
 * Current and longest streak of consecutive active days from a set of activity
 * timestamps. `current` counts back from today (IST) and is 0 once a day has
 * been fully missed; `longest` is the best run ever. Pure and order-independent.
 */
export function computeStreak(activityTimestamps: Array<string | Date>, now: Date = new Date()): StreakSummary {
  const uniqueDays = Array.from(new Set(activityTimestamps.map((ts) => istDayKey(ts)))).sort();

  if (uniqueDays.length === 0) {
    return { current: 0, longest: 0, lastActiveDay: null };
  }

  let longest = 1;
  let run = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    run = daysBetween(uniqueDays[i - 1], uniqueDays[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = istDayKey(now);
  const lastActiveDay = uniqueDays[uniqueDays.length - 1];
  const gapFromToday = daysBetween(lastActiveDay, today);

  // The trailing run is only "current" if the last active day is today or
  // yesterday; a two-day gap means the streak has lapsed.
  const current = gapFromToday <= 1 ? run : 0;

  return { current, longest, lastActiveDay };
}

export async function loadStreakSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<StreakSummary> {
  const { data, error } = await supabase
    .from("user_events")
    .select("occurred_at")
    .eq("user_id", userId)
    .in("event_type", Array.from(STREAK_EVENT_TYPES))
    .order("occurred_at", { ascending: false })
    .limit(1000);

  if (error) {
    return { current: 0, longest: 0, lastActiveDay: null };
  }

  const timestamps = (data ?? [])
    .map((row) => (row as { occurred_at: string | null }).occurred_at)
    .filter((value): value is string => Boolean(value));

  return computeStreak(timestamps);
}
