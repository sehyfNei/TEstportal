"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startSessionAction, type StartSessionActionState } from "@/app/test/actions";
import { buildTestSessionHref, type TestExperience } from "@/lib/test-session/experience";

export type FixedPaper = {
  id: string;
  examId: string;
  examName: string;
  title: string;
  description: string | null;
  questionCount: number;
  durationMinutes: number | null;
};

const initialState: StartSessionActionState = { ok: false, message: "" };

export function FixedPapers({ experience, papers }: { experience: TestExperience; papers: FixedPaper[] }) {
  if (papers.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Fixed papers</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Curated papers with a set list of questions — everyone sits the same test, in the same order.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {papers.map((paper) => (
          <FixedPaperCard experience={experience} key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}

function FixedPaperCard({ experience, paper }: { experience: TestExperience; paper: FixedPaper }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(startSessionAction, initialState);

  useEffect(() => {
    if (state.ok && state.sessionId) {
      router.push(buildTestSessionHref(state.sessionId, experience));
    }
  }, [experience, router, state.ok, state.sessionId]);

  return (
    <form
      action={formAction}
      className="flex h-full flex-col justify-between gap-4 rounded-xl border border-border bg-card shadow-card p-5"
    >
      <div>
        <h3 className="text-base font-semibold">{paper.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {paper.examName} · {paper.questionCount} question{paper.questionCount === 1 ? "" : "s"}
          {paper.durationMinutes ? ` · ${paper.durationMinutes} min` : ""}
        </p>
        {paper.description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{paper.description}</p>
        ) : null}
      </div>

      <input name="type" type="hidden" value="benchmark" />
      <input name="experience" type="hidden" value={experience} />
      <input name="examId" type="hidden" value={paper.examId} />
      <input name="templateId" type="hidden" value={paper.id} />
      <input name="count" type="hidden" value={String(paper.questionCount)} />
      <input name="minQualityTier" type="hidden" value="bronze" />
      {paper.durationMinutes ? (
        <input name="durationMinutes" type="hidden" value={String(paper.durationMinutes)} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Starting..." : "Start paper"}
        </button>
        {state.message && !state.ok ? (
          <p className="text-sm text-muted-foreground">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
