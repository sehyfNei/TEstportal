import Link from "next/link";
import { DueRetests } from "@/components/dashboard/due-retests";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { StrategyMetricsCard } from "@/components/dashboard/strategy-metrics";
import { WeakTopics } from "@/components/dashboard/weak-topics";
import { fetchDashboardOverview } from "@/lib/dashboard/overview";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Exam = { id: string; name: string; slug: string };

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examParam } = await searchParams;
  const data = await loadDashboardData(examParam);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Dashboard" />
        <Notice message="Supabase is not configured. Add environment variables to enable the dashboard." />
      </section>
    );
  }

  if (!data.authed) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Dashboard" />
        <Notice message="Sign in to view your dashboard." />
      </section>
    );
  }

  if (!data.examId || data.exams.length === 0) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Dashboard" />
        <Notice message="No active exams found. Import an exam manifest from the admin panel to get started." />
      </section>
    );
  }

  const { examId, exams, overview } = data;
  const currentExam = exams.find((exam) => exam.id === examId) ?? exams[0];

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">{currentExam.name}</h1>
        {exams.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {exams.map((exam) => (
              <Link
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  exam.id === examId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                href={`/dashboard?exam=${exam.id}`}
                key={exam.id}
              >
                {exam.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReadinessCard readiness={overview.readiness} />
        <WeakTopics examId={examId} topics={overview.weakTopics} />
      </div>

      <DueRetests examId={examId} retests={overview.dueRetests} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatChip href="/tests" label="Due retests" value={overview.overdueRetestCount} />
        <StatChip label="Unresolved mistakes" value={overview.unresolvedMistakeCount} />
        <StatChip href="/tests" label="Recent sessions" value={overview.recentSessions.length} />
      </div>

      {overview.strategyMetrics !== null ? (
        <StrategyMetricsCard metrics={overview.strategyMetrics} />
      ) : null}
    </section>
  );
}

type DashboardData =
  | { configured: false }
  | { configured: true; authed: false }
  | { configured: true; authed: true; examId: null; exams: Exam[] }
  | {
      configured: true;
      authed: true;
      examId: string;
      exams: Exam[];
      overview: Awaited<ReturnType<typeof fetchDashboardOverview>>;
    };

async function loadDashboardData(examParam: string | undefined): Promise<DashboardData> {
  if (!hasSupabaseConfig()) {
    return { configured: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { configured: true, authed: false };
  }

  const { data: examRows } = await supabase
    .from("exams")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");

  const exams = toExams(examRows);
  if (exams.length === 0) {
    return { configured: true, authed: true, examId: null, exams };
  }

  const examId = isValidExamId(examParam, exams) ? examParam : exams[0].id;
  const overview = await fetchDashboardOverview(supabase, user.id, examId);

  return { configured: true, authed: true, examId, exams, overview };
}

function isValidExamId(param: string | undefined, exams: Exam[]): param is string {
  return Boolean(param && exams.some((exam) => exam.id === param));
}

function toExams(rows: unknown): Exam[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      name: typeof row.name === "string" ? row.name : "",
      slug: typeof row.slug === "string" ? row.slug : ""
    }))
    .filter((exam) => exam.id && exam.name);
}

function PageHeader({ title }: { title: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Dashboard</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

function StatChip({
  href,
  label,
  value
}: {
  href?: string;
  label: string;
  value: number;
}) {
  const content = (
    <>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </>
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      {href ? (
        <Link className="block" href={href}>
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
