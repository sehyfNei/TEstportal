"use client";

import { useActionState } from "react";
import {
  type BackfillActionState,
  backfillExplanationsAction
} from "@/app/admin/questions/backfill/actions";

const initialState: BackfillActionState = {
  ok: false,
  message: "",
  updated: 0,
  remaining: -1,
  results: []
};

export function ExplanationBackfillRunner({ missingCount }: { missingCount: number }) {
  const [state, formAction, isPending] = useActionState(backfillExplanationsAction, initialState);
  const remaining = state.remaining >= 0 ? state.remaining : missingCount;

  return (
    <div className="grid gap-5">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || remaining === 0}
          type="submit"
        >
          {isPending
            ? "Generating explanations..."
            : remaining === 0
              ? "All questions have explanations"
              : `Generate for next ${Math.min(10, remaining)} questions`}
        </button>
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
      </form>

      {isPending ? (
        <p className="text-sm text-muted-foreground">
          This takes about 20-30 seconds per batch: one AI call plus a version save per question.
          Keep this tab open.
        </p>
      ) : null}

      {state.results.length ? (
        <div className="grid gap-3">
          {state.results.map((result) => (
            <article
              className="rounded-xl border border-border bg-card shadow-card p-4"
              key={result.questionId}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-semibold">{result.stem}</p>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
                    result.status === "updated"
                      ? "bg-green-500/10 text-green-700 ring-green-500/30"
                      : result.status === "failed"
                        ? "bg-red-500/10 text-red-700 ring-red-500/30"
                        : "bg-muted text-muted-foreground ring-border"
                  }`}
                >
                  {result.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.detail}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
