import Link from "next/link";
import type { WeakTopic } from "@/lib/dashboard/overview";

type Props = {
  topics: WeakTopic[];
  examId: string;
};

export function WeakTopics({ topics }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Weak topics</h2>

      {topics.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          All weighted topics are on track. Keep practicing.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {topics.map((topic) => (
            <TopicRow key={topic.topicId} topic={topic} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicRow({ topic }: { topic: WeakTopic }) {
  const mastery = Math.round(Math.min(100, Math.max(0, topic.masteryScore)));

  return (
    <li className="grid gap-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium">{topic.topicName}</p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {topic.weightPercent}% weight
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${masteryBarColorClass(mastery)}`}
            style={{ width: `${mastery}%` }}
          />
        </div>
        <p className="w-20 shrink-0 text-right text-xs text-muted-foreground">
          {mastery}% mastered
        </p>
      </div>

      <Link className="w-fit text-xs font-medium text-primary hover:underline" href="/tests">
        Practice &rarr;
      </Link>
    </li>
  );
}

function masteryBarColorClass(mastery: number): string {
  if (mastery >= 70) {
    return "bg-green-500";
  }

  if (mastery >= 40) {
    return "bg-amber-500";
  }

  return "bg-red-500";
}
