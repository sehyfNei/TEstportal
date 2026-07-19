import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueJob, generateIdempotencyKey } from "./enqueue";

/**
 * Nightly (no-payload) job types the daily cron sweep should ensure exist for
 * "today" before draining the pending queue. Each gets a date-scoped
 * idempotency key so the unique constraint on jobs.idempotency_key lets it
 * run once per day forever, rather than once ever.
 */
const NIGHTLY_ENQUEUE_TYPES = ["compute_question_stats"] as const;

/** UTC calendar day key, matching the cron's fixed UTC schedule (vercel.json). */
export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Enqueues today's occurrence of each nightly job type if it hasn't been
 * enqueued yet. Safe to call on every cron tick: a duplicate insert on the
 * same day is a harmless idempotency-key conflict.
 */
export async function ensureNightlyJobsQueued(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<void> {
  const dateKey = utcDayKey(now);

  for (const type of NIGHTLY_ENQUEUE_TYPES) {
    const idempotencyKey = generateIdempotencyKey(type, dateKey);
    const result = await enqueueJob(supabase, type, {}, idempotencyKey);
    if (!result.ok) {
      console.error(`[nightly] failed to enqueue ${type}`, result.error);
    }
  }
}
