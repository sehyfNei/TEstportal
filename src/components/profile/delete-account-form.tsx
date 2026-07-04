"use client";

import { useActionState, useState } from "react";
import {
  deleteAccountAction,
  type ProfileActionState
} from "@/app/(app)/profile/actions";
import { cn } from "@/lib/utils";

const initialState: ProfileActionState = {
  ok: true,
  message: ""
};

export function DeleteAccountForm() {
  const [confirmation, setConfirmation] = useState("");
  const [state, formAction, isPending] = useActionState(deleteAccountAction, initialState);
  const canSubmit = confirmation === "DELETE" && !isPending;

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This permanently deletes your account and user-owned study data.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Type DELETE to confirm
        <input
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-destructive"
          name="confirmation"
          onChange={(event) => setConfirmation(event.currentTarget.value)}
          value={confirmation}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSubmit}
          type="submit"
        >
          {isPending ? "Deleting..." : "Delete account"}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function ActionMessage({ state }: { state: ProfileActionState }) {
  if (!state.message) {
    return null;
  }

  return (
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
  );
}
