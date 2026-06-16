"use server";

import { requireAdminForAction } from "@/lib/auth/require-admin";
import {
  type BulkQuestionImportError,
  type BulkQuestionImportFormat,
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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
