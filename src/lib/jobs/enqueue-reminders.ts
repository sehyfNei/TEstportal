import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueJob, generateIdempotencyKey } from "./enqueue";
import { isDueForReminder } from "@/lib/scheduling/reminder-window";
import { utcDayKey } from "./nightly";

type ScheduledItemRow = {
  user_id: string;
  status: string;
  scheduled_for: string;
  reminder_sent_at: string | null;
};

/**
 * Fans out one send_reminders job per distinct user with at least one item
 * due for a reminder - not a single batch job, matching send_reminders'
 * already-reserved {user_id} payload shape (JobPayloads in ./types). A
 * date-scoped idempotency key (per user, per day) keeps this safe to call on
 * every cron tick without double-enqueueing the same user twice in one day.
 */
export async function ensureReminderJobsQueued(supabase: SupabaseClient, now: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from("scheduled_items")
    .select("user_id,status,scheduled_for,reminder_sent_at")
    .eq("status", "planned")
    .is("reminder_sent_at", null)
    .limit(2000);

  if (error) {
    console.error("[reminders] failed to load scheduled_items for enqueueing", error.message);
    return;
  }

  const dueUserIds = new Set(
    ((data ?? []) as ScheduledItemRow[])
      .filter((item) =>
        isDueForReminder({ status: item.status, scheduledFor: item.scheduled_for, reminderSentAt: item.reminder_sent_at }, now)
      )
      .map((item) => item.user_id)
  );

  const dateKey = utcDayKey(now);

  for (const userId of dueUserIds) {
    const idempotencyKey = generateIdempotencyKey("send_reminders", userId, dateKey);
    const result = await enqueueJob(supabase, "send_reminders", { user_id: userId }, idempotencyKey);
    if (!result.ok) {
      console.error(`[reminders] failed to enqueue send_reminders for user ${userId}`, result.error);
    }
  }
}
