export type HistorySessionRow = {
  id: string;
  exam_id: string;
  type: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type HistoryResultRow = {
  id: string;
  session_id: string;
  score: number | string;
  max_score: number | string;
  accuracy: number | string;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
};

export type HistoryAnalysisRow = {
  session_result_id: string;
  status: string;
};

export type HistoryExamRow = {
  id: string;
  name: string;
};

export type TestHistoryItem = {
  sessionId: string;
  resultId: string;
  examName: string;
  type: string;
  completedAt: string;
  score: number;
  maxScore: number;
  accuracy: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  analysisStatus: "absent" | "completed" | "disabled" | "failed" | "pending" | "running";
};

const ANALYSIS_STATUSES = new Set<TestHistoryItem["analysisStatus"]>([
  "completed",
  "disabled",
  "failed",
  "pending",
  "running"
]);

export function buildTestHistory(
  sessions: HistorySessionRow[],
  results: HistoryResultRow[],
  analyses: HistoryAnalysisRow[],
  exams: HistoryExamRow[]
): TestHistoryItem[] {
  const resultBySession = new Map(results.map((result) => [result.session_id, result]));
  const analysisByResult = new Map(analyses.map((analysis) => [analysis.session_result_id, analysis.status]));
  const examById = new Map(exams.map((exam) => [exam.id, exam.name]));

  return sessions.flatMap((session) => {
    const result = resultBySession.get(session.id);
    if (!result) {
      return [];
    }

    return [{
      sessionId: session.id,
      resultId: result.id,
      examName: examById.get(session.exam_id) ?? "Exam",
      type: session.type,
      completedAt: session.submitted_at ?? session.started_at ?? session.created_at,
      score: toNumber(result.score),
      maxScore: toNumber(result.max_score),
      accuracy: toNumber(result.accuracy),
      attempted: result.attempted,
      correct: result.correct,
      incorrect: result.incorrect,
      skipped: result.skipped,
      analysisStatus: normalizeAnalysisStatus(analysisByResult.get(result.id))
    }];
  });
}

function normalizeAnalysisStatus(value: string | undefined): TestHistoryItem["analysisStatus"] {
  return value && ANALYSIS_STATUSES.has(value as TestHistoryItem["analysisStatus"])
    ? (value as TestHistoryItem["analysisStatus"])
    : "absent";
}

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
