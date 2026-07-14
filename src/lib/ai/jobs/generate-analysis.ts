import type { SupabaseClient } from "@supabase/supabase-js";
import { callAi } from "@/lib/ai/gateway";
import {
  ANALYSIS_PROMPT_VERSION,
  ANALYSIS_SCHEMA_VERSION,
  buildAnalysisMessages,
  validateAnalysisOutput,
  type AnalysisInput
} from "@/lib/ai/schemas/analysis";
import { extractQuestionContext } from "@/lib/ai/jobs/question-context";

export type AnalysisQuestionSource = {
  questionId: string;
  type: string;
  content: unknown;
  isCorrect: boolean | null;
  selectedAnswer: unknown;
  topicName: string | null;
  conceptName: string | null;
};

export type AnalysisSource = {
  resultId: string;
  userId: string;
  examName: string;
  score: number;
  maxScore: number;
  accuracy: number;
  questions: AnalysisQuestionSource[];
};

export type AnalysisJobFinalStatus = "completed" | "failed" | "disabled";

export type InsertRunningResult = {
  conflict: boolean;
  error: string | null;
};

export type AnalysisJobStore = {
  insertRunningRow(resultId: string, userId: string): Promise<InsertRunningResult>;
  finalizeRow(
    resultId: string,
    status: AnalysisJobFinalStatus,
    output: unknown,
    errorMessage: string | null
  ): Promise<void>;
  loadSource(resultId: string): Promise<AnalysisSource | null>;
};

export type GenerateAnalysisDeps = {
  callAiFn?: typeof callAi;
  store?: AnalysisJobStore;
};

type ResultRow = {
  session_id: string;
  user_id: string;
  exam_id: string;
  score: number | string | null;
  max_score: number | string | null;
  accuracy: number | string | null;
};

type ExamRow = {
  name: string | null;
};

type QuestionJoinRow = {
  type: string | null;
  topic_id: string | null;
  topics: JoinedRow<TopicJoinRow>;
};

type TopicJoinRow = {
  name: string | null;
};

type QuestionVersionJoinRow = {
  content: unknown;
};

type SessionQuestionRow = {
  question_id: string;
  prompt_snapshot: unknown;
  questions: JoinedRow<QuestionJoinRow>;
  question_versions: JoinedRow<QuestionVersionJoinRow>;
};

type AnswerRow = {
  question_id: string;
  is_correct: boolean | null;
  selected_answer: unknown;
};

type QuestionConceptRow = {
  question_id: string;
  concepts: JoinedRow<ConceptJoinRow>;
};

type ConceptJoinRow = {
  name: string | null;
};

type JoinedRow<T> = T | T[] | null;

export async function generateAnalysisJob(
  resultId: string,
  userId: string,
  supabase: SupabaseClient,
  deps: GenerateAnalysisDeps = {}
): Promise<void> {
  const callAiFn = deps.callAiFn ?? callAi;
  const store = deps.store ?? createSupabaseAnalysisStore(supabase);

  const insertResult = await store.insertRunningRow(resultId, userId);
  if (insertResult.conflict) {
    return;
  }

  if (insertResult.error) {
    console.error("[analysis] insert failed for result", resultId, insertResult.error);
    return;
  }

  let source: AnalysisSource | null;
  try {
    source = await store.loadSource(resultId);
  } catch (error) {
    await store.finalizeRow(resultId, "failed", null, `load_failed:${errorText(error)}`);
    return;
  }

  if (!source) {
    await store.finalizeRow(resultId, "failed", null, "result_not_found");
    return;
  }

  if (source.userId !== userId) {
    await store.finalizeRow(resultId, "failed", null, "user_mismatch");
    return;
  }

  const input = buildAnalysisInput(source);
  if (!input) {
    await store.finalizeRow(resultId, "failed", null, "no_questions");
    return;
  }

  const aiResult = await callAiSafely(callAiFn, resultId, userId, input);
  if (!aiResult.ok) {
    const status = aiResult.status === "disabled" ? "disabled" : "failed";
    await store.finalizeRow(resultId, status, null, `ai_error:${aiResult.error}`);
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(aiResult.content);
  } catch {
    await store.finalizeRow(resultId, "failed", null, "json_parse_error");
    return;
  }

  const validation = validateAnalysisOutput(parsed);
  if (!validation.ok) {
    await store.finalizeRow(
      resultId,
      "failed",
      null,
      `validation_failed:${validation.errors.slice(0, 3).join("; ")}`
    );
    return;
  }

  await store.finalizeRow(resultId, "completed", validation.data, null);
}

export function buildAnalysisInput(source: AnalysisSource): AnalysisInput | null {
  if (source.questions.length === 0) {
    return null;
  }

  return {
    examName: source.examName,
    score: source.score,
    maxScore: source.maxScore,
    accuracy: source.accuracy,
    questions: source.questions.map((question) => {
      const context = extractQuestionContext(question.type, question.content, question.selectedAnswer);

      return {
        questionId: question.questionId,
        type: question.type,
        stem: context.stem,
        isCorrect: question.isCorrect,
        selectedLabel: context.selectedLabel,
        correctLabel: context.correctLabel,
        topicName: question.topicName,
        conceptName: question.conceptName
      };
    })
  };
}

