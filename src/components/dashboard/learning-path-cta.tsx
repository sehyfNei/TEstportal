import Link from "next/link";

export function LearningPathCta({ examId }: { examId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">No study plan set for this exam</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Set a goal and target date for a week-by-week AI-generated plan.
          </p>
        </div>
        <Link
          className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          href={`/study/path/new?examId=${examId}`}
        >
          Set a goal &rarr;
        </Link>
      </div>
    </div>
  );
}
