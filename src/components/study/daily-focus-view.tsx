"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setConceptsPerDayAction,
  startLadderAction,
  type SetConceptsPerDayState,
  type StartLadderState
} from "@/app/(app)/study/today/actions";
import type { DailyFocusView as DailyFocusData, FocusTopic } from "@/lib/dashboard/load-daily-focus";

const initialLadderState: StartLadderState = { ok: false, message: "" };
const initialSettingsState: SetConceptsPerDayState = { ok: false, message: "" };

export function DailyFocusView({ examId, focus }: { examId: string; focus: DailyFocusData }) {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Today</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {focus.topics.length} topic{focus.topics.length === 1 ? "" : "s"} to lock in today
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {focus.daysToExam !== null
            ? `${focus.daysToExam} day${focus.daysToExam === 1 ? "" : "s"} to your exam.`
            : "Set a target date on your study path to size this list against the calendar."}
        </p>
      </div>

      <ConceptsPerDayControl conceptsPerDay={focus.conceptsPerDay} examId={examId} />

      {focus.topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          Nothing weak enough to flag right now - keep taking tests and this list will fill in as real gaps show up.
        </div>
      ) : (
        <div className="grid gap-4">
          {focus.topics.map((topic) => (
            <FocusTopicCard examId={examId} key={topic.topicId} topic={topic} />
          ))}
        </div>
      )}
    </section>
  );
}

function ConceptsPerDayControl({ examId, conceptsPerDay }: { examId: string; conceptsPerDay: number }) {
  const [state, formAction, isPending] = useActionState<SetConceptsPerDayState, FormData>(
    setConceptsPerDayAction,
    initialSettingsState
  );
  const [value, setValue] = useState(conceptsPerDay);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
      <input name="examId" type="hidden" value={examId} />
      <label className="flex items-center gap-3 text-sm font-medium" htmlFor="conceptsPerDay">
        Topics / day
        <input
          className="accent-primary"
          id="conceptsPerDay"
          max={8}
          min={1}
          name="conceptsPerDay"
          onChange={(event) => setValue(Number(event.target.value))}
          type="range"
          value={value}
        />
        <span className="font-mono">{value}</span>
      </label>
      <button
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
        disabled={isPending || value === conceptsPerDay}
        type="submit"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-muted-foreground" : "text-red-600"}`}>{state.message}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Suggested from your days left and pace - drag to change.</p>
      )}
    </form>
  );
}

function FocusTopicCard({ examId, topic }: { examId: string; topic: FocusTopic }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<StartLadderState, FormData>(startLadderAction, initialLadderState);

  useEffect(() => {
    if (state.ok && state.sessionId) {
      router.push(`/tests/${state.sessionId}`);
    }
  }, [router, state.ok, state.sessionId]);

  const ladder = topic.ladder;
  const isMastered = Boolean(ladder?.completedAt);
  const rungsCorrect = ladder?.rungsCorrect ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {Math.round(topic.masteryScore)}% mastery &middot; priority {topic.priority.toFixed(1)}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{topic.topicName}</h2>
        </div>
        <StatePill isMastered={isMastered} rungsAttempted={ladder?.rungsAttempted ?? 0} />
      </div>

      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            className={`h-2 w-7 rounded-full ${index < rungsCorrect ? "bg-primary" : "bg-muted"}`}
            key={index}
          />
        ))}
      </div>

      {isMastered ? (
        <p className="mt-4 text-xs font-medium text-amber-600">
          Mastered - a quick revision check will come back to this automatically in a few weeks.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium"
            href={`/study/chat?examId=${examId}&topicId=${topic.topicId}`}
          >
            Learn
          </Link>
          <form action={formAction}>
            <input name="examId" type="hidden" value={examId} />
            <input name="topicId" type="hidden" value={topic.topicId} />
            <button
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Starting..." : rungsCorrect > 0 ? "Continue practice" : "Practice"}
            </button>
          </form>
        </div>
      )}

      {!state.ok && state.message ? <p className="mt-2 text-xs text-red-600">{state.message}</p> : null}
    </div>
  );
}

function StatePill({ isMastered, rungsAttempted }: { isMastered: boolean; rungsAttempted: number }) {
  if (isMastered) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Mastered</span>
    );
  }

  if (rungsAttempted > 0) {
    return (
      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        Practicing {rungsAttempted}/5
      </span>
    );
  }

  return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Not started</span>;
}
