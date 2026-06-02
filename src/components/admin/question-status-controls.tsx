"use client";

import { useActionState } from "react";
import { setQuestionStatusAction } from "@/app/admin/questions/actions";
import { initialAdminQuestionActionState } from "@/lib/question-bank/admin-question-schema";
import type { QuestionStatus } from "@/lib/question-bank/question-lifecycle";

export type QuestionStatusCommand = {
  label: string;
  note: string;
  tone?: "primary" | "neutral" | "danger";
  toStatus: QuestionStatus;
};

type QuestionStatusControlsProps = {
  commands: QuestionStatusCommand[];
  questionId: string;
};

export function QuestionStatusControls({ commands, questionId }: QuestionStatusControlsProps) {
  const [state, formAction, isPending] = useActionState(
    setQuestionStatusAction,
    initialAdminQuestionActionState
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {commands.map((command) => (
          <form action={formAction} key={`${questionId}-${command.toStatus}`}>
            <input name="questionId" type="hidden" value={questionId} />
            <input name="toStatus" type="hidden" value={command.toStatus} />
            <input name="note" type="hidden" value={command.note} />
            <button
              className={buttonClass(command.tone)}
              disabled={isPending}
              type="submit"
            >
              {command.label}
            </button>
          </form>
        ))}
      </div>
      {state.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm ${
            state.ok
              ? "border-primary/30 bg-primary/10 text-foreground"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function buttonClass(tone: QuestionStatusCommand["tone"] = "neutral") {
  const base =
    "h-10 rounded-md px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  if (tone === "primary") {
    return `${base} bg-primary text-primary-foreground hover:opacity-90`;
  }

  if (tone === "danger") {
    return `${base} border border-red-200 text-red-700 hover:border-red-400`;
  }

  return `${base} border border-border text-foreground hover:border-primary`;
}
