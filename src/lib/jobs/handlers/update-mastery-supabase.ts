import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExistingMasteryRecord,
  MasteryJobSource,
  MasteryLookupKey,
  MasteryRecordUpsert,
  MasteryUpdateRepository
} from "@/lib/jobs/handlers/update-mastery";
import type {
  AnswerConfidence,
  QuestionDifficulty,
  ScoreBucket,
  SessionAnswerForMastery,
  SessionType
} from "@/lib/scoring/mastery-types";

type SessionResultRow = {
  session_id: string;
  exam_id: string;
  user_id: string;
  topic_scores: unknown;
  concept_scores: unknown;
};

type TestSessionRow = {
  type: string;
};

type SessionAnswerRow = {
  question_id: string;
  is_correct: boolean | null;
  confidence: string | null;
  marks_awarded: number | string | null;
  time_spent_sec: number | null;
  revisit_count: number | null;
};

type SessionQuestionRow = {
  question_id: string;
  questions:
    | {
        topic_id: string | null;
        difficulty: string | null;
      }
    | {
        topic_id: string | null;
        difficulty: string | null;
      }[]
    | null;
};

type QuestionConceptRow = {
  question_id: string;
  concept_id: string;
};

type MasteryRecordRow = {
  id: string;
  mastery_score: number | string;
  questions_attempted: number;
  questions_correct: number;
  stability_factor: number | string;
};

