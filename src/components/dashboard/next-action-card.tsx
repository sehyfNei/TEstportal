import Link from "next/link";
import { computeNextAction } from "@/lib/dashboard/next-action";
import type { DashboardOverview } from "@/lib/dashboard/overview";

type Props = {
  overview: DashboardOverview;
};

export function NextActionCard({ overview }: Props) {
  const action = computeNextAction(overview);
  const isUrgent = action.type === "start_overdue_retest";
  const isRetest =
    action.type === "start_overdue_retest" || action.type === "start_due_retest";

  return (
    <div
      className={`rounded-lg border p-5 ${
        isUrgent
          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <p className="text-xs font-medium uppercase text-muted-foreground">Next step</p>
      <p className="mt-1 text-lg font-semibold">{action.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
      <Link
        className="mt-3 inline-block rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        href={action.href}
      >
        {isRetest ? <>View queue &rarr;</> : <>Start &rarr;</>}
      </Link>
    </div>
  );
}
