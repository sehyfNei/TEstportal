"use client";

import { useActionState } from "react";
import { resolveFlagAction } from "@/app/admin/questions/flag-actions";

type ResolveFlagFormProps = {
  flagId: string;
};

const initialState = { ok: false, message: "" };

export function ResolveFlagForm({ flagId }: ResolveFlagFormProps) {
  const [state, formAction, isPending] = useActionState(resolveFlagAction, initialState);

  if (state.ok) {
    return (
      <span className="text-xs text-emerald-700">
        {state.message}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <form action={formAction}>
          <input name="flagId" type="hidden" value={flagId} />
          <input name="resolution" type="hidden" value="resolved" />
          <button
            className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            Resolve
          </button>
        </form>
        <form action={formAction}>
          <input name="flagId" type="hidden" value={flagId} />
          <input name="resolution" type="hidden" value="rejected" />
          <button
            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            Reject
          </button>
        </form>
      </div>
      {state.message && !state.ok ? (
        <p className="text-xs text-red-700">{state.message}</p>
      ) : null}
    </div>
  );
}
