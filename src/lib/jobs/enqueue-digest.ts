import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueJob, generateIdempotencyKey } from "./enqueue";
import { istDayKey, istWeekStart } from "@/lib/dashboard/weekly-pledge";

/** True only on the IST calendar day that starts the current week (Monday). */
export function isDigestDay(now: Date): boolean {
  return istDayKey(now) === istDayKey(istWeekStart(now));
}

/**
 * Fans out one weekly_digest job per registered user, gated to run only on
 * the weekly digest day (so a daily cron doesn't attempt 7x redundant
 * enqueue-conflict inserts for the same week) with a week-scoped
 * idempotency key as the real dedup guarantee - same {user_id} payload
 * shape and per-user fan-out design as TSP-085's send_reminders.
 */
export async function ensureDigestJobsQueued(supabase: SupabaseClient, now: Date = new Date()): Promise<void> {
  if (!isDigestDay(now)) {
    return;
  }

  const { data, error } = await supabase.from("user_profiles").select("id").limit(5000);
  if (error) {
    console.error("[digest] failed to load candidate users", error.message);
    return;
  }

  const weekKey = istDayKey(istWeekStart(now));

  for (const row of (data ?? []) as { id: string }[]) {
    const idempotencyKey = generateIdempotencyKey("weekly_digest", row.id, weekKey);
    const result = await enqueueJob(supabase, "weekly_digest", { user_id: row.id }, idempotencyKey);
    if (!result.ok) {
      console.error(`[digest] failed to enqueue weekly_digest for user ${row.id}`, result.error);
    }
  }
}
