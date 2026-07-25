"use server";

import { requireAdminForAction } from "@/lib/auth/require-admin";
import { logAdminAction } from "@/lib/audit/log-admin-action";
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
import { embedTexts } from "@/lib/ai/hf-embeddings";
import {
  canonicalizeQuestionText,
  contentHash,
  toDuplicateMatches,
  toVectorLiteral,
  DUPLICATE_WARN_THRESHOLD,
  EMBEDDING_INDEX_BATCH,
  EMBEDDING_MODEL,
  MAX_DUPLICATE_CHECK_ROWS,
  type RowDuplicates
} from "@/lib/question-bank/duplicate-check";
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
  const plan = parseBulkQuestionImportPayload(rawPayload, format as BulkQuestionImportFormat, {
    examId: getString(formData, "defaultExamId") || undefined,
    topicId: getString(formData, "defaultTopicId") || undefined
  });
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

  await logAdminAction(supabase, {
    actorId: adminCheck.userId,
    action: "question_bulk_import",
    entityType: "exam",
    entityId: getString(formData, "defaultExamId") || plan.questions[0]?.examId || null,
    details: { format, importedRows, totalRows }
  });

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

export type DuplicateCheckResult = {
  ok: boolean;
  message: string;
  rows: RowDuplicates[];
  /** Existing questions in this exam that have no embedding yet. */
  unindexedCount: number;
};

export async function checkImportDuplicatesAction(
  questions: BulkQuestionImportInput[],
  examId: string
): Promise<DuplicateCheckResult> {
  const adminCheck = await requireAdminForAction();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message, rows: [], unindexedCount: 0 };
  }

  if (!isUuid(examId)) {
    return { ok: false, message: "Valid exam id is required.", rows: [], unindexedCount: 0 };
  }

  const limited = questions.slice(0, MAX_DUPLICATE_CHECK_ROWS);
  const texts = limited.map((question) => canonicalizeQuestionText(question.content));

  const embedded = await embedTexts(texts);
  if (!embedded.ok) {
    return { ok: false, message: embedded.message, rows: [], unindexedCount: 0 };
  }

  const supabase = await createClient();
  const rows: RowDuplicates[] = [];

  for (let index = 0; index < embedded.vectors.length; index += 1) {
    const { data, error } = await supabase.rpc("find_similar_questions", {
      p_exam_id: examId,
      p_embedding: toVectorLiteral(embedded.vectors[index]),
      p_min_similarity: DUPLICATE_WARN_THRESHOLD,
      p_limit: 3
    });

    if (error) {
      return { ok: false, message: error.message, rows: [], unindexedCount: 0 };
    }

    const matches = toDuplicateMatches(data);
    if (matches.length > 0) {
      rows.push({ rowIndex: index, matches });
    }
  }

  const unindexedCount = await countUnindexedQuestions(supabase, examId);

  return {
    ok: true,
    message: rows.length
      ? `${rows.length} row${rows.length === 1 ? " looks" : "s look"} similar to existing questions.`
      : "No near-duplicates found among indexed questions.",
    rows,
    unindexedCount
  };
}

export type IndexEmbeddingsResult = {
  ok: boolean;
  message: string;
  indexed: number;
  remaining: number;
};

export async function indexQuestionEmbeddingsAction(): Promise<IndexEmbeddingsResult> {
  const adminCheck = await requireAdminForAction();
  if (!adminCheck.ok) {
    return { ok: false, message: adminCheck.message, indexed: 0, remaining: 0 };
  }

  const supabase = await createClient();

  const [questionsResult, embeddingsResult] = await Promise.all([
    supabase
      .from("questions")
      .select("id,current_version:question_versions!questions_current_version_fk(content)")
      .neq("status", "retired")
      .limit(1000),
    supabase.from("question_embeddings").select("question_id,content_hash").limit(1000)
  ]);

  if (questionsResult.error || embeddingsResult.error) {
    return {
      ok: false,
      message: questionsResult.error?.message ?? embeddingsResult.error?.message ?? "Load failed.",
      indexed: 0,
      remaining: 0
    };
  }

  const hashByQuestion = new Map(
    (embeddingsResult.data ?? []).map((row) => {
      const record = row as { question_id: string; content_hash: string };
      return [record.question_id, record.content_hash];
    })
  );

  // Index questions that are missing an embedding or whose text changed.
  const pending = (questionsResult.data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const version = record.current_version as { content?: unknown } | null;
      const content = (version?.content ?? {}) as { text?: unknown; options?: unknown };
      const text = canonicalizeQuestionText(content);
      return { id: String(record.id), text, hash: contentHash(text) };
    })
    .filter((entry) => entry.text.length > 0 && hashByQuestion.get(entry.id) !== entry.hash);

  const batch = pending.slice(0, EMBEDDING_INDEX_BATCH);
  if (batch.length === 0) {
    return { ok: true, message: "All questions are indexed for duplicate detection.", indexed: 0, remaining: 0 };
  }

  const embedded = await embedTexts(batch.map((entry) => entry.text));
  if (!embedded.ok) {
    return { ok: false, message: embedded.message, indexed: 0, remaining: pending.length };
  }

  const { error: upsertError } = await supabase.from("question_embeddings").upsert(
    batch.map((entry, index) => ({
      question_id: entry.id,
      embedding: toVectorLiteral(embedded.vectors[index]),
      model: EMBEDDING_MODEL,
      content_hash: entry.hash,
      updated_at: new Date().toISOString()
    })),
    { onConflict: "question_id" }
  );

  if (upsertError) {
    return { ok: false, message: upsertError.message, indexed: 0, remaining: pending.length };
  }

  const remaining = pending.length - batch.length;
  return {
    ok: true,
    message: `Indexed ${batch.length} question${batch.length === 1 ? "" : "s"}${
      remaining > 0 ? `; ${remaining} to go — click again.` : "; all caught up."
    }`,
    indexed: batch.length,
    remaining
  };
}

async function countUnindexedQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  examId: string
): Promise<number> {
  const [questionsResult, embeddingsResult] = await Promise.all([
    supabase.from("questions").select("id").eq("exam_id", examId).neq("status", "retired").limit(1000),
    supabase.from("question_embeddings").select("question_id").limit(1000)
  ]);

  if (questionsResult.error || embeddingsResult.error) {
    return 0;
  }

  const indexed = new Set(
    (embeddingsResult.data ?? []).map((row) => (row as { question_id: string }).question_id)
  );
  return (questionsResult.data ?? []).filter(
    (row) => !indexed.has((row as { id: string }).id)
  ).length;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