export function createSupabaseAnalysisStore(supabase: SupabaseClient): AnalysisJobStore {
  return {
    insertRunningRow,
    finalizeRow,
    loadSource
  };

  async function insertRunningRow(resultId: string, userId: string): Promise<InsertRunningResult> {
    const { error } = await supabase.from("ai_analyses").insert({
      session_result_id: resultId,
      user_id: userId,
      status: "running",
      schema_version: ANALYSIS_SCHEMA_VERSION,
      prompt_version: ANALYSIS_PROMPT_VERSION
    });

    if (error?.code === "23505") {
      return { conflict: true, error: null };
    }

    if (error) {
      return { conflict: false, error: error.message };
    }

    return { conflict: false, error: null };
  }

  async function finalizeRow(
    resultId: string,
    status: AnalysisJobFinalStatus,
    output: unknown,
    errorMessage: string | null
  ): Promise<void> {
    const { error } = await supabase
      .from("ai_analyses")
      .update({
        status,
        output: output ?? null,
        error_message: truncateError(errorMessage),
        updated_at: new Date().toISOString()
      })
      .eq("session_result_id", resultId);

    if (error) {
      throw new Error(`Failed to finalize analysis row: ${error.message}`);
    }
  }

  async function loadSource(resultId: string): Promise<AnalysisSource | null> {
    const { data: result, error: resultError } = await supabase
      .from("session_results")
      .select("session_id,user_id,exam_id,score,max_score,accuracy")
      .eq("id", resultId)
      .maybeSingle();

    if (resultError) {
      throw new Error(`Failed to load session result for analysis: ${resultError.message}`);
    }

    if (!result) {
      return null;
    }

    const resultRow = result as ResultRow;
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("name")
      .eq("id", resultRow.exam_id)
      .maybeSingle();

    if (examError) {
      throw new Error(`Failed to load exam for analysis: ${examError.message}`);
    }

    const { data: sessionQuestions, error: sessionQuestionsError } = await supabase
      .from("session_questions")
      .select(
        // topics must be disambiguated: questions has two FKs into topics
        // (topic_id and subtopic_id) and PostgREST rejects a bare topics()
        // embed ("more than one relationship was found").
        "question_id,sequence,prompt_snapshot,questions(type,topic_id,topics!questions_topic_id_fkey(name)),question_versions(content)"
      )
      .eq("session_id", resultRow.session_id)
      .order("sequence");

    if (sessionQuestionsError) {
      throw new Error(`Failed to load session questions for analysis: ${sessionQuestionsError.message}`);
    }

    const { data: answers, error: answersError } = await supabase
      .from("session_answers")
      .select("question_id,is_correct,selected_answer")
      .eq("session_id", resultRow.session_id);

    if (answersError) {
      throw new Error(`Failed to load session answers for analysis: ${answersError.message}`);
    }

    const answerMap = new Map(
      ((answers ?? []) as AnswerRow[]).map((answer) => [answer.question_id, answer])
    );
    const questionRows = (sessionQuestions ?? []) as SessionQuestionRow[];
    const conceptMap = await loadConceptNames(supabase, questionRows.map((row) => row.question_id));

    return {
      resultId,
      userId: resultRow.user_id,
      examName: ((exam as ExamRow | null)?.name ?? "Exam").trim() || "Exam",
      score: toNumber(resultRow.score),
      maxScore: toNumber(resultRow.max_score),
      accuracy: toNumber(resultRow.accuracy),
      questions: questionRows.map((row) => {
        const question = firstJoined(row.questions);
        const version = firstJoined(row.question_versions);
        const topic = question ? firstJoined(question.topics) : null;
        const answer = answerMap.get(row.question_id);

        return {
          questionId: row.question_id,
          type: stringOf(question?.type) ?? "mcq",
          content: version?.content ?? row.prompt_snapshot ?? null,
          isCorrect: answer?.is_correct ?? null,
          selectedAnswer: answer?.selected_answer ?? null,
          topicName: stringOf(topic?.name),
          conceptName: conceptMap.get(row.question_id) ?? null
        };
      })
    };
  }
}

async function callAiSafely(
  callAiFn: typeof callAi,
  resultId: string,
  userId: string,
  input: AnalysisInput
): ReturnType<typeof callAi> {
  try {
    return await callAiFn({
      feature: "post_test_analysis",
      messages: buildAnalysisMessages(input),
      promptVersion: ANALYSIS_PROMPT_VERSION,
      outputSchemaVersion: ANALYSIS_SCHEMA_VERSION,
      userId,
      jsonMode: true,
      relatedEntityType: "session_result",
      relatedEntityId: resultId
    });
  } catch (error) {
    console.error("[analysis] AI call threw for result", resultId, error);

    return {
      ok: false,
      error: "network_error",
      status: "failed",
      latencyMs: 0
    };
  }
}

async function loadConceptNames(
  supabase: SupabaseClient,
  questionIds: string[]
): Promise<Map<string, string>> {
  const conceptMap = new Map<string, string>();

  if (questionIds.length === 0) {
    return conceptMap;
  }

  const { data, error } = await supabase
    .from("question_concepts")
    .select("question_id,concepts(name)")
    .in("question_id", questionIds)
    .order("relevance", { ascending: false });

  if (error) {
    return conceptMap;
  }

  for (const row of (data ?? []) as QuestionConceptRow[]) {
    if (conceptMap.has(row.question_id)) {
      continue;
    }

    const concept = firstJoined(row.concepts);
    const name = stringOf(concept?.name);
    if (name) {
      conceptMap.set(row.question_id, name);
    }
  }

  return conceptMap;
}

function firstJoined<T>(value: JoinedRow<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
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

function stringOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function truncateError(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.length > 1000 ? value.slice(0, 1000) : value;
}
