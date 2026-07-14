"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { callAi } from "@/lib/ai/gateway";
import {
  buildEnrichmentMessages,
  ENRICHMENT_PROMPT_VERSION,
  ENRICHMENT_SCHEMA_VERSION,
  enrichmentInputSchema,
  validateEnrichmentOutput
} from "@/lib/ai/schemas/question-enrichment";
import {
  type BackfillCandidate,
  loadExplanationBackfillCandidates
} from "@/lib/question-bank/explanation-backfill";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const BATCH_SIZE = 10;

export type BackfillRowResult = {
  questionId: string;
  stem: string;
  status: "updated" | "failed" | "skipped";
  detail: string;
};

export type BackfillActionState = {
  ok: boolean;
  message: string;
  updated: number;
  remaining: number;
  results: BackfillRowResult[];
};

export async function backfillExplanationsAction(
  _previousState: BackfillActionState,
  _formData: FormData
): Promise<BackfillActionState> {
  if (!hasSupabaseConfig()) {
    return failure("Supabase is not configured yet.");
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return failure(adminCheck.message);
  }

  const supabase = await createClient();
  const { candidates, error } = await loadExplanationBackfillCandidates(supabase);

  if (error) {
    return failure(`Could not load questions: ${error}`);
  }

  if (!candidates.length) {
    return {
      ok: true,
      message: "All questions already have explanations. Nothing to do.",
      updated: 0,
      remaining: 0,
      results: []
    };
  }

  const batch = candidates.slice(0, BATCH_SIZE);
  const inputResult = enrichmentInputSchema.safeParse({
    questions: batch.map((candidate, index) => ({
      rowIndex: index,
      stem: candidate.stem,
      options: candidate.options,
      correctOptionIndex: candidate.correctOptionIndex,
      currentDifficulty: toDifficulty(candidate.difficulty),
      hasExplanation: false
    }))
  });

  if (!inputResult.success) {
    return failure("Could not build the AI request from the question data.");
  }

  const aiResult = await callAi({
    feature: "question_enrichment",
    messages: buildEnrichmentMessages(inputResult.data),
    promptVersion: ENRICHMENT_PROMPT_VERSION,
    outputSchemaVersion: ENRICHMENT_SCHEMA_VERSION,
    jsonMode: true,
    relatedEntityType: "explanation_backfill"
  });

  if (!aiResult.ok) {
    return failure(
      aiResult.error === "ai_disabled"
        ? "AI is not configured (GROQ_API_KEY missing)."
        : "The AI call failed. Try again in a minute."
    );
  }

  let rawOutput: unknown;

  try {
    rawOutput = JSON.parse(aiResult.content);
  } catch {
    return failure("The AI returned invalid JSON. Try again.");
  }

  const outputResult = validateEnrichmentOutput(rawOutput);

  if (!outputResult.ok) {
    return failure(`The AI response did not match the expected shape: ${outputResult.errors[0]}`);
  }

  const suggestionByRow = new Map(
    outputResult.data.questions.map((question) => [question.rowIndex, question])
  );
  const results: BackfillRowResult[] = [];
  let updated = 0;

  for (const [index, candidate] of batch.entries()) {
    const suggestion = suggestionByRow.get(index);

    if (!suggestion?.suggestedExplanation) {
      results.push(rowResult(candidate, "skipped", "The AI returned no explanation for this question."));
      continue;
    }

    const { error: updateError } = await supabase.rpc("update_admin_question", {
      p_question_id: candidate.questionId,
      p_exam_id: candidate.examId,
      p_topic_id: candidate.topicId,
      p_subtopic_id: candidate.subtopicId,
      p_type: candidate.type,
      p_difficulty: candidate.difficulty,
      p_source: candidate.source,
      p_source_year: candidate.sourceYear,
      p_source_reference: candidate.sourceReference,
      p_is_contested: candidate.isContested,
      p_language: candidate.language,
      p_status: candidate.status,
      p_exposure_policy: candidate.exposurePolicy,
      p_quality_tier: candidate.qualityTier,
      p_content: candidate.content,
      p_explanation: suggestion.suggestedExplanation,
      p_explanation_detail: null,
      p_reviewer_notes: "AI explanation backfill."
    });

    if (updateError) {
      results.push(rowResult(candidate, "failed", updateError.message));
      continue;
    }

    updated += 1;
    results.push(rowResult(candidate, "updated", suggestion.suggestedExplanation));
  }

  revalidatePath("/admin/questions/backfill");

  const remaining = candidates.length - updated;

  return {
    ok: true,
    message: `Generated explanations for ${updated} of ${batch.length} question${
      batch.length === 1 ? "" : "s"
    }. ${remaining} still missing.`,
    updated,
    remaining,
    results
  };
}

function toDifficulty(value: string): "easy" | "medium" | "hard" {
  return value === "easy" || value === "hard" ? value : "medium";
}

function rowResult(
  candidate: BackfillCandidate,
  status: BackfillRowResult["status"],
  detail: string
): BackfillRowResult {
  return {
    questionId: candidate.questionId,
    stem: candidate.stem.length > 100 ? `${candidate.stem.slice(0, 100)}...` : candidate.stem,
    status,
    detail
  };
}

function failure(message: string): BackfillActionState {
  return { ok: false, message, updated: 0, remaining: -1, results: [] };
}
