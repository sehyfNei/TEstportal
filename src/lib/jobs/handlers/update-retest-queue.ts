import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeInitialScheduleFsrs,
  computeRetestScheduleFsrs,
  toFsrsSchedulerState,
  type FsrsScheduleResult
} from "@/lib/adaptive/fsrs-scheduler";
import { computeInitialSchedule, type ScheduleResult } from "@/lib/adaptive/simple-scheduler";
import { isFeatureEnabled } from "@/lib/flags";

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
  const useFsrs = await isFeatureEnabled(supabase, "fsrs");
  const nowMs = Date.now();

  for (const group of groups.values()) {
    const topicWeight = group.topicId ? (topicWeightMap.get(group.topicId) ?? null) : null;
    const activeRow = await findActiveRetestRow(
      supabase,
      resultRow.user_id,
      resultRow.exam_id,
      group.conceptId,
      group.topicId
    );

    if (activeRow) {
      // Priority bumps always use the initial (mistake-severity) priority so
      // the two schedulers rank the shared queue consistently.
      const { priority } = chooseInsertSchedule({
        useFsrs,
        priorState: null,
        mistakeTypes: group.mistakeTypes,
        topicWeightPercent: topicWeight,
        nowMs
      });
      await updatePriorityIfHigher(supabase, activeRow, priority, nowMs);
      continue;
    }

    const priorState = useFsrs ? await findPriorSchedulerState(supabase, resultRow, group) : null;
    const schedule = chooseInsertSchedule({
      useFsrs,
      priorState,
      mistakeTypes: group.mistakeTypes,
      topicWeightPercent: topicWeight,
      nowMs
    });

    const { error: insertError } = await supabase.from("retest_queue").insert({
      user_id: resultRow.user_id,
      exam_id: resultRow.exam_id,
      concept_id: group.conceptId,
      topic_id: group.topicId,
      due_at: schedule.dueAt.toISOString(),
      scheduler: schedule.scheduler,
      scheduler_state: schedule.schedulerState,
      priority: schedule.priority,
      status: "due"
    });

    if (insertError) {
      throw new Error(`[retest] retest_queue insert failed: ${insertError.message}`);
    }
  }
}

export type InsertScheduleInput = {
  useFsrs: boolean;
  /** scheduler_state of the group's most recent prior queue row, if any. */
  priorState: unknown;
  mistakeTypes: string[];
  topicWeightPercent: number | null;
  nowMs: number;
};

export type InsertSchedule =
  | ({ scheduler: "simple" } & ScheduleResult)
  | ({ scheduler: "fsrs" } & FsrsScheduleResult);

/**
 * Pick the schedule for a new retest_queue row. With the `fsrs` flag off this
 * is exactly the legacy simple-scheduler behavior. With it on, a group that
 * resurfaces with fresh mistakes is treated as a failed recall of its prior
 * state (seeded from defaults when the prior row was simple-scheduled), so
 * intervals carry memory across attempts instead of resetting to day 1.
 */
export function chooseInsertSchedule(input: InsertScheduleInput): InsertSchedule {
  const scheduleInput = {
    mistakeTypes: input.mistakeTypes,
    topicWeightPercent: input.topicWeightPercent
  };

  if (!input.useFsrs) {
    return { scheduler: "simple", ...computeInitialSchedule(scheduleInput, input.nowMs) };
  }

  if (input.priorState) {
    return {
      scheduler: "fsrs",
      ...computeRetestScheduleFsrs(
        "fail",
        toFsrsSchedulerState(input.priorState),
        input.topicWeightPercent,
        input.nowMs
      )
    };
  }

  return { scheduler: "fsrs", ...computeInitialScheduleFsrs(scheduleInput, input.nowMs) };
}

async function findPriorSchedulerState(
  supabase: SupabaseClient,
  resultRow: ResultRow,
  group: RetestGroup
): Promise<unknown> {
  if (!group.conceptId && !group.topicId) {
    return null;
  }

  const base = supabase
    .from("retest_queue")
    .select("scheduler_state")
    .eq("user_id", resultRow.user_id)
    .eq("exam_id", resultRow.exam_id);
  const filtered = group.conceptId
    ? base.eq("concept_id", group.conceptId).is("topic_id", null)
    : base.eq("topic_id", group.topicId as string).is("concept_id", null);

  const { data, error } = await filtered.order("updated_at", { ascending: false }).limit(1);

  if (error) {
    throw new Error(`[retest] prior scheduler state lookup failed: ${error.message}`);
  }

  return ((data ?? []) as { scheduler_state?: unknown }[])[0]?.scheduler_state ?? null;
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
