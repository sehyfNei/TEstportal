"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { logTabSwitchAction, saveAnswerAction, submitSessionAction } from "@/app/test/actions";
import { AnalysisPanel, type QuestionLabel } from "@/components/test/analysis-panel";
import { ConfidenceControl } from "@/components/test/confidence-control";
import { QuestionNavigator } from "@/components/test/question-navigator";
import { QuestionRenderer } from "@/components/test/question-renderer";
import {
  isSelectedAnswerAnswered,
  normalizeSelectedAnswer,
  selectedAnswerToJson,
  type Confidence,
  type QuestionState,
  type SelectedAnswer
} from "@/lib/test-session/answer-shape";
import { mergeWithBackup, useSessionBackupStore } from "@/lib/test-session/session-backup-store";
import { extractStem } from "@/lib/ai/jobs/question-context";
import type { AnalysisView } from "@/lib/ai/analysis-view";
import { cn } from "@/lib/utils";

export type TestRunnerQuestion = {
  promptSnapshot: unknown;
  questionId: string;
  sequence: number;
  sessionQuestionId: string;
};

export type TestResultSummary = {
  accuracy?: number;
  attempted?: number;
  correct?: number;
  incorrect?: number;
  maxScore?: number;
  score?: number;
  skipped?: number;
  status?: string;
};

type TestRunnerProps = {
  expiresAt: string | null;
  initialAnalysis?: AnalysisView | null;
  initialQuestionStates: Record<string, QuestionState>;
  initialResult?: TestResultSummary | null;
  initialResultId?: string | null;
  initialStatus: string;
  questions: TestRunnerQuestion[];
  serverNow: string;
  sessionId: string;
};

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "failed";

type DebouncedSave = {
  question: TestRunnerQuestion;
  timerId: ReturnType<typeof window.setTimeout>;
};

const INTEGER_SAVE_DEBOUNCE_MS = 800;

