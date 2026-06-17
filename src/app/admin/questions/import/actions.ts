"use server";

import { requireAdminForAction } from "@/lib/auth/require-admin";
import { callAi } from "@/lib/ai/gateway";
import {
  buildEnrichmentMessages,
  ENRICHMENT_PROMPT_VERSION,
  ENRICHMENT_SCHEMA_VERSION,
  enrichmentInputSchema,
  type EnrichmentQuestionOutput,
  validateEnrichmentOutput
} from "@/lib/ai/schemas/question-enrichment";
import {
  type BulkQuestionImportError,
  type BulkQuestionImportFormat,
  type BulkQuestionImportInput,
  parseBulkQuestionImportPayload
} from "@/lib/question-bank/bulk-question-import";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type BulkQuestionImportActionState = {
  ok: boolean;
  message: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  errors: BulkQuestionImportError[];
};

export async function importQuestionsAction(
  _previousState: BulkQuestionImportActionState,
  formData: FormData
): Promise<BulkQuestionImportActionState> {
  const format = formData.get("format") === "csv" ? "csv" : "json";
  const rawPayload = getString(formData, "payload");
  const dryRun = formData.get("dryRun") === "on";
  const plan = parseBulkQuestionImportPayload(rawPayload, format as BulkQuestionImportFormat);
  const totalRows = plan.questions.length + plan.errors.length;

  if (plan.errors.length) {
    return {
      ok: false,
      message: `Found ${plan.errors.length} invalid row${plan.errors.length === 1 ? "" : "s"}.`,
      totalRows,
      validRows: plan.questions.length,
      importedRows: 0,
      errors: plan.errors
    };
  }

  if (!plan.questions.length) {
    return {
      ok: false,
      message: "No importable question rows found.",
      totalRows,
      validRows: 0,
      importedRows: 0,
      errors: []
    };
  }

  if (dryRun) {
    return {
      ok: true,
      message: `${plan.questions.length} row${plan.questions.length === 1 ? "" : "s"} validated. No rows were imported.`,
      totalRows,
      validRows: plan.questions.length,
      importedRows: 0,
      errors: []
    };
  }

  if (!hasSupabaseConfig()) {
    return {
      ok: false,
      message: "Supabase is not configured yet. Validation passed, but import cannot run.",
      totalRows,
      validRows: plan.questions.length,
      importedRows: 0,
      errors: []
    };
  }

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return {
      ok: false,
      message: adminCheck.message,
      totalRows,
      validRows: plan.questions.length,
      importedRows: 0,
      errors: []
    };
  }

  const supabase = await createClient();
  let importedRows = 0;

  for (const [index, question] of plan.questions.entries()) {
    const { error } = await supabase.rpc("create_admin_question", {
      p_exam_id: question.examId,
      p_topic_id: question.topicId,
      p_subtopic_id: question.subtopicId,
      p_type: question.type,
      p_difficulty: question.difficulty,
      p_source: question.source,
      p_source_year: question.sourceYear,
      p_source_reference: question.sourceReference,
      p_is_contested: question.isContested,
      p_language: question.language,
      p_status: question.status,
      p_exposure_policy: question.exposurePolicy,
      p_quality_tier: question.qualityTier,
      p_content: question.content,
      p_explanation: question.explanation,
      p_explanation_detail: question.explanationDetail,
      p_reviewer_notes: question.reviewerNotes
    });

    if (error) {
      return {
        ok: false,
        message: `Import stopped at row ${index + 1}: ${error.message}`,
        totalRows,
        validRows: plan.questions.length,
        importedRows,
        errors: [{ row: index + 1, message: error.message }]
      };
    }

    importedRows += 1;
  }

  return {
    ok: true,
    message: `Imported ${importedRows} question${importedRows === 1 ? "" : "s"}.`,
    totalRows,
    validRows: plan.questions.length,
    importedRows,
    errors: []
  };
}

export type TopicOption = { id: string; name: string };

export async function fetchExamTopicsAction(examId: string): Promise<TopicOption[]> {
  if (!hasSupabaseConfig()) return [];

  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("id,name")
    .eq("exam_id", examId)
    .is("parent_id", null)
    .order("name");

  return data ?? [];
}

export type { EnrichmentQuestionOutput };

export type EnrichQuestionsResult = {
  ok: boolean;
  message: string;
  suggestions: EnrichmentQuestionOutput[];
};

export async function enrichQuestionsAction(
  questions: BulkQuestionImportInput[]
): Promise<EnrichQuestionsResult> {
  const adminCheck = await requireAdminForAction();

  if (!adminCheck.ok) {
    return {
      ok: false,
      message: adminCheck.message,
      suggestions: []
    };
  }

  const limitedQuestions = questions.slice(0, 30);
  const inputResult = enrichmentInputSchema.safeParse({
    questions: limitedQuestions.map((question, index) => ({
      rowIndex: index,
      stem: question.content.text,
      options: question.content.options ?? [],
      correctOptionIndex: question.content.correct_options?.[0] ?? null,
      currentDifficulty: question.difficulty,
      hasExplanation: wordCount(question.explanation ?? "") >= 30
    }))
  });

  if (!inputResult.success) {
    return {
      ok: false,
      message: inputResult.error.issues[0]?.message ?? "Question enrichment input is invalid.",
      suggestions: []
    };
  }

  const aiResult = await callAi({
    feature: "question_enrichment",
    messages: buildEnrichmentMessages(inputResult.data),
    promptVersion: ENRICHMENT_PROMPT_VERSION,
    outputSchemaVersion: ENRICHMENT_SCHEMA_VERSION,
    jsonMode: true,
    relatedEntityType: "bulk_import"
  });

  if (!aiResult.ok) {
    return {
      ok: false,
      message:
        aiResult.error === "ai_disabled"
          ? "AI enrichment is not configured. You can still import without suggestions."
          : "AI enrichment failed. You can still import without suggestions.",
      suggestions: []
    };
  }

  let rawOutput: unknown;

  try {
    rawOutput = JSON.parse(aiResult.content);
  } catch {
    return {
      ok: false,
      message: "AI enrichment returned invalid JSON. You can still import without suggestions.",
      suggestions: []
    };
  }

  const outputResult = validateEnrichmentOutput(rawOutput);

  if (!outputResult.ok) {
    return {
      ok: false,
      message: `AI enrichment output did not match the expected schema: ${outputResult.errors[0]}`,
      suggestions: []
    };
  }

  return {
    ok: true,
    message: `AI enrichment suggested updates for ${outputResult.data.questions.length} row${
      outputResult.data.questions.length === 1 ? "" : "s"
    }.`,
    suggestions: outputResult.data.questions
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
