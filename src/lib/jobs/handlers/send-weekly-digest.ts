import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchDashboardOverview } from "@/lib/dashboard/overview";
import { istWeekStart } from "@/lib/dashboard/weekly-pledge";
import { sendDigestEmail } from "@/lib/notifications/digest-email";

type ScheduledItemRow = {
  session_type: string;
  scheduled_for: string;
};

const UPCOMING_WINDOW_DAYS = 7;

/**
 * One job per user (weekly_digest's reserved {user_id} payload, same
 * per-user fan-out shape as send_reminders). Reuses fetchDashboardOverview
 * (the same aggregate the dashboard page itself renders) for weak topics -
 * a single source of truth for "what's this student's weak topics," rather
 * than re-deriving it here.
 */
export async function sendWeeklyDigestJob(userId: string, supabase: SupabaseClient, now: Date = new Date()): Promise<void> {
  const examId = await resolveMostRecentExamId(supabase, userId);
  if (!examId) {
    return;
  }

  const [overview, examResult, weekCountResult, upcomingResult, userResult] = await Promise.all([
    fetchDashboardOverview(supabase, userId, examId),
    supabase.from("exams").select("name").eq("id", examId).maybeSingle(),
    supabase
      .from("session_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .gte("created_at", istWeekStart(now).toISOString()),
    supabase
      .from("scheduled_items")
      .select("session_type,scheduled_for")
      .eq("user_id", userId)
      .eq("status", "planned")
      .gte("scheduled_for", now.toISOString())
      .lte("scheduled_for", new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString())
      .order("scheduled_for", { ascending: true }),
    supabase.auth.admin.getUserById(userId)
  ]);

  if (examResult.error) {
    throw new Error(`Failed to load exam for digest (user ${userId}): ${examResult.error.message}`);
  }
  if (weekCountResult.error) {
    throw new Error(`Failed to count weekly sessions for digest (user ${userId}): ${weekCountResult.error.message}`);
  }
  if (upcomingResult.error) {
    throw new Error(`Failed to load upcoming schedule for digest (user ${userId}): ${upcomingResult.error.message}`);
  }

  const toEmail = userResult.error ? null : (userResult.data.user?.email ?? null);
  if (!toEmail) {
    return;
  }

  try {
    await sendDigestEmail({
      toEmail,
      examName: (examResult.data as { name: string } | null)?.name ?? "your exam",
      testsCompletedThisWeek: weekCountResult.count ?? 0,
      weakTopics: overview.weakTopics.map((topic) => ({
        topicName: topic.topicName,
        masteryScore: topic.masteryScore
      })),
      upcoming: ((upcomingResult.data ?? []) as ScheduledItemRow[]).map((item) => ({
        sessionType: item.session_type,
        scheduledFor: item.scheduled_for
      }))
    });
  } catch (err) {
    console.error("[digest] sendDigestEmail threw for user", userId, err);
  }
}

async function resolveMostRecentExamId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: sessionRow, error: sessionError } = await supabase
    .from("test_sessions")
    .select("exam_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Failed to resolve exam from test_sessions for digest (user ${userId}): ${sessionError.message}`);
  }
  if ((sessionRow as { exam_id?: string } | null)?.exam_id) {
    return (sessionRow as { exam_id: string }).exam_id;
  }

  const { data: scheduledRow, error: scheduledError } = await supabase
    .from("scheduled_items")
    .select("exam_id")
    .eq("user_id", userId)
    .eq("status", "planned")
    .order("scheduled_for", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (scheduledError) {
    throw new Error(`Failed to resolve exam from scheduled_items for digest (user ${userId}): ${scheduledError.message}`);
  }

  return (scheduledRow as { exam_id?: string } | null)?.exam_id ?? null;
}
