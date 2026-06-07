import { notFound } from "next/navigation";
import {
  TestRunner,
  type TestResultSummary,
  type TestRunnerQuestion
} from "@/components/test/test-runner";
import {
  normalizeSelectedAnswer,
  type Confidence,
  type QuestionState
} from "@/lib/test-session/answer-shape";
import { toAnalysisView, type AnalysisRow } from "@/lib/ai/analysis-read";
import type { AnalysisView } from "@/lib/ai/analysis-view";
import { toPlanView, type PlanRow } from "@/lib/ai/plan-read";
import type { PlanView } from "@/lib/ai/plan-view";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  duration_minutes: number | null;
  exam_id: string;
  expires_at: string | null;
  id: string;
  status: string;
  type: string;
  user_id: string;
};

type SessionQuestionRow = {
  id: string;
  prompt_snapshot: unknown;
  question_id: string;
  sequence: number;
};

type SessionAnswerRow = {
  confidence: string | null;
  marked_review: boolean | null;
  question_id: string;
  selected_answer: unknown;
};

type SessionResultRow = {
  accuracy: number | string;
  attempted: number;
  correct: number;
  id: string;
  incorrect: number;
  max_score: number | string;
  score: number | string;
  skipped: number;
};

export default async function TestSessionPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const data = await loadTestSessionData(sessionId);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <Header />
        <StatusPanel message="Supabase is not configured yet. Add Supabase URL and anon key before taking tests." />
      </section>
    );
  }

  if (data.loadError) {
    return (
      <section className="grid gap-6">
        <Header />
        <StatusPanel message={data.loadError} />
      </section>
    );
  }

  if (!data.session) {
    notFound();
  }

  return (
    <section className="grid gap-6">
      <Header />
      <TestRunner
        expiresAt={data.session.expires_at}
        initialAnalysis={data.analysis}
        initialPlan={data.plan}
        initialQuestionStates={data.initialQuestionStates}
        initialResult={data.result}
        initialResultId={data.resultId}
        initialStatus={data.session.status}
        isDiagnostic={data.isDiagnostic}
        questions={data.questions}
        serverNow={new Date().toISOString()}
        sessionId={data.session.id}
      />
    </section>
  );
}

function Header() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Timed session</p>
      <h1 className="mt-2 text-3xl font-semibold">Take test</h1>
    </div>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

async function loadTestSessionData(sessionId: string) {
  try {
    return await loadTestSessionDataInner(sessionId);
  } catch (err) {
    console.error("[session-page] unhandled error:", err);
    return {
      configured: true,
      loadError: "An unexpected error occurred. Please try again.",
      session: null,
      questions: [],
      initialQuestionStates: {},
      result: null,
      resultId: null,
      analysis: null,
      plan: null,
      isDiagnostic: false
    };
  }
}

