"use client";

import { useActionState, useEffect, useState } from "react";
import {
  clearWeeklyPledgeAction,
  setWeeklyPledgeAction,
  type WeeklyPledgeActionState
} from "@/app/dashboard/actions";
import {
  MAX_WEEKLY_TARGET,
  MIN_WEEKLY_TARGET,
  type WeeklyPledgeSummary
} from "@/lib/dashboard/weekly-pledge";

const initialState: WeeklyPledgeActionState = { ok: false, message: "" };

export function PledgeCard({ pledge }: { pledge: WeeklyPledgeSummary }) {
  const { target, completed, daysLeftInWeek } = pledge;
  const [editing, setEditing] = useState(target === null);

  if (editing || target === null) {
    return <PledgeEditor defaultTarget={target ?? 3} onDone={() => setEditing(false)} canCancel={target !== null} />;
  }

  const remaining = Math.max(0, target - completed);
  const met = completed >= target;
  const pct = Math.min(100, Math.round((completed / target) * 100));

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Weekly pledge</p>
          <p className="mt-1 text-3xl font-semibold">
            {completed}
            <span className="text-base font-normal text-muted-foreground"> / {target} tests</span>
          </p>
        </div>
        <span aria-hidden className="text-3xl">
          {met ? "🎯" : "📌"}
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {met
          ? "Pledge complete for this week — well done."
          : `${remaining} more to go, with ${daysLeftInWeek} day${daysLeftInWeek === 1 ? "" : "s"} left this week.`}
      </p>

      <button
        className="mt-3 text-xs font-medium text-primary hover:underline"
        onClick={() => setEditing(true)}
        type="button"
      >
        Change target
      </button>
    </div>
  );
}

function PledgeEditor({
  defaultTarget,
  onDone,
  canCancel
}: {
  defaultTarget: number;
  onDone: () => void;
  canCancel: boolean;
}) {
  const [setState, setAction, setPending] = useActionState(setWeeklyPledgeAction, initialState);
  const [clearState, clearAction, clearPending] = useActionState(clearWeeklyPledgeAction, initialState);
  const message = setState.message || clearState.message;

  // The server revalidates /dashboard on success, but this client component's
  // `editing` flag won't reset on its own — close the editor once it lands.
  useEffect(() => {
    if (setState.ok || clearState.ok) {
      onDone();
    }
  }, [setState.ok, clearState.ok, onDone]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <p className="text-sm font-medium text-muted-foreground">Weekly pledge</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Commit to a number of tests each week. Your progress shows here and resets every Monday.
      </p>

      <form action={setAction} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-2 text-sm font-medium">
          Tests per week
          <input
            className="h-11 w-28 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={String(defaultTarget)}
            max={MAX_WEEKLY_TARGET}
            min={MIN_WEEKLY_TARGET}
            name="weeklyTarget"
            required
            type="number"
          />
        </label>
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          disabled={setPending}
          type="submit"
        >
          {setPending ? "Saving..." : "Save pledge"}
        </button>
        {canCancel ? (
          <button
            className="h-11 rounded-md border border-border px-4 text-sm font-medium transition hover:border-primary"
            onClick={onDone}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </form>

      {canCancel ? (
        <form action={clearAction} className="mt-3">
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
            disabled={clearPending}
            type="submit"
          >
            {clearPending ? "Removing..." : "Remove pledge"}
          </button>
        </form>
      ) : null}

      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
