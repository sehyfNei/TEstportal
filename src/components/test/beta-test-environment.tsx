"use client";

import Link from "next/link";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  PanelRightOpen,
  Send,
  ShieldCheck,
  X
} from "lucide-react";
import { useState } from "react";
import { ConfidenceControl } from "@/components/test/confidence-control";
import { QuestionRenderer } from "@/components/test/question-renderer";
import { ReportQuestion } from "@/components/test/report-question";
import type { TestRunnerQuestion } from "@/components/test/test-runner";
import type {
  Confidence,
  QuestionState,
  SelectedAnswer
} from "@/lib/test-session/answer-shape";
import { cn } from "@/lib/utils";

type NavigatorState = {
  answered: boolean;
  markedReview: boolean;
};

type BetaTestEnvironmentProps = {
  answeredCount: number;
  currentIndex: number;
  currentQuestion: TestRunnerQuestion;
  currentQuestionState: QuestionState;
  locked: boolean;
  message: string;
  navigatorStates: Record<string, NavigatorState>;
  onAnswerChange: (answer: SelectedAnswer) => void;
  onClearAnswer: () => void;
  onConfidenceChange: (confidence: Confidence | null) => void;
  onJump: (index: number) => void;
  onSubmit: () => void;
  onToggleReview: () => void;
  pending: boolean;
  questions: TestRunnerQuestion[];
  remainingLabel: string;
  reviewCount: number;
  saveStatusLabel: string;
  sessionType?: string;
  timerUrgent: boolean;
};

