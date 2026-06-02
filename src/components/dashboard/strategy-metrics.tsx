import type { StrategyMetrics } from "@/lib/dashboard/overview";

type Props = {
  metrics: StrategyMetrics;
};

export function StrategyMetricsCard({ metrics }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Strategy signals</h2>
      <p className="mt-1 text-xs text-muted-foreground">From your most recent session</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricRow
          label="Negative marks lost"
          value={metrics.negativeMarksLost.toFixed(1)}
          warn={metrics.negativeMarksLost > 0}
        />
        <MetricRow
          label="High-confidence wrong"
          value={String(metrics.highConfidenceWrong)}
          warn={metrics.highConfidenceWrong > 2}
        />
        <MetricRow label="Correct guesses" value={String(metrics.correctGuessed)} />
        <MetricRow label="Total revisits" value={String(metrics.totalRevisits)} />
        <MetricRow label="Time on wrong (s)" value={String(Math.round(metrics.timeOnWrongSec))} />
        <MetricRow
          label="Time on skipped (s)"
          value={String(Math.round(metrics.timeOnSkippedSec))}
        />
      </dl>
    </div>
  );
}

function MetricRow({
  label,
  value,
  warn
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${warn ? "text-amber-600" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
