import type { SupabaseClient } from "@supabase/supabase-js";
import { computeInitialSchedule } from "@/lib/adaptive/simple-scheduler";

const ACTIVE_RETEST_STATUSES = ["due", "scheduled", "snoozed"];

type ResultRow = {
  session_id: string;
  user_id: string;
  exam_id: string;
};

type MistakeRow = {
  concept_id: string | null;
  topic_id: string | null;
  mistake_type: string;
};

type TopicRow = {
  id: string;
  weight_percent: number | string | null;
};

type ActiveRetestRow = {
  id: string;
  priority: number | string | null;
};

type RetestGroup = {
  conceptId: string | null;
  topicId: string | null;
  mistakeTypes: string[];
};

export async function updateRetestQueueJob(
  resultId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: result, error: resultError } = await supabase
    .from("session_results")
    .select("session_id,user_id,exam_id")
    .eq("id", resultId)
    .maybeSingle();

  if (resultError || !result) {
    throw new Error(
      `[retest] session_results lookup failed for ${resultId}: ${resultError?.message ?? "not found"}`
    );
  }

  const resultRow = result as ResultRow;
  const { data: mistakes, error: mistakeError } = await supabase
    .from("mistake_items")
    .select("concept_id,topic_id,mistake_type")
    .eq("session_id", resultRow.session_id)
    .eq("user_id", resultRow.user_id)
    .eq("status", "unresolved");

  if (mistakeError) {
    throw new Error(`[retest] mistake_items lookup failed: ${mistakeError.message}`);
  }

  const groups = groupMistakes((mistakes ?? []) as MistakeRow[]);
  if (groups.size === 0) {
    return;
  }

  const topicWeightMap = await loadTopicWeights(supabase, groups);
  const nowMs = Date.now();

  for (const group of groups.values()) {
    const topicWeight = group.topicId ? (topicWeightMap.get(group.topicId) ?? null) : null;
    const { dueAt, priority, schedulerState } = computeInitialSchedule(
      {
        mistakeTypes: group.mistakeTypes,
        topicWeightPercent: topicWeight
      },
      nowMs
    );
    const activeRow = await findActiveRetestRow(
      supabase,
      resultRow.user_id,
      resultRow.exam_id,
      group.conceptId,
      group.topicId
    );

    if (activeRow) {
      await updatePriorityIfHigher(supabase, activeRow, priority, nowMs);
      continue;
    }

    const { error: insertError } = await supabase.from("retest_queue").insert({
      user_id: resultRow.user_id,
      exam_id: resultRow.exam_id,
      concept_id: group.conceptId,
      topic_id: group.topicId,
      due_at: dueAt.toISOString(),
      scheduler: "simple",
      scheduler_state: schedulerState,
      priority,
      status: "due"
    });

    if (insertError) {
      throw new Error(`[retest] retest_queue insert failed: ${insertError.message}`);
    }
  }
}

async function findActiveRetestRow(
  supabase: SupabaseClient,
  userId: string,
  examId: string,
  conceptId: string | null,
  topicId: string | null
): Promise<ActiveRetestRow | null> {
  if (conceptId) {
    const { data, error } = await supabase
      .from("retest_queue")
      .select("id,priority")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .eq("concept_id", conceptId)
      .is("topic_id", null)
      .in("status", ACTIVE_RETEST_STATUSES)
      .limit(1);

    if (error) {
      throw new Error(`[retest] active concept retest lookup failed: ${error.message}`);
    }

    return ((data ?? []) as ActiveRetestRow[])[0] ?? null;
  }

  if (!topicId) {
    return null;
  }

  const { data, error } = await supabase
    .from("retest_queue")
    .select("id,priority")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("topic_id", topicId)
    .is("concept_id", null)
    .in("status", ACTIVE_RETEST_STATUSES)
    .limit(1);

  if (error) {
    throw new Error(`[retest] active topic retest lookup failed: ${error.message}`);
  }

  return ((data ?? []) as ActiveRetestRow[])[0] ?? null;
}

function groupMistakes(rows: MistakeRow[]): Map<string, RetestGroup> {
  const groups = new Map<string, RetestGroup>();

  for (const row of rows) {
    if (!row.concept_id && !row.topic_id) {
      continue;
    }

    const key = row.concept_id ? `concept:${row.concept_id}` : `topic:${row.topic_id}`;
    const existing = groups.get(key);

    if (existing) {
      existing.mistakeTypes.push(row.mistake_type);
      continue;
    }

    groups.set(key, {
      conceptId: row.concept_id,
      topicId: row.concept_id ? null : row.topic_id,
      mistakeTypes: [row.mistake_type]
    });
  }

  return groups;
}

async function loadTopicWeights(supabase: SupabaseClient, groups: Map<string, RetestGroup>) {
  const topicIds = [
    ...new Set(
      [...groups.values()]
        .map((group) => group.topicId)
        .filter((topicId): topicId is string => Boolean(topicId))
    )
  ];
  const topicWeightMap = new Map<string, number>();

  if (topicIds.length === 0) {
    return topicWeightMap;
  }

  const { data, error } = await supabase
    .from("topics")
    .select("id,weight_percent")
    .in("id", topicIds);

  if (error) {
    throw new Error(`[retest] topic weights lookup failed: ${error.message}`);
  }

  for (const row of (data ?? []) as TopicRow[]) {
    const weight = toNumber(row.weight_percent);

    if (Number.isFinite(weight)) {
      topicWeightMap.set(row.id, weight);
    }
  }

  return topicWeightMap;
}

async function updatePriorityIfHigher(
  supabase: SupabaseClient,
  activeRow: ActiveRetestRow,
  priority: number,
  nowMs: number
) {
  const existingPriority = toNumber(activeRow.priority);

  if (priority <= existingPriority) {
    return;
  }

  const { error } = await supabase
    .from("retest_queue")
    .update({
      priority,
      updated_at: new Date(nowMs).toISOString()
    })
    .eq("id", activeRow.id);

  if (error) {
    throw new Error(`[retest] retest_queue priority update failed: ${error.message}`);
  }
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
