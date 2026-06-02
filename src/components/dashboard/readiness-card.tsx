import type { ReadinessScore } from "@/lib/scoring/readiness";

type Props = {
  readiness: ReadinessScore;
};

export function ReadinessCard({ readiness }: Props) {
  const score = Math.round(readiness.score);
  const coverage = Math.round(readiness.coveragePercent * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Readiness score</h2>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className={`text-5xl font-bold tabular-nums ${scoreColorClass(score)}`}>{score}</p>
        <p className="mb-1 text-sm text-muted-foreground">/ 100</p>
        <ConfidenceBadge level={readiness.confidenceLevel} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{coverage}% of topics covered</p>

      {readiness.staleTopicIds.length > 0 ? (
        <p className="mt-2 text-sm text-amber-600">
          {readiness.staleTopicIds.length} topic
          {readiness.staleTopicIds.length === 1 ? "" : "s"} not reviewed recently; score may
          be conservative.
        </p>
      ) : null}

      {!readiness.hasBenchmarkSession ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Take a benchmark test to calibrate your score more accurately.
        </p>
      ) : null}
    </div>
  );
}

function scoreColorClass(score: number): string {
  if (score >= 70) {
    return "text-green-600";
  }

  if (score >= 40) {
    return "text-amber-600";
  }

  return "text-red-600";
}

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles: Record<typeof level, string> = {
    low: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-green-100 text-green-700"
  };

  return (
    <span
      className={`mb-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[level]}`}
    >
      {level} confidence
    </span>
  );
}
