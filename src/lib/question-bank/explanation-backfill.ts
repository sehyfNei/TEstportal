import type { SupabaseClient } from "@supabase/supabase-js";

export type BackfillCandidate = {
  questionId: string;
  examId: string;
  topicId: string;
  subtopicId: string | null;
  type: string;
  difficulty: string;
  source: string;
  sourceYear: number | null;
  sourceReference: string | null;
  isContested: boolean;
  language: string;
  status: string;
  exposurePolicy: string;
  qualityTier: string;
  content: Record<string, unknown>;
  stem: string;
  options: string[];
  correctOptionIndex: number | null;
};

type QuestionRow = {
  id: string;
  exam_id: string;
  topic_id: string;
  subtopic_id: string | null;
  type: string;
  difficulty: string;
  source: string;
  source_year: number | null;
  source_reference: string | null;
  is_contested: boolean | null;
  language: string;
  status: string;
  exposure_policy: string | null;
  quality_tier: string | null;
  current_version:
    | { content: unknown; explanation: string | null; explanation_detail: string | null }
    | Array<{ content: unknown; explanation: string | null; explanation_detail: string | null }>
    | null;
};

/**
 * Questions whose CURRENT version has no explanation at all (neither the
 * short nor the detailed field) and enough answer data (options + correct
 * indexes) for the model to explain the right answer. Retired questions and
 * types without option answers (integer, match) are excluded.
 */
export async function loadExplanationBackfillCandidates(
  supabase: SupabaseClient
): Promise<{ candidates: BackfillCandidate[]; error: string | null }> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id,exam_id,topic_id,subtopic_id,type,difficulty,source,source_year,source_reference,is_contested,language,status,exposure_policy,quality_tier,current_version:question_versions!questions_current_version_fk(content,explanation,explanation_detail)"
    )
    .neq("status", "retired")
    .order("created_at", { ascending: true });

  if (error) {
    return { candidates: [], error: error.message };
  }

  const candidates: BackfillCandidate[] = [];

  for (const row of (data ?? []) as QuestionRow[]) {
    const version = Array.isArray(row.current_version)
      ? row.current_version[0] ?? null
      : row.current_version;

    if (!version) continue;
    if (hasText(version.explanation) || hasText(version.explanation_detail)) continue;

    const content =
      version.content && typeof version.content === "object" && !Array.isArray(version.content)
        ? (version.content as Record<string, unknown>)
        : null;

    if (!content) continue;

    const stem = typeof content.text === "string" ? content.text.trim() : "";
    const options = Array.isArray(content.options)
      ? content.options.filter((option): option is string => typeof option === "string")
      : [];
    const correctOptions = Array.isArray(content.correct_options)
      ? content.correct_options.filter(
          (index): index is number => typeof index === "number" && Number.isInteger(index)
        )
      : [];

    if (!stem || options.length < 2 || !correctOptions.length) continue;

    candidates.push({
      questionId: row.id,
      examId: row.exam_id,
      topicId: row.topic_id,
      subtopicId: row.subtopic_id,
      type: row.type,
      difficulty: row.difficulty,
      source: row.source,
      sourceYear: row.source_year,
      sourceReference: row.source_reference,
      isContested: row.is_contested ?? false,
      language: row.language,
      status: row.status,
      exposurePolicy: row.exposure_policy ?? "practice",
      qualityTier: row.quality_tier ?? "bronze",
      content,
      stem,
      options,
      correctOptionIndex: correctOptions[0] ?? null
    });
  }

  return { candidates, error: null };
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
