"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForAction } from "@/lib/auth/require-admin";
import { callAi } from "@/lib/ai/gateway";
import { embedTexts } from "@/lib/ai/hf-embeddings";
import {
  buildGenerationMessages,
  generationRequestSchema,
  validateGenerationOutput,
  GENERATION_PROMPT_VERSION,
  GENERATION_SCHEMA_VERSION,
  type GeneratedQuestion
} from "@/lib/ai/schemas/question-generation";
import {
  canonicalizeQuestionText,
  toDuplicateMatches,
  toVectorLiteral,
  DUPLICATE_WARN_THRESHOLD
} from "@/lib/question-bank/duplicate-check";
import {
  formatGateNote,
  runQualityGates,
  type QualityGateResult
} from "@/lib/question-bank/generation-quality-gates";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GeneratedCandidate = {
  question: GeneratedQuestion;
  gate: QualityGateResult;
};

export type GenerateQuestionsResult = {
  ok: boolean;
  message: string;
  candidates: GeneratedCandidate[];
};

export type GenerationRequestInput = {
  examId: string;
  examName: string;
  topicId: string;
  topicName: string;
  conceptName: string | null;
  difficulty: "easy" | "medium" | "hard";
  count: number;
};

export async function generateQuestionsAction(
  input: GenerationRequestInput
): Promise<GenerateQuestionsResult> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured.", candidates: [] };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message, candidates: [] };
  }

  if (!isUuid(input.examId) || !isUuid(input.topicId)) {
    return { ok: false, message: "Valid exam and topic are required.", candidates: [] };
  }

  const parsedRequest = generationRequestSchema.safeParse({
    examName: input.examName,
    topicName: input.topicName,
    conceptName: input.conceptName,
    difficulty: input.difficulty,
    count: input.count
  });

  if (!parsedRequest.success) {
    return {
      ok: false,
      message: parsedRequest.error.issues[0]?.message ?? "Invalid generation request.",
      candidates: []
    };
  }

  const aiResult = await callAi({
    feature: "question_generation",
    messages: buildGenerationMessages(parsedRequest.data),
    promptVersion: GENERATION_PROMPT_VERSION,
    outputSchemaVersion: GENERATION_SCHEMA_VERSION,
    jsonMode: true,
    relatedEntityType: "question_generation",
    relatedEntityId: input.topicId
  });

  if (!aiResult.ok) {
    return {
      ok: false,
      message:
        aiResult.error === "ai_disabled"
          ? "Question generation is not configured (GROQ_API_KEY missing)."
          : "Question generation failed. You can try again.",
      candidates: []
    };
  }

  let rawOutput: unknown;
  try {
    rawOutput = JSON.parse(aiResult.content);
  } catch {
    return { ok: false, message: "AI returned invalid JSON.", candidates: [] };
  }

  const validated = validateGenerationOutput(rawOutput);
  if (!validated.ok) {
    return {
      ok: false,
      message: `AI output did not match the expected schema: ${validated.errors[0]}`,
      candidates: []
    };
  }

  const questions = validated.data.questions;
  const supabase = await createClient();
  const embedded = await embedTexts(
    questions.map((q) => canonicalizeQuestionText({ text: q.stem, options: q.options }))
  );

  const candidates: GeneratedCandidate[] = [];
  for (let i = 0; i < questions.length; i += 1) {
    const vector = embedded.ok ? embedded.vectors[i] : undefined;
    const matches = vector
      ? toDuplicateMatches(
          (
            await supabase.rpc("find_similar_questions", {
              p_exam_id: input.examId,
              p_embedding: toVectorLiteral(vector),
              p_min_similarity: DUPLICATE_WARN_THRESHOLD,
              p_limit: 3
            })
          ).data
        )
      : [];

    candidates.push({ question: questions[i], gate: runQualityGates(questions[i], matches) });
  }

  return {
    ok: true,
    message: `Generated ${candidates.length} question${candidates.length === 1 ? "" : "s"} for review.`,
    candidates
  };
}

export type SaveGeneratedQuestionState = {
  ok: boolean;
  message: string;
  questionId?: string;
};

export async function saveGeneratedQuestionAction(input: {
  examId: string;
  topicId: string;
  difficulty: "easy" | "medium" | "hard";
  question: GeneratedQuestion;
  gate: QualityGateResult;
}): Promise<SaveGeneratedQuestionState> {
  if (!hasSupabaseConfig()) {
    return { ok: false, message: "Supabase is not configured." };
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return { ok: false, message: admin.message };
  }

  if (!isUuid(input.examId) || !isUuid(input.topicId)) {
    return { ok: false, message: "Valid exam and topic are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_admin_question", {
    p_exam_id: input.examId,
    p_topic_id: input.topicId,
    p_subtopic_id: null,
    p_type: "mcq",
    p_difficulty: input.difficulty,
    p_source: "ai_generated",
    p_source_year: null,
    p_source_reference: null,
    p_is_contested: false,
    p_language: "en",
    p_status: "draft",
    p_exposure_policy: "practice",
    p_quality_tier: "bronze",
    p_content: {
      text: input.question.stem,
      options: input.question.options,
      correct_options: [input.question.correctOptionIndex]
    },
    p_explanation: input.question.explanation,
    p_explanation_detail: null,
    p_reviewer_notes: formatGateNote(input.gate)
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/questions/review");
  const record = data as Record<string, unknown> | null;
  return {
    ok: true,
    message: "Saved as a draft question — find it in the review queue.",
    questionId: typeof record?.question_id === "string" ? record.question_id : undefined
  };
}

export type ConceptOption = { id: string; name: string };

export async function fetchGenerationConceptsAction(topicId: string): Promise<ConceptOption[]> {
  if (!hasSupabaseConfig() || !isUuid(topicId)) {
    return [];
  }

  const admin = await requireAdminForAction();
  if (!admin.ok) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concepts")
    .select("id,name")
    .eq("topic_id", topicId)
    .order("name");

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return { id: String(record.id), name: String(record.name) };
  });
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
