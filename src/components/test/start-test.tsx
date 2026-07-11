"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startSessionAction, type StartSessionActionState } from "@/app/test/actions";
import type { TestMode } from "@/lib/tests/catalog";

export type ExamOption = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
};

export type TopicOption = {
  examId: string;
  id: string;
  name: string;
};

const initialState: StartSessionActionState = {
  ok: false,
  message: ""
};

type StartTestProps = {
  exams: ExamOption[];
  topics: TopicOption[];
  mode: TestMode;
  initialTopicId: string | null;
};

export function StartTest({ exams, topics, mode, initialTopicId }: StartTestProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(startSessionAction, initialState);
  const [examId, setExamId] = useState(exams.length === 1 ? exams[0].id : "");

  useEffect(() => {
    if (state.ok && state.sessionId) {
      router.push(`/tests/${state.sessionId}`);
    }
  }, [router, state.ok, state.sessionId]);

  const examTopics = topics.filter((topic) => topic.examId === examId);

  return (
    <form action={formAction} className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-5">
      <div>
        <h2 className="text-xl font-semibold">{mode.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode.description}</p>
      </div>

      <input name="type" type="hidden" value={mode.sessionType} />
      <input name="minQualityTier" type="hidden" value={mode.minQualityTier} />

      <label className="grid gap-2 text-sm font-medium">
        Exam
        <select
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          disabled={isPending || !exams.length}
          name="examId"
          onChange={(event) => setExamId(event.target.value)}
          required
          value={examId}
        >
          <option value="">Select exam</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({exam.slug})
            </option>
          ))}
        </select>
      </label>

      {mode.requiresTopic ? (
        <label className="grid gap-2 text-sm font-medium">
          Topic
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={initialTopicId ?? ""}
            disabled={isPending || !examId}
            name="topicId"
            required
          >
            <option value="">{examId ? "Select topic" : "Select exam first"}</option>
            {examTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Questions
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={String(mode.defaultCount)}
            min="1"
            max="100"
            name="count"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Minutes {mode.defaultDurationMinutes === null ? "(optional)" : ""}
          <input
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={mode.defaultDurationMinutes === null ? "" : String(mode.defaultDurationMinutes)}
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
          {isPending ? "Starting..." : `Start ${mode.title.toLowerCase()}`}
        </button>
        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-primary" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
