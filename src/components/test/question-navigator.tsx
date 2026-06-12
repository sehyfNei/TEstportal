"use client";

import { cn } from "@/lib/utils";

type QuestionNavigatorProps = {
  currentIndex: number;
  disabled?: boolean;
  onJump: (index: number) => void;
  questions: { questionId: string; sequence: number }[];
  states: Record<string, { answered: boolean; markedReview: boolean }>;
};

export function QuestionNavigator({
  currentIndex,
  disabled,
  onJump,
  questions,
  states
}: QuestionNavigatorProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card shadow-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Question navigator</h2>
        <Legend />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
        {questions.map((question, index) => {
          const state = states[question.questionId];
          const answered = Boolean(state?.answered);
          const markedReview = Boolean(state?.markedReview);
          const status = markedReview
            ? answered
              ? "review-answered"
              : "review"
            : answered
              ? "answered"
              : "unanswered";

          return (
            <button
              aria-current={index === currentIndex ? "step" : undefined}
              aria-label={`Question ${question.sequence}, ${statusLabel[status]}`}
              className={cn(
                "h-10 w-10 rounded-md text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                statusClass[status],
                index === currentIndex ? "ring-2 ring-primary ring-offset-1" : ""
              )}
              disabled={disabled}
              key={question.questionId}
              onClick={() => onJump(index)}
              type="button"
            >
              {question.sequence}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type NavigatorStatus = "unanswered" | "answered" | "review" | "review-answered";

const statusClass: Record<NavigatorStatus, string> = {
  unanswered: "border border-border bg-muted text-muted-foreground hover:border-primary",
  answered: "bg-primary text-primary-foreground hover:opacity-90",
  review: "border border-amber-300 bg-amber-100 text-amber-800 hover:border-amber-500",
  "review-answered": "bg-amber-400 text-amber-950 hover:bg-amber-300"
};

const statusLabel: Record<NavigatorStatus, string> = {
  unanswered: "unanswered",
  answered: "answered",
  review: "marked for review",
  "review-answered": "answered and marked for review"
};

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span>Open</span>
      <span>Answered</span>
      <span>Review</span>
    </div>
  );
}
