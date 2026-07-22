import type { SupabaseClient } from "@supabase/supabase-js";
import { callAi } from "@/lib/ai/gateway";
import {
  LEARNING_PATH_PROMPT_VERSION,
  LEARNING_PATH_SCHEMA_VERSION,
  buildLearningPathMessages,
  validateLearningPathOutput,
  type LearningPathInput
} from "@/lib/ai/schemas/learning-path";
import { buildWeakTopics, type WeakTopic } from "@/lib/dashboard/overview";

// Cap plan length regardless of how far out target_date is — a 3-year plan
// would blow up prompt size and produce a meaningless week-by-week grid.
export const MAX_LEARNING_PATH_WEEKS = 26;

export type LearningPathSource = {
  pathId: string;
  userId: string;
  examId: string;
  examName: string;
  goal: string;
  targetDate: string;
  status: string;
  weakTopics: WeakTopic[];
};

export type LearningPathMilestoneWrite = {
  topicId: string;
  weekNumber: number;
  targetMastery: number;
};

export type LearningPathJobStore = {
  loadSource(pathId: string): Promise<LearningPathSource | null>;
  upsertMilestones(pathId: string, milestones: LearningPathMilestoneWrite[]): Promise<void>;
};

export type GenerateLearningPathDeps = {
  callAiFn?: typeof callAi;
  store?: LearningPathJobStore;
  now?: () => Date;
};

type PathRow = {
  user_id: string;
  exam_id: string;
  goal: string;
  target_date: string;
  status: string;
};

type ExamRow = {
  name: string | null;
};

type TopicRow = {
  id: string;
  name: string;
  weight_percent: number | string | null;
};

type MasteryRow = {
  topic_id: string | null;
  mastery_score: number | string | null;
};

