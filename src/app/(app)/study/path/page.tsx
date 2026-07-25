import Link from "next/link";
import { LearningPathView } from "@/components/study/learning-path-view";
import {
  computeCurrentWeekNumber,
  groupMilestonesByWeek,
  type PathMilestoneView
} from "@/lib/learning-path/path-view";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Study Path"
};

type PathRow = {
  id: string;
  exam_id: string;
  goal: string;
  target_date: string;
  overall_progress_percent: number | string | null;
  created_at: string;
};

type MilestoneRow = {
  topic_id: string;
  week_number: number;
  target_mastery: number | string;
  completed_at: string | null;
};

type TopicRow = { id: string; name: string };
type MasteryRow = { topic_id: string | null; mastery_score: number | string | null };

export default async function StudyPathPage() {
  if (!hasSupabaseConfig()) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Notice message="Supabase is not configured. Add environment variables to enable learning paths." />
      </section>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Notice message="Sign in to view your study path." />
      </section>
    );
  }

  const { data: pathData } = await supabase
    .from("learning_paths")
    .select("id,exam_id,goal,target_date,overall_progress_percent,created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const path = pathData as PathRow | null;

  if (!path) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <EmptyState />
      </section>
    );
  }

  const [examResult, milestonesResult, masteryResult] = await Promise.all([
    supabase.from("exams").select("name").eq("id", path.exam_id).maybeSingle(),
    supabase
      .from("path_milestones")
      .select("topic_id,week_number,target_mastery,completed_at")
      .eq("path_id", path.id),
    supabase.from("mastery_records").select("topic_id,mastery_score").eq("user_id", user.id).eq("exam_id", path.exam_id)
  ]);

  const milestoneRows = (milestonesResult.data ?? []) as MilestoneRow[];
  const topicIds = [...new Set(milestoneRows.map((row) => row.topic_id))];
  const topicsResult = topicIds.length
    ? await supabase.from("topics").select("id,name").in("id", topicIds)
    : { data: [] as TopicRow[] };

  const topicNameById = new Map(((topicsResult.data ?? []) as TopicRow[]).map((topic) => [topic.id, topic.name]));
  const masteryByTopicId = new Map<string, number>();
  for (const row of (masteryResult.data ?? []) as MasteryRow[]) {
    if (row.topic_id) {
      masteryByTopicId.set(row.topic_id, toNumber(row.mastery_score));
    }
  }

  const milestones: PathMilestoneView[] = milestoneRows.map((row) => ({
    topicId: row.topic_id,
    topicName: topicNameById.get(row.topic_id) ?? "Topic",
    weekNumber: row.week_number,
    targetMastery: toNumber(row.target_mastery),
    currentMastery: masteryByTopicId.get(row.topic_id) ?? 0,
    completed: row.completed_at !== null
  }));

  const maxWeek = milestones.reduce((max, milestone) => Math.max(max, milestone.weekNumber), 0);
  const currentWeekNumber = computeCurrentWeekNumber(path.created_at, new Date(), maxWeek);
  const weeks = groupMilestonesByWeek(milestones, currentWeekNumber);

  return (
    <section className="grid gap-6">
      <PageHeader />
      <LearningPathView
        examName={(examResult.data as { name: string } | null)?.name ?? "Exam"}
        goal={path.goal}
        targetDate={path.target_date}
        overallProgressPercent={toNumber(path.overall_progress_percent)}
        weeks={weeks}
      />
    </section>
  );
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Learning Path</p>
      <h1 className="mt-2 text-3xl font-semibold">Your study path</h1>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
      <h2 className="text-lg font-semibold">No active study plan yet</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Set a goal and target date, and we&apos;ll turn your weak topics into a week-by-week plan.
      </p>
      <Link
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        href="/study/path/new"
      >
        Set your goal &rarr;
      </Link>
    </div>
  );
}
