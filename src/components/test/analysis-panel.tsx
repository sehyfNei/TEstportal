"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getSessionAnalysisAction } from "@/app/test/actions";
import { logEventAction } from "@/app/analytics/actions";
import { ExplanationRating } from "@/components/test/explanation-rating";
import {
  isTerminalAnalysisStatus,
  type AnalysisStatus,
  type AnalysisView
} from "@/lib/ai/analysis-view";
import type { AnalysisOutput } from "@/lib/ai/schemas/analysis";

const MAX_POLLS = 20;
const POLL_INTERVAL_MS = 3000;

export type QuestionLabel = {
  sequence: number;
  stem: string;
};

type AnalysisPanelProps = {
  initialAnalysis: AnalysisView | null;
  questionLabels: Record<string, QuestionLabel>;
  resultId: string | null;
  sessionId: string;
};

export function AnalysisPanel({
  initialAnalysis,
  questionLabels,
  resultId,
  sessionId
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisView>(
    initialAnalysis ?? { status: "running", output: null }
  );
  const [isPolling, startPolling] = useTransition();
  const attemptsRef = useRef(0);
  const viewLoggedRef = useRef(false);

  useEffect(() => {
    if (analysis.status === "completed" && !viewLoggedRef.current) {
      viewLoggedRef.current = true;
      void logEventAction({ eventType: "analysis_view", entityType: "session", entityId: sessionId });
    }
  }, [analysis.status, sessionId]);

  const fetchAnalysis = useCallback(() => {
    startPolling(async () => {
      const next = await getSessionAnalysisAction(sessionId);
      if (next.ok) {
        setAnalysis(next.analysis);
      }
    });
  }, [sessionId]);

  useEffect(() => {
    if (isTerminalAnalysisStatus(analysis.status) || attemptsRef.current >= MAX_POLLS) {
      return;
    }

    const timer = window.setTimeout(() => {
      attemptsRef.current += 1;
      fetchAnalysis();
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [analysis.status, fetchAnalysis, isPolling]);

  const handleRefresh = useCallback(() => {
    attemptsRef.current = 0;
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (analysis.status === "absent") {
    return null;
  }

  if (analysis.status === "completed" && analysis.output) {
    return (
      <AnalysisReport
        output={analysis.output}
        questionLabels={questionLabels}
        resultId={resultId}
      />
    );
  }

  return (
    <PendingPanel
      status={analysis.status}
      isPolling={isPolling}
      onRefresh={handleRefresh}
    />
  );
}

function PendingPanel({
  status,
  isPolling,
  onRefresh
}: {
  isPolling: boolean;
  onRefresh: () => void;
  status: AnalysisStatus;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">AI analysis</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{statusMessage(status)}</p>
        </div>
        {status === "pending" || status === "running" || status === "failed" ? (
          <button
            className="h-9 rounded-md border border-border px-3 text-sm font-semibold transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPolling}
            onClick={onRefresh}
            type="button"
          >
            {isPolling ? "Checking..." : "Refresh"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function statusMessage(status: AnalysisStatus): string {
  if (status === "pending" || status === "running") {
    return "Generating your analysis...";
  }

  if (status === "disabled") {
    return "AI analysis is currently turned off.";
  }

  return "We couldn't generate AI analysis for this attempt. You can click Refresh to try again.";
}

function AnalysisReport({
  output,
  questionLabels,
  resultId
}: {
  output: AnalysisOutput;
  questionLabels: Record<string, QuestionLabel>;
  resultId: string | null;
}) {
  return (
    <div className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-5">
      <div>
        <p className="text-sm font-medium text-primary">AI analysis</p>
        <p className="mt-2 text-sm leading-7">{output.overallSummary}</p>
        {resultId ? (
          <ExplanationRating scope="overall" scopeKey="" sessionResultId={resultId} />
        ) : null}
      </div>

      {output.topicSummaries.length ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Topic summaries</h3>
          <div className="grid gap-3">
            {output.topicSummaries.map((topic) => (
              <div key={topic.topicName} className="rounded-md border border-border p-4">
                <p className="font-semibold">{topic.topicName}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.summary}</p>
                <p className="mt-2 text-sm leading-6">
                  <span className="font-medium text-foreground">Recommendation: </span>
                  {topic.recommendation}
                </p>
                {resultId ? (
                  <ExplanationRating
                    scope="topic_summary"
                    scopeKey={topic.topicName}
                    sessionResultId={resultId}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {output.questionAnalyses.length ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            Question-wise explanations
          </h3>
          <div className="grid gap-3">
            {output.questionAnalyses.map((item) => {
              const label = questionLabels[item.questionId];
              return (
                <div key={item.questionId} className="rounded-md border border-border p-4">
                  <p className="font-semibold">{questionHeading(label)}</p>
                  <p className="mt-2 text-sm leading-6">
                    <span className="font-medium">Why correct: </span>
                    {item.whyCorrect}
                  </p>
                  {item.whySelectedWrong ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      <span className="font-medium text-foreground">Your answer: </span>
                      {item.whySelectedWrong}
                    </p>
                  ) : null}
                  {item.trapExplanation ? (
                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      <span className="font-medium">Trap: </span>
                      {item.trapExplanation}
                    </p>
                  ) : null}
                  {resultId ? (
                    <ExplanationRating
                      scope="question_analysis"
                      scopeKey={item.questionId}
                      sessionResultId={resultId}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {output.strategyInsights.length ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Strategy insights</h3>
          <ul className="ml-5 list-disc text-sm leading-7">
            {output.strategyInsights.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {output.nextActions.length ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Next actions</h3>
          <ul className="ml-5 list-disc text-sm leading-7">
            {output.nextActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function questionHeading(label: QuestionLabel | undefined): string {
  if (!label) {
    return "Question";
  }

  const base = `Question ${label.sequence}`;
  return label.stem && label.stem !== "(question)" ? `${base} — ${label.stem}` : base;
}