export async function generateLearningPathJob(
  pathId: string,
  supabase: SupabaseClient,
  deps: GenerateLearningPathDeps = {}
): Promise<void> {
  const callAiFn = deps.callAiFn ?? callAi;
  const store = deps.store ?? createSupabaseLearningPathStore(supabase);
  const now = deps.now ?? (() => new Date());

  const source = await store.loadSource(pathId);
  if (!source) {
    throw new Error("learning_path_not_found");
  }

  // The path may have been completed/abandoned between enqueue and this run
  // — nothing to generate for a plan the student is no longer pursuing.
  if (source.status !== "active") {
    return;
  }

  if (source.weakTopics.length === 0) {
    throw new Error("no_weak_topics");
  }

  const totalWeeks = computeTotalWeeks(source.targetDate, now());
  const input: LearningPathInput = {
    examName: source.examName,
    goal: source.goal,
    totalWeeks,
    weakTopics: source.weakTopics.map((topic) => ({
      topicId: topic.topicId,
      topicName: topic.topicName,
      masteryScore: topic.masteryScore,
      weightPercent: topic.weightPercent
    }))
  };

  const aiResult = await callAiSafely(callAiFn, pathId, source.userId, input);
  if (!aiResult.ok) {
    throw new Error(`ai_error:${aiResult.error}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(aiResult.content);
  } catch {
    throw new Error("json_parse_error");
  }

  const validation = validateLearningPathOutput(parsed);
  if (!validation.ok) {
    throw new Error(`validation_failed:${validation.errors.slice(0, 3).join("; ")}`);
  }

  const knownTopicIds = new Set(source.weakTopics.map((topic) => topic.topicId));
  const inRangeMilestones = validation.data.milestones.filter(
    (milestone) => knownTopicIds.has(milestone.topicId) && milestone.weekNumber <= totalWeeks
  );

  const coveredTopicIds = new Set(inRangeMilestones.map((milestone) => milestone.topicId));
  const missingTopics = source.weakTopics.filter((topic) => !coveredTopicIds.has(topic.topicId));
  if (missingTopics.length > 0) {
    throw new Error(
      `incomplete_coverage:${missingTopics.map((topic) => topic.topicName).join(", ")}`
    );
  }

  await store.upsertMilestones(pathId, inRangeMilestones);
}

export function computeTotalWeeks(targetDateIso: string, now: Date): number {
  const targetDate = new Date(targetDateIso);
  if (Number.isNaN(targetDate.getTime())) {
    return 1;
  }

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.ceil((targetDate.getTime() - now.getTime()) / msPerWeek);
  return Math.min(MAX_LEARNING_PATH_WEEKS, Math.max(1, weeks));
}

export function createSupabaseLearningPathStore(supabase: SupabaseClient): LearningPathJobStore {
  return { loadSource, upsertMilestones };

  async function loadSource(pathId: string): Promise<LearningPathSource | null> {
    const { data: path, error: pathError } = await supabase
      .from("learning_paths")
      .select("user_id,exam_id,goal,target_date,status")
      .eq("id", pathId)
      .maybeSingle();

    if (pathError) {
      throw new Error(`Failed to load learning path: ${pathError.message}`);
    }

    if (!path) {
      return null;
    }

    const pathRow = path as PathRow;

    const [examResult, weakTopics] = await Promise.all([
      supabase.from("exams").select("name").eq("id", pathRow.exam_id).maybeSingle(),
      loadWeakTopics(supabase, pathRow.user_id, pathRow.exam_id)
    ]);

    if (examResult.error) {
      throw new Error(`Failed to load exam for learning path: ${examResult.error.message}`);
    }

    return {
      pathId,
      userId: pathRow.user_id,
      examId: pathRow.exam_id,
      examName: ((examResult.data as ExamRow | null)?.name ?? "Exam").trim() || "Exam",
      goal: pathRow.goal,
      targetDate: pathRow.target_date,
      status: pathRow.status,
      weakTopics
    };
  }

  async function upsertMilestones(pathId: string, milestones: LearningPathMilestoneWrite[]): Promise<void> {
    const { error } = await supabase
      .from("path_milestones")
      .upsert(
        milestones.map((milestone) => ({
          path_id: pathId,
          topic_id: milestone.topicId,
          week_number: milestone.weekNumber,
          target_mastery: milestone.targetMastery
        })),
        { onConflict: "path_id,topic_id,week_number" }
      );

    if (error) {
      throw new Error(`Failed to upsert path milestones: ${error.message}`);
    }
  }
}

async function loadWeakTopics(
  supabase: SupabaseClient,
  userId: string,
  examId: string
): Promise<WeakTopic[]> {
  const [topicResult, masteryResult] = await Promise.all([
    supabase
      .from("topics")
      .select("id,name,weight_percent")
      .eq("exam_id", examId)
      .not("weight_percent", "is", null),
    supabase
      .from("mastery_records")
      .select("topic_id,mastery_score")
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .not("topic_id", "is", null)
  ]);

  if (topicResult.error) {
    throw new Error(`Failed to load topics for learning path: ${topicResult.error.message}`);
  }

  if (masteryResult.error) {
    throw new Error(`Failed to load mastery for learning path: ${masteryResult.error.message}`);
  }

  const masteryByTopicId = new Map<string, number>();
  for (const row of (masteryResult.data ?? []) as MasteryRow[]) {
    if (row.topic_id) {
      masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
    }
  }

  const topics = (topicResult.data ?? []) as TopicRow[];
  return buildWeakTopics(topics, masteryByTopicId);
}

async function callAiSafely(
  callAiFn: typeof callAi,
  pathId: string,
  userId: string,
  input: LearningPathInput
): ReturnType<typeof callAi> {
  try {
    return await callAiFn({
      feature: "learning_path_generation",
      messages: buildLearningPathMessages(input),
      promptVersion: LEARNING_PATH_PROMPT_VERSION,
      outputSchemaVersion: LEARNING_PATH_SCHEMA_VERSION,
      userId,
      jsonMode: true,
      relatedEntityType: "learning_path",
      relatedEntityId: pathId
    });
  } catch (error) {
    console.error("[learning_path] AI call threw for path", pathId, error);

    return {
      ok: false,
      error: "network_error",
      status: "failed",
      latencyMs: 0
    };
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
