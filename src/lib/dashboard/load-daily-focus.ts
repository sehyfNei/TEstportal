import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWeakTopics, computeWeakTopicPriority } from "@/lib/dashboard/overview";
import { istDayKey } from "@/lib/dashboard/weekly-pledge";
import { computeConceptsPerDay, pickTodaysFocusTopics, type LadderState } from "@/lib/dashboard/daily-focus";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FocusLadder = {
  rungsAttempted: number;
  rungsCorrect: number;
  completedAt: string | null;
};

export type FocusTopic = {
  topicId: string;
  topicName: string;
  priority: number;
  masteryScore: number;
  ladder: FocusLadder | null;
};

export type DailyFocusView = {
  examId: string;
  dayKey: string;
  conceptsPerDay: number;
  topics: FocusTopic[];
  daysToExam: number | null;
};

/**
 * The one entry point /study/today reads from. Picks (and persists, so a
 * reload doesn't reshuffle) today's focus topics the first time they're
 * needed for a given IST day, reusing the same buildWeakTopics priority
 * primitive the dashboard/learning-path already use.
 */
export async function loadDailyFocus(
  supabase: SupabaseClient,
  userId: string,
  examId: string,
  now: Date = new Date()
): Promise<DailyFocusView> {
  const dayKey = istDayKey(now);

  const [settingsResult, topicsResult, masteryResult, ladderResult, pathResult] = await Promise.all([
    supabase.from("daily_focus_settings").select("concepts_per_day").eq("user_id", userId).maybeSingle(),
    supabase.from("topics").select("id,name,weight_percent").eq("exam_id", examId).not("weight_percent", "is", null),
    supabase
      .from("mastery_records")
      .select("topic_id,mastery_score")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .not("topic_id", "is", null),
    supabase
      .from("topic_ladder_progress")
      .select("topic_id,rung_results,completed_at")
      .eq("user_id", userId)
      .eq("exam_id", examId),
    supabase
      .from("learning_paths")
      .select("target_date")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .eq("status", "active")
      .maybeSingle()
  ]);

  const masteryByTopicId = new Map<string, number>();
  for (const row of (masteryResult.data ?? []) as Array<{
    topic_id: string | null;
    mastery_score: number | string | null;
  }>) {
    if (row.topic_id) {
      masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
    }
  }

  const topicRows = (topicsResult.data ?? []) as Array<{
    id: string;
    name: string;
    weight_percent: number | string | null;
  }>;
  const weakTopics = buildWeakTopics(topicRows, masteryByTopicId);

  const ladderByTopicId = new Map<string, LadderState & FocusLadder>();
  for (const row of (ladderResult.data ?? []) as Array<{
    topic_id: string;
    rung_results: unknown;
    completed_at: string | null;
  }>) {
    const rungResults = Array.isArray(row.rung_results) ? (row.rung_results as Array<{ correct?: boolean }>) : [];
    ladderByTopicId.set(row.topic_id, {
      topicId: row.topic_id,
      completedAt: row.completed_at,
      rungsAttempted: rungResults.length,
      rungsCorrect: rungResults.filter((rung) => rung.correct === true).length
    });
  }

  const targetDate = (pathResult.data as { target_date?: string | null } | null)?.target_date ?? null;
  const daysToExam = targetDate ? Math.round((new Date(targetDate).getTime() - now.getTime()) / DAY_MS) : null;

  const existingSettings = settingsResult.data as { concepts_per_day: number } | null;
  const topicsRemaining = weakTopics.filter((topic) => !ladderByTopicId.get(topic.topicId)?.completedAt).length;
  const suggestedCount = computeConceptsPerDay(daysToExam, topicsRemaining, null);
  const conceptsPerDay = existingSettings?.concepts_per_day ?? suggestedCount;

  const { data: existingItems } = await supabase
    .from("daily_focus_items")
    .select("topic_id")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("day_key", dayKey);

  let pickedTopicIds: string[];

  if (existingItems && existingItems.length > 0) {
    pickedTopicIds = (existingItems as Array<{ topic_id: string }>).map((row) => row.topic_id);
  } else {
    pickedTopicIds = pickTodaysFocusTopics(weakTopics, ladderByTopicId, conceptsPerDay);

    if (pickedTopicIds.length > 0) {
      await supabase.from("daily_focus_items").upsert(
        pickedTopicIds.map((topicId) => ({
          user_id: userId,
          exam_id: examId,
          day_key: dayKey,
          topic_id: topicId
        })),
        { onConflict: "user_id,exam_id,day_key,topic_id", ignoreDuplicates: true }
      );
    }
  }

  // Resolve display info from the FULL topic list, not just the top-5 weak
  // slice buildWeakTopics returns - a topic mastered earlier today should
  // still render (with its Mastered state), even though it has since fallen
  // out of the live weak-topics ranking. Only fresh picks (below) are gated
  // on actually being weak; once picked for the day, a topic stays visible.
  const topicInfoById = new Map(
    topicRows.map((topic) => {
      const masteryScore = masteryByTopicId.get(topic.id) ?? 0;
      const weightPercent = toNumber(topic.weight_percent);
      return [
        topic.id,
        { topicName: topic.name, masteryScore, priority: computeWeakTopicPriority(weightPercent, masteryScore) }
      ] as const;
    })
  );

  const topics: FocusTopic[] = pickedTopicIds
    .map((topicId): FocusTopic | null => {
      const info = topicInfoById.get(topicId);

      if (!info) {
        return null;
      }

      const ladder = ladderByTopicId.get(topicId);

      return {
        topicId,
        topicName: info.topicName,
        priority: info.priority,
        masteryScore: info.masteryScore,
        ladder: ladder
          ? { rungsAttempted: ladder.rungsAttempted, rungsCorrect: ladder.rungsCorrect, completedAt: ladder.completedAt }
          : null
      };
    })
    .filter((topic): topic is FocusTopic => topic !== null);

  return { examId, dayKey, conceptsPerDay, topics, daysToExam };
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
