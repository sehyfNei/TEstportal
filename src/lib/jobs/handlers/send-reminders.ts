import type { SupabaseClient } from "@supabase/supabase-js";
import { isDueForReminder } from "@/lib/scheduling/reminder-window";
import { sendReminderEmail } from "@/lib/notifications/reminder-email";

type ScheduledItemRow = {
  id: string;
  exam_id: string;
  item_type: string;
  session_type: string;
  scheduled_for: string;
  status: string;
  reminder_sent_at: string | null;
};

type ExamRow = { id: string; name: string };

/**
 * One job per user (send_reminders' reserved {user_id} payload). Sends (or,
 * when RESEND_API_KEY/REMINDER_FROM_EMAIL aren't configured yet, skips) an
 * email reminder for each of that user's due scheduled_items, then marks
 * reminder_sent_at on every processed item regardless of whether the email
 * actually went out - the "in-app" side of the reminder is already covered
 * by the schedule page surfacing due/overdue items on its own, so this must
 * not re-process the same item forever just because email isn't set up yet.
 */
export async function sendRemindersJob(userId: string, supabase: SupabaseClient, now: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from("scheduled_items")
    .select("id,exam_id,item_type,session_type,scheduled_for,status,reminder_sent_at")
    .eq("user_id", userId)
    .eq("status", "planned")
    .is("reminder_sent_at", null);

  if (error) {
    throw new Error(`Failed to load scheduled_items for user ${userId}: ${error.message}`);
  }

  const dueItems = ((data ?? []) as ScheduledItemRow[]).filter((item) =>
    isDueForReminder({ status: item.status, scheduledFor: item.scheduled_for, reminderSentAt: item.reminder_sent_at }, now)
  );

  if (dueItems.length === 0) {
    return;
  }

  const examIds = [...new Set(dueItems.map((item) => item.exam_id))];
  const { data: examRows, error: examError } = await supabase.from("exams").select("id,name").in("id", examIds);
  if (examError) {
    throw new Error(`Failed to load exams for reminder job (user ${userId}): ${examError.message}`);
  }
  const examNameById = new Map(((examRows ?? []) as ExamRow[]).map((exam) => [exam.id, exam.name]));

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  const toEmail = userError ? null : (userData.user?.email ?? null);

  for (const item of dueItems) {
    if (toEmail) {
      try {
        await sendReminderEmail({
          toEmail,
          examName: examNameById.get(item.exam_id) ?? "your exam",
          sessionType: item.session_type,
          scheduledFor: item.scheduled_for
        });
      } catch (err) {
        console.error("[reminders] sendReminderEmail threw for scheduled item", item.id, err);
      }
    }

    const { error: updateError } = await supabase
      .from("scheduled_items")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", item.id);

    if (updateError) {
      console.error("[reminders] failed to mark reminder_sent_at for", item.id, updateError.message);
    }
  }
}
