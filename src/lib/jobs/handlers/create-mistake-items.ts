import type { SupabaseClient } from "@supabase/supabase-js";

export type MistakeType =
  | "conceptual_gap"
  | "overconfidence"
  | "not_attempted"
  | "lucky_guess"
  | "bookmarked";

export type AnswerConfidence = "sure" | "unsure" | "guessed";

export type MistakeClassificationInput = {
  isCorrect: boolean | null;
  confidence: AnswerConfidence | null;
  markedReview: boolean;
};

export type MistakeItemInsert = {
  user_id: string;
  exam_id: string;
  question_id: string;
  session_id: string;
  topic_id: string | null;
  concept_id: string | null;
  mistake_type: MistakeType;
  confidence: AnswerConfidence | null;
  status: "unresolved";
};

type ResultRow = {
  session_id: string;
  user_id: string;
  exam_id: string;
};

type AnswerRow = {
  question_id: string;
  is_correct: boolean | null;
  confidence: string | null;
  marked_review: boolean | null;
};

type QuestionRow = {
  id: string;
  topic_id: string | null;
};

type ConceptRow = {
  question_id: string;
  concept_id: string;
  relevance: number | string | null;
};

export function classifyMistake(answer: MistakeClassificationInput): MistakeType | null {
  if (answer.isCorrect === false && answer.confidence === "sure") {
    return "overconfidence";
  }

  if (answer.isCorrect === false) {
    return "conceptual_gap";
  }

  if (answer.isCorrect === null) {
    return "not_attempted";
  }

  if (answer.isCorrect === true && answer.confidence === "guessed") {
    return "lucky_guess";
  }

  if (answer.isCorrect === true && answer.markedReview) {
    return "bookmarked";
  }

  return null;
}

export async function createMistakeItemsJob(
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
      `[mistake] session_results lookup failed for ${resultId}: ${resultError?.message ?? "not found"}`
    );
  }

  const resultRow = result as ResultRow;
  const { data: answers, error: answersError } = await supabase
    .from("session_answers")
    .select("question_id,is_correct,confidence,marked_review")
    .eq("session_id", resultRow.session_id)
    .eq("user_id", resultRow.user_id);

  if (answersError) {
    throw new Error(`[mistake] session_answers lookup failed: ${answersError.message}`);
  }

  const answerRows = (answers ?? []) as AnswerRow[];
  if (answerRows.length === 0) {
    return;
  }

  const questionIds = answerRows.map((answer) => answer.question_id);
  const topicByQuestion = await loadQuestionTopics(supabase, questionIds);
  const primaryConceptByQuestion = await loadPrimaryConcepts(supabase, questionIds);
  const insertRows = buildMistakeRows(
    resultRow,
    answerRows,
    topicByQuestion,
    primaryConceptByQuestion
  );

  if (insertRows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("mistake_items").upsert(insertRows, {
    onConflict: "user_id,session_id,question_id",
    ignoreDuplicates: true
  });

  if (insertError) {
    throw new Error(`[mistake] upsert failed: ${insertError.message}`);
  }
}

async function loadQuestionTopics(supabase: SupabaseClient, questionIds: string[]) {
  const { data, error } = await supabase
    .from("questions")
    .select("id,topic_id")
    .in("id", questionIds);

  if (error) {
    throw new Error(`[mistake] questions lookup failed: ${error.message}`);
  }

  const topicByQuestion = new Map<string, string | null>();
  for (const row of (data ?? []) as QuestionRow[]) {
    topicByQuestion.set(row.id, row.topic_id);
  }

  return topicByQuestion;
}

async function loadPrimaryConcepts(supabase: SupabaseClient, questionIds: string[]) {
  const { data, error } = await supabase
    .from("question_concepts")
    .select("question_id,concept_id,relevance")
    .in("question_id", questionIds)
    .order("relevance", { ascending: false });

  if (error) {
    throw new Error(`[mistake] question_concepts lookup failed: ${error.message}`);
  }

  const primaryConceptByQuestion = new Map<string, string>();
  for (const row of (data ?? []) as ConceptRow[]) {
    if (!primaryConceptByQuestion.has(row.question_id)) {
      primaryConceptByQuestion.set(row.question_id, row.concept_id);
    }
  }

  return primaryConceptByQuestion;
}

function buildMistakeRows(
  result: ResultRow,
  answers: AnswerRow[],
  topicByQuestion: Map<string, string | null>,
  primaryConceptByQuestion: Map<string, string>
): MistakeItemInsert[] {
  const insertRows: MistakeItemInsert[] = [];

  for (const answer of answers) {
    const confidence = toAnswerConfidence(answer.confidence);
    const mistakeType = classifyMistake({
      isCorrect: answer.is_correct,
      confidence,
      markedReview: answer.marked_review ?? false
    });

    if (!mistakeType) {
      continue;
    }

    insertRows.push({
      user_id: result.user_id,
      exam_id: result.exam_id,
      question_id: answer.question_id,
      session_id: result.session_id,
      topic_id: topicByQuestion.get(answer.question_id) ?? null,
      concept_id: primaryConceptByQuestion.get(answer.question_id) ?? null,
      mistake_type: mistakeType,
      confidence,
      status: "unresolved"
    });
  }

  return insertRows;
}

function toAnswerConfidence(value: string | null): AnswerConfidence | null {
  return value === "sure" || value === "unsure" || value === "guessed" ? value : null;
}