export function createSupabaseMasteryRepository(supabase: SupabaseClient): MasteryUpdateRepository {
  return {
    loadMasterySource,
    findMasteryRecord,
    upsertMasteryRecord
  };

  async function loadMasterySource(resultId: string): Promise<MasteryJobSource | null> {
    const { data: result, error: resultError } = await supabase
      .from("session_results")
      .select("session_id,exam_id,user_id,topic_scores,concept_scores")
      .eq("id", resultId)
      .maybeSingle();

    if (resultError) {
      throw new Error(`Failed to load session result for mastery update: ${resultError.message}`);
    }

    if (!result) {
      return null;
    }

    const resultRow = result as SessionResultRow;
    const { data: session, error: sessionError } = await supabase
      .from("test_sessions")
      .select("type")
      .eq("id", resultRow.session_id)
      .maybeSingle();

    if (sessionError) {
      throw new Error(`Failed to load test session for mastery update: ${sessionError.message}`);
    }

    if (!session) {
      return null;
    }

    const { data: answers, error: answersError } = await supabase
      .from("session_answers")
      .select("question_id,is_correct,confidence,marks_awarded,time_spent_sec,revisit_count")
      .eq("session_id", resultRow.session_id);

    if (answersError) {
      throw new Error(`Failed to load session answers for mastery update: ${answersError.message}`);
    }

    const { data: sessionQuestions, error: sessionQuestionsError } = await supabase
      .from("session_questions")
      .select("question_id,questions(topic_id,difficulty)")
      .eq("session_id", resultRow.session_id);

    if (sessionQuestionsError) {
      throw new Error(`Failed to load session questions for mastery update: ${sessionQuestionsError.message}`);
    }

    const questionTopics = new Map<string, string>();
    const questionDifficulties = new Map<string, QuestionDifficulty>();
    const questionIds: string[] = [];

    for (const row of (sessionQuestions ?? []) as SessionQuestionRow[]) {
      questionIds.push(row.question_id);
      const question = firstJoinedQuestion(row.questions);

      if (question?.topic_id) {
        questionTopics.set(row.question_id, question.topic_id);
      }

      const difficulty = toQuestionDifficulty(question?.difficulty);
      if (difficulty) {
        questionDifficulties.set(row.question_id, difficulty);
      }
    }

    const questionConcepts = new Map<string, string[]>();

    if (questionIds.length > 0) {
      const { data: concepts, error: conceptsError } = await supabase
        .from("question_concepts")
        .select("question_id,concept_id")
        .in("question_id", questionIds);

      if (conceptsError) {
        throw new Error(`Failed to load question concepts for mastery update: ${conceptsError.message}`);
      }

      for (const row of (concepts ?? []) as QuestionConceptRow[]) {
        const conceptIds = questionConcepts.get(row.question_id);

        if (conceptIds) {
          conceptIds.push(row.concept_id);
        } else {
          questionConcepts.set(row.question_id, [row.concept_id]);
        }
      }
    }

    return {
      resultId,
      userId: resultRow.user_id,
      examId: resultRow.exam_id,
      sessionId: resultRow.session_id,
      sessionType: toSessionType((session as TestSessionRow).type),
      topicScores: toScoreBuckets(resultRow.topic_scores),
      conceptScores: toNullableScoreBuckets(resultRow.concept_scores),
      sessionAnswers: ((answers ?? []) as SessionAnswerRow[]).map(toSessionAnswer),
      questionDifficulties,
      questionTopics,
      questionConcepts,
      testedAt: new Date()
    };
  }

  async function findMasteryRecord(key: MasteryLookupKey): Promise<ExistingMasteryRecord | null> {
    let query = supabase
      .from("mastery_records")
      .select("id,mastery_score,questions_attempted,questions_correct,stability_factor")
      .eq("user_id", key.userId)
      .eq("exam_id", key.examId);

    query = key.topicId ? query.eq("topic_id", key.topicId) : query.is("topic_id", null);
    query = key.conceptId ? query.eq("concept_id", key.conceptId) : query.is("concept_id", null);

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      throw new Error(`Failed to load mastery record: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const row = data as MasteryRecordRow;

    return {
      id: row.id,
      masteryScore: row.mastery_score,
      questionsAttempted: row.questions_attempted,
      questionsCorrect: row.questions_correct,
      stabilityFactor: row.stability_factor
    };
  }

  async function upsertMasteryRecord(record: MasteryRecordUpsert): Promise<void> {
    if (!record.topicId && !record.conceptId) {
      throw new Error("Mastery upsert requires either a topicId or a conceptId.");
    }

    const { error } = await supabase.from("mastery_records").upsert(
      {
        id: record.id,
        user_id: record.userId,
        exam_id: record.examId,
        topic_id: record.topicId ?? null,
        concept_id: record.conceptId ?? null,
        mastery_score: record.masteryScore,
        confidence_level: record.confidenceLevel,
        baseline_score: record.baselineScore,
        stability_factor: record.stabilityFactor,
        questions_attempted: record.questionsAttempted,
        questions_correct: record.questionsCorrect,
        last_tested_at: record.lastTestedAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
      },
      {
        onConflict: record.topicId ? "user_id,exam_id,topic_id" : "user_id,exam_id,concept_id"
      }
    );

    if (error) {
      throw new Error(`Failed to upsert mastery record: ${error.message}`);
    }
  }
}

function firstJoinedQuestion(value: SessionQuestionRow["questions"]) {
  return Array.isArray(value) ? value[0] : value;
}

function toSessionAnswer(row: SessionAnswerRow): SessionAnswerForMastery {
  return {
    questionId: row.question_id,
    isCorrect: row.is_correct,
    confidence: toAnswerConfidence(row.confidence),
    marksAwarded: toNumber(row.marks_awarded),
    timeSpentSec: Math.max(0, row.time_spent_sec ?? 0),
    revisitCount: Math.max(0, row.revisit_count ?? 0)
  };
}

function toScoreBuckets(value: unknown): Record<string, ScoreBucket> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, ScoreBucket>)
    : {};
}

function toNullableScoreBuckets(value: unknown): Record<string, ScoreBucket> | null {
  return value === null || value === undefined ? null : toScoreBuckets(value);
}

function toSessionType(value: string): SessionType {
  return value === "diagnostic" ||
    value === "topic" ||
    value === "concept_retest" ||
    value === "sectional" ||
    value === "mock" ||
    value === "benchmark" ||
    value === "custom"
    ? value
    : "custom";
}

function toQuestionDifficulty(value: string | null | undefined): QuestionDifficulty | null {
  return value === "easy" || value === "medium" || value === "hard" ? value : null;
}

function toAnswerConfidence(value: string | null): AnswerConfidence | null {
  return value === "sure" || value === "unsure" || value === "guessed" ? value : null;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
