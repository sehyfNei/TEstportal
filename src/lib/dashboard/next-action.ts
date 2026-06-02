import type { DashboardOverview } from "@/lib/dashboard/overview";

export type ActionType =
  | "start_overdue_retest"
  | "start_due_retest"
  | "practice_weak_topic"
  | "take_diagnostic"
  | "keep_practicing";

export type NextAction = {
  type: ActionType;
  title: string;
  description: string;
  href: string;
};

export type NextActionInput = Pick<
  DashboardOverview,
  "overdueRetestCount" | "dueRetests" | "weakTopics" | "readiness"
>;

export function computeNextAction(overview: NextActionInput): NextAction {
  if (overview.overdueRetestCount > 0) {
    return {
      type: "start_overdue_retest",
      title: `${overview.overdueRetestCount} overdue ${pluralizeRetest(
        overview.overdueRetestCount
      )} - start now`,
      description: "Past due - address before they compound",
      href: "#due-retests"
    };
  }

  if (overview.dueRetests.length > 0) {
    return {
      type: "start_due_retest",
      title: `${overview.dueRetests.length} ${pluralizeRetest(
        overview.dueRetests.length
      )} due - keep the streak`,
      description: "On schedule",
      href: "#due-retests"
    };
  }

  if (overview.weakTopics.length > 0) {
    const topic = overview.weakTopics[0];

    return {
      type: "practice_weak_topic",
      title: `Practice ${topic.topicName}`,
      description: `${topic.masteryScore.toFixed(0)}% mastery - highest priority topic`,
      href: "/tests"
    };
  }

  if (!overview.readiness.hasBenchmarkSession) {
    return {
      type: "take_diagnostic",
      title: "Take a diagnostic test",
      description: "Establish your baseline readiness score",
      href: "/tests"
    };
  }

  return {
    type: "keep_practicing",
    title: "Keep practicing",
    description: "All topics covered - steady progress",
    href: "/tests"
  };
}

function pluralizeRetest(count: number): string {
  return count === 1 ? "retest" : "retests";
}