async function loadTestSessionDataInner(sessionId: string) {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      session: null,
      questions: [],
      initialQuestionStates: {},
      result: null,
      resultId: null,
      analysis: null,
      plan: null,
      isDiagnostic: false
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      configured: true,
      loadError: userError?.message ?? "Sign in to take this test.",
      session: null,
      questions: [],
      initialQuestionStates: {},
      result: null,
      resultId: null,
      analysis: null,
      plan: null,
      isDiagnostic: false
    };
  }

  const sessionResult = await supabase
    .from("test_sessions")
    .select("id,user_id,exam_id,type,status,expires_at,duration_minutes")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionResult.error) {
    return {
      configured: true,
      loadError: sessionResult.error.message,
      session: null,
      questions: [],
      initialQuestionStates: {},
      result: null,
      resultId: null,
      analysis: null,
      plan: null,
      isDiagnostic: false
    };
  }

  const session = sessionResult.data as SessionRow | null;

  if (!session || session.user_id !== user.id) {
    return {
      configured: true,
      loadError: null,
      session: null,
      questions: [],
      initialQuestionStates: {},
      result: null,
      resultId: null,
      analysis: null,
      plan: null,
      isDiagnostic: false
    };
  }

  const [questionsResult, answersResult, resultResult] = await Promise.all([
    supabase
      .from("session_questions")
      .select("id,question_id,sequence,prompt_snapshot")
      .eq("session_id", session.id)
      .order("sequence"),
    supabase
      .from("session_answers")
      .select("question_id,selected_answer,confidence,marked_review")
      .eq("session_id", session.id),
    supabase
      .from("session_results")
      .select("id,score,max_score,accuracy,attempted,correct,incorrect,skipped")
      .eq("session_id", session.id)
      .maybeSingle()
  ]);

  const loadError =
    questionsResult.error?.message ?? answersResult.error?.message ?? resultResult.error?.message ?? null;
  const questions = toRunnerQuestions(questionsResult.data);
  const resultRow = (resultResult.data as SessionResultRow | null) ?? null;
  const isDiagnostic = session.type === "diagnostic";
  const analysis = loadError ? null : await loadInitialAnalysis(supabase, resultRow?.id);
  const plan =
    loadError || !isDiagnostic ? null : await loadInitialPlan(supabase, resultRow?.id);

  return {
    configured: true,
    loadError,
    session,
    questions: loadError ? [] : questions,
    initialQuestionStates: loadError ? {} : toInitialQuestionStates(answersResult.data, questions),
    result: loadError ? null : toResultSummary(resultResult.data),
    resultId: loadError ? null : resultRow?.id ?? null,
    analysis,
    plan,
    isDiagnostic
  };
}

async function loadInitialAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resultId: string | undefined
): Promise<AnalysisView | null> {
  if (!resultId) {
    return null;
  }

  const { data, error } = await supabase
    .from("ai_analyses")
    .select("status,output")
    .eq("session_result_id", resultId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return toAnalysisView(data as AnalysisRow | null);
}

async function loadInitialPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  resultId: string | undefined
): Promise<PlanView | null> {
  if (!resultId) {
    return null;
  }

  const { data, error } = await supabase
    .from("improvement_plans")
    .select("status,output")
    .eq("session_result_id", resultId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return toPlanView(data as PlanRow | null);
}

function toRunnerQuestions(rows: unknown): TestRunnerQuestion[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const sessionQuestionId = typeof record.id === "string" ? record.id : "";
      const questionId = typeof record.question_id === "string" ? record.question_id : "";
      const sequence = typeof record.sequence === "number" ? record.sequence : 0;

      return sessionQuestionId && questionId && sequence
        ? {
            sessionQuestionId,
            questionId,
            sequence,
            promptSnapshot: record.prompt_snapshot
          }
        : null;
    })
    .filter((row): row is TestRunnerQuestion => Boolean(row));
}

function toInitialQuestionStates(rows: unknown, questions: TestRunnerQuestion[]) {
  const questionTypes = new Map(
    questions.map((question) => [question.questionId, getPromptType(question.promptSnapshot)])
  );
  const states: Record<string, QuestionState> = {};

  if (!Array.isArray(rows)) {
    return states;
  }

  for (const row of rows as SessionAnswerRow[]) {
    const type = questionTypes.get(row.question_id) ?? "unknown";
    states[row.question_id] = {
      answer: normalizeSelectedAnswer(type, row.selected_answer),
      confidence: normalizeConfidence(row.confidence),
      markedReview: row.marked_review === true
    };
  }

  return states;
}

function normalizeConfidence(value: string | null): Confidence | null {
  return value === "sure" || value === "unsure" || value === "guessed" ? value : null;
}

function toResultSummary(row: unknown): TestResultSummary | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const record = row as SessionResultRow;

  return {
    accuracy: numericValue(record.accuracy),
    attempted: numericValue(record.attempted),
    correct: numericValue(record.correct),
    incorrect: numericValue(record.incorrect),
    maxScore: numericValue(record.max_score),
    score: numericValue(record.score),
    skipped: numericValue(record.skipped),
    status: "scored"
  };
}

function getPromptType(promptSnapshot: unknown) {
  if (!promptSnapshot || typeof promptSnapshot !== "object" || Array.isArray(promptSnapshot)) {
    return "unknown";
  }

  const value = (promptSnapshot as Record<string, unknown>).type;
  return typeof value === "string" ? value : "unknown";
}

function numericValue(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