export function BetaTestEnvironment({
  answeredCount,
  currentIndex,
  currentQuestion,
  currentQuestionState,
  locked,
  message,
  navigatorStates,
  onAnswerChange,
  onClearAnswer,
  onConfidenceChange,
  onJump,
  onSubmit,
  onToggleReview,
  pending,
  questions,
  remainingLabel,
  reviewCount,
  saveStatusLabel,
  sessionType,
  timerUrgent
}: BetaTestEnvironmentProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const openCount = questions.length - answeredCount;
  const answered = navigatorStates[currentQuestion.questionId]?.answered ?? false;

  function jump(index: number) {
    onJump(index);
    setPaletteOpen(false);
  }

  function confirmSubmit() {
    setSubmitOpen(false);
    onSubmit();
  }

  return (
    <section className="fixed inset-0 z-[60] flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 bg-slate-950 px-3 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-500 text-sm font-black text-slate-950">
            U
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">UPSC Practice Portal</p>
            <p className="truncate text-xs text-slate-400">{formatSessionType(sessionType)}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={cn(
              "flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-sm font-bold",
              timerUrgent
                ? "border-red-500 bg-red-950 text-red-200"
                : "border-slate-700 bg-slate-900 text-white"
            )}
          >
            <Clock3 aria-hidden="true" className="h-4 w-4" />
            {remainingLabel}
          </div>
          <button
            aria-label="Open question palette"
            className="grid h-10 w-10 place-items-center rounded-md border border-slate-700 text-slate-200 lg:hidden"
            onClick={() => setPaletteOpen(true)}
            title="Question palette"
            type="button"
          >
            <PanelRightOpen aria-hidden="true" className="h-5 w-5" />
          </button>
          <Link
            aria-label="Exit test"
            className="hidden h-10 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-900 sm:inline-flex"
            href="/tests"
            title="Exit test"
          >
            <DoorOpen aria-hidden="true" className="h-4 w-4" />
            Exit
          </Link>
          <button
            aria-label="Open submit confirmation"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={locked || pending}
            onClick={() => setSubmitOpen(true)}
            title="Submit test"
            type="button"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">{pending ? "Submitting" : "Submit"}</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid w-full max-w-4xl gap-4 px-3 py-4 sm:px-6 sm:py-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-3">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-700">Question {currentIndex + 1}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {answeredCount} answered / {openCount} open / {reviewCount} marked
                </p>
              </div>
              <button
                aria-pressed={currentQuestionState.markedReview}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition disabled:opacity-60",
                  currentQuestionState.markedReview
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-slate-300 bg-white text-slate-700 hover:border-amber-500"
                )}
                disabled={locked}
                onClick={onToggleReview}
                type="button"
              >
                <Bookmark
                  aria-hidden="true"
                  className={cn("h-4 w-4", currentQuestionState.markedReview && "fill-current")}
                />
                {currentQuestionState.markedReview ? "Marked" : "Review"}
              </button>
            </div>

            <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm sm:p-6">
              <QuestionRenderer
                disabled={locked}
                onChange={onAnswerChange}
                promptSnapshot={currentQuestion.promptSnapshot}
                value={currentQuestionState.answer}
                variant="beta"
              />
            </article>

            {answered ? (
              <div className="rounded-lg border border-slate-300 bg-slate-950 p-4 text-white">
                <ConfidenceControl
                  disabled={locked}
                  onChange={onConfidenceChange}
                  value={currentQuestionState.confidence}
                  variant="beta"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  aria-label="Previous question"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={locked || currentIndex === 0}
                  onClick={() => onJump(currentIndex - 1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  Previous
                </button>
                <button
                  aria-label="Next question"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={locked || currentIndex === questions.length - 1}
                  onClick={() => onJump(currentIndex + 1)}
                  type="button"
                >
                  Next
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {answered ? (
                  <button
                    className="font-semibold text-slate-700 underline underline-offset-4 disabled:opacity-50"
                    disabled={locked}
                    onClick={onClearAnswer}
                    type="button"
                  >
                    Clear answer
                  </button>
                ) : null}
                <span>{saveStatusLabel}</span>
              </div>
            </div>

            <ReportQuestion questionId={currentQuestion.questionId} />

            {message ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                {message}
              </div>
            ) : null}
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-slate-300 bg-white lg:block">
          <QuestionPalette
            currentIndex={currentIndex}
            navigatorStates={navigatorStates}
            onJump={jump}
            questions={questions}
          />
        </aside>
      </div>

      {paletteOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            aria-label="Close question palette"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setPaletteOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 right-0 w-[min(22rem,90vw)] bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <p className="font-bold">Questions</p>
              <button
                aria-label="Close question palette"
                className="grid h-9 w-9 place-items-center rounded-md border border-slate-300"
                onClick={() => setPaletteOpen(false)}
                title="Close"
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <QuestionPalette
              currentIndex={currentIndex}
              navigatorStates={navigatorStates}
              onJump={jump}
              questions={questions}
            />
          </div>
        </div>
      ) : null}

      {submitOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 p-4">
          <div
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-100 text-emerald-800">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Submit this test?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Your saved responses will be scored and this attempt will move to test history.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200">
              <SummaryMetric label="Answered" value={answeredCount} />
              <SummaryMetric label="Review" value={reviewCount} />
              <SummaryMetric label="Open" value={openCount} />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold hover:border-slate-500"
                onClick={() => setSubmitOpen(false)}
                type="button"
              >
                Keep working
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500"
                onClick={confirmSubmit}
                type="button"
              >
                <Check aria-hidden="true" className="h-4 w-4" />
                Submit test
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QuestionPalette({
  currentIndex,
  navigatorStates,
  onJump,
  questions
}: {
  currentIndex: number;
  navigatorStates: Record<string, NavigatorState>;
  onJump: (index: number) => void;
  questions: TestRunnerQuestion[];
}) {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Question palette</h2>
        <span className="text-xs text-slate-500">{questions.length} total</span>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const state = navigatorStates[question.questionId];
          const current = index === currentIndex;

          return (
            <button
              aria-label={`Go to question ${index + 1}`}
              aria-current={current ? "step" : undefined}
              className={cn(
                "relative grid aspect-square min-h-10 place-items-center rounded-md border text-sm font-bold transition",
                state?.answered
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-600",
                state?.markedReview && "border-amber-500 bg-amber-100 text-amber-900",
                current && "ring-2 ring-slate-950 ring-offset-2"
              )}
              key={question.questionId}
              onClick={() => onJump(index)}
              type="button"
            >
              {index + 1}
              {state?.markedReview ? (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid gap-2 border-t border-slate-200 pt-4 text-xs text-slate-600">
        <LegendItem className="bg-emerald-600" label="Answered" />
        <LegendItem className="border border-amber-500 bg-amber-100" label="Marked for review" />
        <LegendItem className="border border-slate-300 bg-white" label="Not answered" />
      </div>
    </div>
  );
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3 rounded-sm", className)} />
      {label}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 text-center">
      <p className="text-xl font-black">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function formatSessionType(value?: string) {
  if (!value) {
    return "Timed practice";
  }

  return `${value.replaceAll("_", " ")} test`;
}