export function TestRunner({
  expiresAt,
  initialAnalysis,
  initialQuestionStates,
  initialResult,
  initialResultId,
  initialStatus,
  questions,
  serverNow,
  sessionId
}: TestRunnerProps) {
  const [questionStates, setQuestionStates] =
    useState<Record<string, QuestionState>>(initialQuestionStates);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<TestResultSummary | null>(initialResult ?? null);
  const [resultId, setResultId] = useState<string | null>(initialResultId ?? null);
  const [status, setStatus] = useState(initialStatus);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt, serverNow, 0));
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const backupHydrated = useSessionBackupStore((state) => state.hasHydrated);
  const clearBackup = useSessionBackupStore((state) => state.clearBackup);
  const getBackup = useSessionBackupStore((state) => state.getBackup);
  const setBackup = useSessionBackupStore((state) => state.setBackup);
  const elapsedStartRef = useRef(0);
  const entryStartedAtRef = useRef(performance.now());
  const questionStatesRef = useRef(initialQuestionStates);
  const backupAppliedRef = useRef(false);
  const debouncedSaveRef = useRef<DebouncedSave | null>(null);
  const pendingVisitRef = useRef<Record<string, number>>(
    questions[0] ? { [questions[0].questionId]: 1 } : {}
  );
  const submittedRef = useRef(Boolean(initialResult || initialStatus === "scored"));

  const currentQuestion = questions[currentIndex];
  const currentQuestionState = currentQuestion
    ? getQuestionState(questionStates, currentQuestion.questionId)
    : emptyQuestionState();
  const locked = submittedRef.current || status === "submitted" || status === "scored";
  const navigatorStates = useMemo(
    () =>
      questions.reduce<Record<string, { answered: boolean; markedReview: boolean }>>(
        (accumulator, question) => {
          const state = getQuestionState(questionStates, question.questionId);
          accumulator[question.questionId] = {
            answered: isSelectedAnswerAnswered(state.answer),
            markedReview: state.markedReview
          };
          return accumulator;
        },
        {}
      ),
    [questionStates, questions]
  );
  const answeredCount = useMemo(
    () => Object.values(navigatorStates).filter((state) => state.answered).length,
    [navigatorStates]
  );
  const reviewCount = useMemo(
    () => Object.values(navigatorStates).filter((state) => state.markedReview).length,
    [navigatorStates]
  );
  const questionLabels = useMemo(
    () =>
      questions.reduce<Record<string, QuestionLabel>>((accumulator, question) => {
        accumulator[question.questionId] = {
          sequence: question.sequence,
          stem: extractStem(question.promptSnapshot)
        };
        return accumulator;
      }, {}),
    [questions]
  );

  useEffect(() => {
    if (!backupHydrated || backupAppliedRef.current || submittedRef.current) {
      return;
    }

    backupAppliedRef.current = true;
    const merged = mergeWithBackup(questionStatesRef.current, getBackup(sessionId));
    questionStatesRef.current = merged;
    setQuestionStates(merged);
  }, [backupHydrated, getBackup, sessionId]);

  useEffect(() => {
    elapsedStartRef.current = performance.now();
    const interval = window.setInterval(() => {
      const elapsedMs = performance.now() - elapsedStartRef.current;
      const nextRemaining = getRemainingMs(expiresAt, serverNow, elapsedMs);
      setRemainingMs(nextRemaining);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt, serverNow]);

  useEffect(() => {
    return () => {
      clearDebouncedSave();
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== "hidden" || submittedRef.current || status !== "in_progress") {
        return;
      }

      setTabSwitchCount((count) => count + 1);
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      void logTabSwitchAction(formData).catch(() => undefined);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [sessionId, status]);

  const saveQuestionAnswer = useCallback(
    async (question: TestRunnerQuestion, state: QuestionState) => {
      const elapsedSec = Math.max(
        0,
        Math.round((performance.now() - entryStartedAtRef.current) / 1000)
      );
      entryStartedAtRef.current = performance.now();
      setSaveStatus("saving");

      const revisitIncrement = pendingVisitRef.current[question.questionId] ?? 0;
      delete pendingVisitRef.current[question.questionId];

      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("questionId", question.questionId);
      formData.set("selectedAnswer", selectedAnswerToJson(state.answer));
      formData.set("confidence", state.confidence ?? "");
      formData.set("markedReview", state.markedReview ? "true" : "false");
      formData.set("timeSpentSec", String(elapsedSec));
      formData.set("revisitIncrement", String(revisitIncrement));

      const nextState = await saveAnswerAction({ ok: false, message: "" }, formData);

      if (nextState.ok) {
        setSaveStatus("saved");
        setMessage("");
      } else {
        setSaveStatus("failed");
        setMessage(nextState.message);
      }

      return nextState.ok;
    },
    [sessionId]
  );

  const flushDebouncedSave = useCallback(async () => {
    const pending = debouncedSaveRef.current;

    if (!pending) {
      return;
    }

    window.clearTimeout(pending.timerId);
    debouncedSaveRef.current = null;
    await saveQuestionAnswer(
      pending.question,
      getQuestionState(questionStatesRef.current, pending.question.questionId)
    );
  }, [saveQuestionAnswer]);

  const submit = useCallback(
    (mode: "manual" | "auto") => {
      if (submittedRef.current) {
        return;
      }

      submittedRef.current = true;
      setStatus("submitted");
      setMessage(mode === "auto" ? "Time expired. Submitting..." : "Submitting...");

      startTransition(async () => {
        await flushDebouncedSave();

        if (currentQuestion) {
          await saveQuestionAnswer(
            currentQuestion,
            getQuestionState(questionStatesRef.current, currentQuestion.questionId)
          );
        }

        const formData = new FormData();
        formData.set("sessionId", sessionId);

        const nextState = await submitSessionAction({ ok: false, message: "" }, formData);

        if (!nextState.ok) {
          submittedRef.current = false;
          setStatus("in_progress");
          setMessage(nextState.message);
          return;
        }

        clearBackup(sessionId);
        setResult(nextState.result ?? null);
        setResultId(nextState.result?.resultId ?? null);
        setStatus(nextState.result?.status ?? "scored");
        setMessage("Session scored.");
      });
    },
    [clearBackup, currentQuestion, flushDebouncedSave, saveQuestionAnswer, sessionId]
  );

  useEffect(() => {
    if (remainingMs <= 0 && !locked && questions.length) {
      submit("auto");
    }
  }, [locked, questions.length, remainingMs, submit]);

  function commitQuestionState(
    question: TestRunnerQuestion,
    state: QuestionState,
    mode: "immediate" | "debounced" = "immediate"
  ) {
    const nextStates = {
      ...questionStatesRef.current,
      [question.questionId]: state
    };

    questionStatesRef.current = nextStates;
    setQuestionStates(nextStates);
    setBackup(sessionId, nextStates);

    if (mode === "debounced") {
      scheduleDebouncedSave(question);
      return;
    }

    clearDebouncedSave(question.questionId);
    startTransition(async () => {
      await saveQuestionAnswer(question, state);
    });
  }

  function handleAnswerChange(answer: SelectedAnswer) {
    if (!currentQuestion || locked) {
      return;
    }

    const promptType = getPromptType(currentQuestion.promptSnapshot);
    const currentState = getQuestionState(questionStatesRef.current, currentQuestion.questionId);
    const normalizedAnswer = normalizeSelectedAnswer(promptType, answer);

    commitQuestionState(
      currentQuestion,
      {
        ...currentState,
        answer: normalizedAnswer
      },
      promptType === "integer" ? "debounced" : "immediate"
    );
  }

  function handleConfidenceChange(confidence: Confidence | null) {
    if (!currentQuestion || locked) {
      return;
    }

    const currentState = getQuestionState(questionStatesRef.current, currentQuestion.questionId);

    commitQuestionState(currentQuestion, {
      ...currentState,
      confidence
    });
  }

  function toggleMarkedReview() {
    if (!currentQuestion || locked) {
      return;
    }

    const currentState = getQuestionState(questionStatesRef.current, currentQuestion.questionId);

    commitQuestionState(currentQuestion, {
      ...currentState,
      markedReview: !currentState.markedReview
    });
  }

  function jumpTo(index: number) {
    if (!currentQuestion) {
      return;
    }

    const nextIndex = clamp(index, 0, questions.length - 1);
    const nextQuestion = questions[nextIndex];

    startTransition(async () => {
      await flushDebouncedSave();
      await saveQuestionAnswer(
        currentQuestion,
        getQuestionState(questionStatesRef.current, currentQuestion.questionId)
      );

      if (nextQuestion && nextIndex !== currentIndex) {
        pendingVisitRef.current[nextQuestion.questionId] =
          (pendingVisitRef.current[nextQuestion.questionId] ?? 0) + 1;
      }

      setCurrentIndex(nextIndex);
      entryStartedAtRef.current = performance.now();
    });
  }

  function move(delta: number) {
    jumpTo(currentIndex + delta);
  }

  function scheduleDebouncedSave(question: TestRunnerQuestion) {
    clearDebouncedSave();
    setSaveStatus("pending");
    debouncedSaveRef.current = {
      question,
      timerId: window.setTimeout(() => {
        const pending = debouncedSaveRef.current;

        if (!pending) {
          return;
        }

        debouncedSaveRef.current = null;
        startTransition(async () => {
          await saveQuestionAnswer(
            pending.question,
            getQuestionState(questionStatesRef.current, pending.question.questionId)
          );
        });
      }, INTEGER_SAVE_DEBOUNCE_MS)
    };
  }

  function clearDebouncedSave(questionId?: string) {
    const pending = debouncedSaveRef.current;

    if (!pending || (questionId && pending.question.questionId !== questionId)) {
      return;
    }

    window.clearTimeout(pending.timerId);
    debouncedSaveRef.current = null;
  }

  if (!questions.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
        No questions are attached to this session.
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Question {currentQuestion.sequence}</p>
            <h1 className="mt-1 text-2xl font-semibold">
              {currentIndex + 1} of {questions.length}
            </h1>
          </div>
          <div className="flex flex-wrap items-start gap-3 sm:justify-end">
            <button
              className={cn(
                "h-10 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                currentQuestionState.markedReview
                  ? "border-amber-300 text-amber-700 hover:border-amber-500"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              )}
              disabled={locked || isPending}
              onClick={toggleMarkedReview}
              type="button"
            >
              {currentQuestionState.markedReview ? "Marked - unmark" : "Mark for review"}
            </button>
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">Time remaining</p>
              <p className={`mt-1 text-2xl font-semibold ${remainingMs <= 60000 ? "text-red-700" : ""}`}>
                {formatRemaining(remainingMs)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{answeredCount} answered</span>
          <span>{questions.length - answeredCount} open</span>
          <span>{reviewCount} marked</span>
          <span>{saveLabel(saveStatus)}</span>
          {tabSwitchCount ? (
            <span>
              {tabSwitchCount} tab switch{tabSwitchCount === 1 ? "" : "es"}
            </span>
          ) : null}
        </div>
      </div>

      <QuestionNavigator
        currentIndex={currentIndex}
        disabled={locked || isPending}
        onJump={jumpTo}
        questions={questions}
        states={navigatorStates}
      />

      {result ? <ResultPanel result={result} /> : null}

      {result ? (
        <AnalysisPanel
          initialAnalysis={initialAnalysis ?? null}
          questionLabels={questionLabels}
          resultId={resultId}
          sessionId={sessionId}
        />
      ) : null}

      <div className="grid gap-5 rounded-lg border border-border bg-card p-5">
        <QuestionRenderer
          disabled={locked || isPending}
          onChange={handleAnswerChange}
          promptSnapshot={currentQuestion.promptSnapshot}
          value={currentQuestionState.answer}
        />
        <ConfidenceControl
          disabled={locked || isPending}
          onChange={handleConfidenceChange}
          value={currentQuestionState.confidence}
        />
      </div>

      {message ? (
        <div className="rounded-md border border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            className="h-10 rounded-md border border-border px-4 text-sm font-semibold transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || currentIndex === 0 || isPending}
            onClick={() => move(-1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="h-10 rounded-md border border-border px-4 text-sm font-semibold transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || currentIndex === questions.length - 1 || isPending}
            onClick={() => move(1)}
            type="button"
          >
            Next
          </button>
        </div>
        <button
          className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={locked || isPending}
          onClick={() => submit("manual")}
          type="button"
        >
          {isPending && submittedRef.current ? "Submitting..." : "Submit test"}
        </button>
      </div>
    </section>
  );
}

function ResultPanel({ result }: { result: TestResultSummary }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Score</p>
          <h2 className="mt-1 text-3xl font-semibold">
            {formatScore(result.score)} / {formatScore(result.maxScore)}
          </h2>
        </div>
        <Link className="rounded-md border border-primary/30 px-3 py-2 text-sm font-semibold" href="/dashboard">
          Dashboard
        </Link>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-5">
        <Metric label="Accuracy" value={`${Math.round((result.accuracy ?? 0) * 100)}%`} />
        <Metric label="Attempted" value={String(result.attempted ?? 0)} />
        <Metric label="Correct" value={String(result.correct ?? 0)} />
        <Metric label="Incorrect" value={String(result.incorrect ?? 0)} />
        <Metric label="Skipped" value={String(result.skipped ?? 0)} />
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function getQuestionState(
  states: Record<string, QuestionState>,
  questionId: string
): QuestionState {
  return states[questionId] ?? emptyQuestionState();
}

function emptyQuestionState(): QuestionState {
  return {
    answer: null,
    confidence: null,
    markedReview: false
  };
}

function getRemainingMs(expiresAt: string | null, serverNow: string, elapsedMs: number) {
  if (!expiresAt) {
    return 0;
  }

  const expiresAtMs = Date.parse(expiresAt);
  const serverNowMs = Date.parse(serverNow);

  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(serverNowMs)) {
    return 0;
  }

  return Math.max(0, expiresAtMs - (serverNowMs + elapsedMs));
}

function formatRemaining(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function saveLabel(status: SaveStatus) {
  if (status === "pending") {
    return "Saved locally";
  }

  if (status === "saving") {
    return "Saving...";
  }

  if (status === "saved") {
    return "Saved";
  }

  if (status === "failed") {
    return "Save failed";
  }

  return "Not saved yet";
}

function getPromptType(promptSnapshot: unknown) {
  if (!promptSnapshot || typeof promptSnapshot !== "object" || Array.isArray(promptSnapshot)) {
    return "unknown";
  }

  const value = (promptSnapshot as Record<string, unknown>).type;
  return typeof value === "string" ? value : "unknown";
}

function formatScore(value: number | undefined) {
  return typeof value === "number" ? Number(value.toFixed(2)).toString() : "0";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
