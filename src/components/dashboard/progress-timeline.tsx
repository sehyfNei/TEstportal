import type { TimelinePoint } from "@/lib/dashboard/timeline";

type Props = {
  points: TimelinePoint[];
};

const CHART_WIDTH = 500;
const CHART_HEIGHT = 100;

const TYPE_COLORS: Record<string, string> = {
  diagnostic: "#3b82f6",
  benchmark: "#a855f7",
  mock: "#a855f7",
  topic: "#22c55e",
  concept_retest: "#f59e0b"
};

export function ProgressTimeline({ points }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Progress</h2>
      <p className="mt-1 text-xs text-muted-foreground">Score % per session</p>

      {points.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          No completed sessions yet. Start a test to build your timeline.
        </p>
      ) : points.length === 1 ? (
        <SinglePoint point={points[0]} />
      ) : (
        <TimelineChart points={points} />
      )}
    </div>
  );
}

function SinglePoint({ point }: { point: TimelinePoint }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-md bg-muted px-3 py-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: colorForType(point.type) }}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium tabular-nums">
          {Math.round(point.scorePercent)}% score
        </p>
        <p className="text-xs text-muted-foreground">Need more sessions for a trend line</p>
      </div>
    </div>
  );
}

function TimelineChart({ points }: { points: TimelinePoint[] }) {
  const chartPoints = points.map((point, index) => toChartPoint(point, index, points.length));
  const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <>
      <div className="mt-4 aspect-[5/1] w-full">
        <svg
          aria-label="Progress timeline chart"
          className="h-full w-full text-primary"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <line
            stroke="#e5e7eb"
            strokeDasharray="3 3"
            strokeWidth="1"
            x1="0"
            x2={CHART_WIDTH}
            y1="50"
            y2="50"
          />
          <polyline fill="none" points={polyline} stroke="currentColor" strokeWidth="2" />
          {chartPoints.map((point) => (
            <circle
              cx={point.x}
              cy={point.y}
              fill={colorForType(point.type)}
              key={point.sessionId}
              r="4"
            >
              <title>
                {point.type}: {Math.round(point.scorePercent)}% on {formatDate(point.createdAt)}
              </title>
            </circle>
          ))}
          <text fill="#6b7280" fontSize="8" x="2" y="10">
            100%
          </text>
          <text fill="#6b7280" fontSize="8" x="2" y="98">
            0%
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <LegendItem color={TYPE_COLORS.diagnostic} label="Diagnostic" />
        <LegendItem color={TYPE_COLORS.topic} label="Topic" />
        <LegendItem color={TYPE_COLORS.concept_retest} label="Retest" />
        <LegendItem color={TYPE_COLORS.benchmark} label="Benchmark" />
      </div>
    </>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function toChartPoint(point: TimelinePoint, index: number, count: number) {
  const x = count <= 1 ? CHART_WIDTH / 2 : (index * CHART_WIDTH) / (count - 1);
  const scorePercent = Math.min(100, Math.max(0, point.scorePercent));
  const y = CHART_HEIGHT - scorePercent;

  return {
    ...point,
    x,
    y
  };
}

function colorForType(type: string): string {
  return TYPE_COLORS[type] ?? "#6b7280";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "unknown date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}
