"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startSessionAction, type StartSessionActionState } from "@/app/test/actions";

type ExamOption = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
};

const initialState: StartSessionActionState = {
  ok: false,
  message: ""
};

export function StartTest({ exams }: { exams: ExamOption[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(startSessionAction, initialState);

  useEffect(() => {
    if (state.ok && state.sessionId) {
      router.push(`/tests/${state.sessionId}`);
    }
  }, [router, state.ok, state.sessionId]);

  return (
    <form action={formAction} className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-5">
      <div>
        <h2 className="text-xl font-semibold">Start a test</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose an active exam and start a short practice session from live questions.
        </p>
      </div>

      <input name="type" type="hidden" value="diagnostic" />

      <label className="grid gap-2 text-sm font-medium">
        Exam
        <select
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          disabled={isPending || !exams.length}
          name="examId"
          required
        >
          <option value="">Select exam</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({exam.slug})
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Questions
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue="10"
            min="1"
            max="100"
            name="count"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Minutes
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue="30"
            min="1"
            name="durationMinutes"
            type="number"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !exams.length}
          type="submit"
        >
          {isPending ? "Starting..." : "Start test"}
        </button>
        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-primary" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
