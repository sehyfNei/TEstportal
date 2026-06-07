"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  startRetestAction,
  type StartRetestState
} from "@/app/dashboard/actions";

const initialStartRetestState: StartRetestState = { ok: false, message: "" };
import type { DueRetest } from "@/lib/dashboard/overview";

type Props = {
  retests: DueRetest[];
  examId: string;
};

export function DueRetests({ retests, examId }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5" id="due-retests">
      <h2 className="text-lg font-semibold">Due retests</h2>

      {retests.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          No retests due yet. Keep practicing and reviewing mistakes to build your queue.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {retests.map((retest) => (
            <RetestItem examId={examId} key={retest.id} retest={retest} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RetestItem({ examId, retest }: { examId: string; retest: DueRetest }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<StartRetestState, FormData>(
    startRetestAction,
    initialStartRetestState
  );
  const dueDate = new Date(retest.dueAt);
  const isOverdue = dueDate <= new Date();

  useEffect(() => {
    if (state.ok && state.sessionId) {
      router.push(`/tests/${state.sessionId}`);
    }
  }, [router, state.ok, state.sessionId]);

  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {retest.conceptId ? "Concept retest" : "Topic retest"}
        </p>
        <p className={`mt-0.5 text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
          {isOverdue ? "Overdue" : `Due ${dueDate.toLocaleDateString()}`}
        </p>
        {!state.ok && state.message ? (
          <p className="mt-1 text-xs text-red-600">{state.message}</p>
        ) : null}
      </div>

      <form action={formAction}>
        <input name="retestQueueId" type="hidden" value={retest.id} />
        <input name="examId" type="hidden" value={examId} />
        <button
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Starting..." : <>Start &rarr;</>}
        </button>
      </form>
    </li>
  );
}
