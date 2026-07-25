"use client";

import { useActionState, useState } from "react";
import { createLearningPathAction, type LearningPathWizardState } from "@/app/(app)/study/path/actions";
import { MAX_GOAL_LENGTH } from "@/lib/learning-path/wizard-input";
import { cn } from "@/lib/utils";

type ExamOption = { id: string; name: string };

const STEPS = ["Exam", "Target date", "Goal"] as const;
const initialState: LearningPathWizardState = { ok: true, message: "" };

export function LearningPathWizard({
  exams,
  initialExamId
}: {
  exams: ExamOption[];
  initialExamId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(createLearningPathAction, initialState);
  const [step, setStep] = useState(0);
  const [examId, setExamId] = useState(
    initialExamId && exams.some((exam) => exam.id === initialExamId)
      ? initialExamId
      : exams.length === 1
        ? exams[0].id
        : ""
  );
  const [targetDate, setTargetDate] = useState("");
  const [goal, setGoal] = useState("");

  const canAdvance =
    (step === 0 && Boolean(examId)) || (step === 1 && Boolean(targetDate)) || step === 2;
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-6">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <h2 className="mt-1 text-lg font-semibold">Set your goal</h2>
      </div>

      {step === 0 ? (
        <label className="grid gap-2 text-sm font-medium">
          Which exam are you preparing for?
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            onChange={(event) => setExamId(event.target.value)}
            value={examId}
          >
            <option value="">Select exam</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input name="examId" type="hidden" value={examId} />
      )}

      {step === 1 ? (
        <label className="grid gap-2 text-sm font-medium">
          When do you want to be ready by?
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            min={minDate}
            onChange={(event) => setTargetDate(event.target.value)}
            type="date"
            value={targetDate}
          />
        </label>
      ) : (
        <input name="targetDate" type="hidden" value={targetDate} />
      )}

      {step === 2 ? (
        <label className="grid gap-2 text-sm font-medium">
          What does success look like for you?
          <textarea
            className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            maxLength={MAX_GOAL_LENGTH}
            name="goal"
            onChange={(event) => setGoal(event.target.value)}
            placeholder="e.g. Clear UPSC Prelims 2026"
            value={goal}
          />
          <span className="text-xs text-muted-foreground">
            {goal.length}/{MAX_GOAL_LENGTH}
          </span>
        </label>
      ) : (
        <input name="goal" type="hidden" value={goal} />
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          className="h-11 rounded-md border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          disabled={step === 0 || isPending}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          type="button"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canAdvance}
            onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
            type="button"
          >
            Next
          </button>
        ) : (
          <button
            className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || !goal.trim()}
            type="submit"
          >
            {isPending ? "Creating your plan..." : "Create my plan"}
          </button>
        )}
      </div>

      {state.message ? (
        <p
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            state.ok
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
