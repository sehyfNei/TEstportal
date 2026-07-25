import type { SupabaseClient } from "@supabase/supabase-js";

type ResultRow = {
  user_id: string;
  exam_id: string;
};

type PathRow = {
  id: string;
};

type MilestoneRow = {
  id: string;
  topic_id: string;
  target_mastery: number | string;
  completed_at: string | null;
};

type MasteryRow = {
  topic_id: string | null;
  mastery_score: number | string | null;
};

/**
 * Runs right after updateMasteryJob in the submit side-effect chain (TSP-174)
 * so it sees this attempt's freshly written mastery_records, not stale ones.
 * A no-op for the (common, early-on) case where the student hasn't set a
 * learning-path goal for this exam yet.
 */
export async function updatePathProgressJob(resultId: string, supabase: SupabaseClient): Promise<void> {
  const { data: result, error: resultError } = await supabase
    .from("session_results")
    .select("user_id,exam_id")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError || !result) {
    throw new Error(
      `[path_progress] session_results lookup failed for ${resultId}: ${resultError?.message ?? "not found"}`
    );
  }

  const resultRow = result as ResultRow;

  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select("id")
    .eq("user_id", resultRow.user_id)
    .eq("exam_id", resultRow.exam_id)
    .eq("status", "active")
    .maybeSingle();

  if (pathError) {
    throw new Error(`[path_progress] learning_paths lookup failed: ${pathError.message}`);
  }

  if (!path) {
    return;
  }

  const pathRow = path as PathRow;

  const [milestonesResult, masteryResult] = await Promise.all([
    supabase.from("path_milestones").select("id,topic_id,target_mastery,completed_at").eq("path_id", pathRow.id),
    supabase
      .from("mastery_records")
      .select("topic_id,mastery_score")
      .eq("user_id", resultRow.user_id)
      .eq("exam_id", resultRow.exam_id)
      .not("topic_id", "is", null)
  ]);

  if (milestonesResult.error) {
    throw new Error(`[path_progress] path_milestones lookup failed: ${milestonesResult.error.message}`);
  }

  if (masteryResult.error) {
    throw new Error(`[path_progress] mastery_records lookup failed: ${masteryResult.error.message}`);
  }

  const masteryByTopicId = new Map<string, number>();
  for (const row of (masteryResult.data ?? []) as MasteryRow[]) {
    if (row.topic_id) {
      masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
    }
  }

  const milestones = (milestonesResult.data ?? []) as MilestoneRow[];
  const newlyCompletedIds = milestones
    .filter((milestone) => milestone.completed_at === null)
    .filter((milestone) => {
      const mastery = masteryByTopicId.get(milestone.topic_id);
      return mastery !== undefined && mastery >= toNumber(milestone.target_mastery);
    })
    .map((milestone) => milestone.id);

  if (newlyCompletedIds.length > 0) {
    const { error: updateError } = await supabase
      .from("path_milestones")
      .update({ completed_at: new Date().toISOString() })
      .in("id", newlyCompletedIds);

    if (updateError) {
      throw new Error(`[path_progress] milestone completion update failed: ${updateError.message}`);
    }
  }

  const totalCount = milestones.length;
  const completedCount = milestones.filter((milestone) => milestone.completed_at !== null).length + newlyCompletedIds.length;
  const overallProgressPercent = totalCount === 0 ? 0 : roundToTwoDecimals((completedCount / totalCount) * 100);

  const { error: progressError } = await supabase
    .from("learning_paths")
    .update({ overall_progress_percent: overallProgressPercent })
    .eq("id", pathRow.id);

  if (progressError) {
    throw new Error(`[path_progress] path progress update failed: ${progressError.message}`);
  }
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
