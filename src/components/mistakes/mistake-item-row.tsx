"use client";

import { useActionState } from "react";
import {
  initialResolveMistakeState,
  resolveMistakeAction
} from "@/app/mistakes/actions";
import { MISTAKE_TYPE_LABELS, type MistakeListItem } from "@/lib/mistakes/mistake-list";

type Props = {
  mistake: MistakeListItem;
};

export function MistakeItemRow({ mistake }: Props) {
  const [stateReviewed, formActionReviewed, isPendingReviewed] = useActionState(
    resolveMistakeAction,
    initialResolveMistakeState
  );
  const [stateResolved, formActionResolved, isPendingResolved] = useActionState(
    resolveMistakeAction,
    initialResolveMistakeState
  );
  const [stateIgnored, formActionIgnored, isPendingIgnored] = useActionState(
    resolveMistakeAction,
    initialResolveMistakeState
  );
  const [stateReopen, formActionReopen, isPendingReopen] = useActionState(
    resolveMistakeAction,
    initialResolveMistakeState
  );

  // Combine error message states if any of the forms return an error
  const state = 
    (stateReviewed.message && !stateReviewed.ok ? stateReviewed : null) ||
    (stateResolved.message && !stateResolved.ok ? stateResolved : null) ||
    (stateIgnored.message && !stateIgnored.ok ? stateIgnored : null) ||
    (stateReopen.message && !stateReopen.ok ? stateReopen : { ok: true, message: "" });

  const isPending = isPendingReviewed || isPendingResolved || isPendingIgnored || isPendingReopen;

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-border bg-card shadow-card p-4 sm:flex-row sm:items-center sm:justify-between transition hover:border-foreground/20">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:text-red-300">
            {MISTAKE_TYPE_LABELS[mistake.mistakeType] ?? mistake.mistakeType}
          </span>
          {mistake.confidence ? (
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
              Confidence: {mistake.confidence}
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Detected {new Date(mistake.createdAt).toLocaleDateString()}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-foreground">
          {mistake.stem ? (
            mistake.stem.length > 180 ? `${mistake.stem.substring(0, 180)}...` : mistake.stem
          ) : (
            <span className="italic text-muted-foreground">Question text unavailable</span>
          )}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {mistake.topicName ? (
            <span>
              <span className="font-medium text-foreground">Topic:</span> {mistake.topicName}
            </span>
          ) : null}
          {mistake.topicName && mistake.conceptName ? <span className="text-muted-foreground/60">•</span> : null}
          {mistake.conceptName ? (
            <span>
              <span className="font-medium text-foreground">Concept:</span> {mistake.conceptName}
            </span>
          ) : null}
        </div>

        {!state.ok && state.message ? (
          <p className="mt-2 text-xs text-red-600 font-medium">{state.message}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0 sm:flex-nowrap items-center">
        {mistake.status === "unresolved" ? (
          <>
            <form action={formActionReviewed}>
              <input type="hidden" name="mistakeId" value={mistake.id} />
              <input type="hidden" name="status" value="reviewed" />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                {isPendingReviewed ? "Saving..." : "Mark reviewed"}
              </button>
            </form>

            <form action={formActionResolved}>
              <input type="hidden" name="mistakeId" value={mistake.id} />
              <input type="hidden" name="status" value="resolved" />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white dark:text-emerald-50 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {isPendingResolved ? "Saving..." : "Resolve"}
              </button>
            </form>

            <form action={formActionIgnored}>
              <input type="hidden" name="mistakeId" value={mistake.id} />
              <input type="hidden" name="status" value="ignored" />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {isPendingIgnored ? "Saving..." : "Ignore"}
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground capitalize">
              Status: {mistake.status}
            </span>
            <form action={formActionReopen}>
              <input type="hidden" name="mistakeId" value={mistake.id} />
              <input type="hidden" name="status" value="unresolved" />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                {isPendingReopen ? "Saving..." : "Reopen"}
              </button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
