import type { StreakSummary } from "@/lib/dashboard/streaks";

export function StreakCard({ streak }: { streak: StreakSummary }) {
  const { current, longest } = streak;
  const message = streakMessage(current);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Practice streak</p>
          <p className="mt-1 text-3xl font-semibold">
            {current} <span className="text-base font-normal text-muted-foreground">day{current === 1 ? "" : "s"}</span>
          </p>
        </div>
        <span aria-hidden className="text-3xl">
          {current > 0 ? "🔥" : "🌱"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Longest streak: {longest} day{longest === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function streakMessage(current: number): string {
  if (current === 0) {
    return "Finish a test today to start a new streak.";
  }

  if (current === 1) {
    return "Nice start — come back tomorrow to keep it going.";
  }

  return `${current} days in a row. Take a test today to keep the streak alive.`;
}
