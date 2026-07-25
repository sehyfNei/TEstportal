import Link from "next/link";
import type { PathMilestoneView, WeekGroup } from "@/lib/learning-path/path-view";

type Props = {
  examName: string;
  goal: string;
  targetDate: string;
  overallProgressPercent: number | null;
  weeks: WeekGroup[];
};

export function LearningPathView({ examName, goal, targetDate, overallProgressPercent, weeks }: Props) {
  const progress = Math.round(Math.min(100, Math.max(0, overallProgressPercent ?? 0)));

  return (
    <div className="grid gap-6">
      <div className="rounded-xl border border-border bg-card shadow-card p-5">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {examName} &middot; Target {formatDate(targetDate)}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{goal}</h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <span className="shrink-0 text-sm font-medium text-muted-foreground">{progress}% complete</span>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          Your plan is being generated &mdash; check back in a minute.
        </div>
      ) : (
        <div className="grid gap-4">
          {weeks.map((week) => (
            <WeekCard key={week.weekNumber} week={week} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekCard({ week }: { week: WeekGroup }) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-card ${
        week.isCurrentWeek ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Week {week.weekNumber}</h3>
        {week.isCurrentWeek ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            This week
          </span>
        ) : null}
      </div>

      <ul className="mt-3 grid gap-3">
        {week.milestones.map((milestone) => (
          <MilestoneRow key={milestone.topicId} milestone={milestone} />
        ))}
      </ul>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: PathMilestoneView }) {
  const current = Math.round(Math.min(100, Math.max(0, milestone.currentMastery)));
  const target = Math.round(milestone.targetMastery);

  return (
    <li className={milestone.completed ? "grid gap-2 opacity-60" : "grid gap-2"}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-medium">{milestone.topicName}</p>
        {milestone.completed ? (
          <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600">
            Done
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            {current}% / {target}% target
          </span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${milestone.completed ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${current}%` }}
        />
      </div>
      {!milestone.completed ? (
        <Link className="text-xs font-medium text-primary hover:underline" href="/tests">
          Practice &rarr;
        </Link>
      ) : null}
    </li>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
