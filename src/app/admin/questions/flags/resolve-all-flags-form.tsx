"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveQuestionFlagsAction } from "@/app/admin/questions/flag-actions";

type Props = {
  questionId: string;
};

const initialState = { ok: false, message: "" };

export function ResolveAllFlagsForm({ questionId }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    resolveQuestionFlagsAction,
    initialState
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  if (state.ok) {
    return <p className="text-xs text-emerald-700">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input name="questionId" type="hidden" value={questionId} />
          <input name="resolution" type="hidden" value="resolved" />
          <button
            className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            Resolve all
          </button>
        </form>
        <form action={formAction}>
          <input name="questionId" type="hidden" value={questionId} />
          <input name="resolution" type="hidden" value="rejected" />
          <button
            className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            Reject all
          </button>
        </form>
      </div>
      {state.message && !state.ok ? (
        <p className="text-xs text-red-700">{state.message}</p>
      ) : null}
    </div>
  );
}
