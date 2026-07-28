import Link from "next/link";

export function TodayFocusCta({ examId }: { examId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">See today&apos;s focus</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            A sized daily list, gated on a 5-question basic-to-hard ladder per topic.
          </p>
        </div>
        <Link
          className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
          href={`/study/today?exam=${examId}`}
        >
          Open today &rarr;
        </Link>
      </div>
    </div>
  );
}
