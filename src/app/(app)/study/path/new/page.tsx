import { redirect } from "next/navigation";
import { LearningPathWizard } from "@/components/study/learning-path-wizard";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Set your goal"
};

type SearchParams = { examId?: string | string[] };
type Exam = { id: string; name: string };

export default async function LearningPathWizardPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

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
    redirect("/login?redirectTo=/study/path/new");
  }

  const { data: examRows } = await supabase.from("exams").select("id,name").eq("is_active", true).order("name");
  const exams = toExams(examRows);
  const examId = firstParam(params.examId);
  const initialExamId = examId && exams.some((exam) => exam.id === examId) ? examId : null;

  if (exams.length === 0) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Notice message="No active exams found. Import an exam manifest from the admin panel to get started." />
      </section>
    );
  }

  return (
    <section className="grid max-w-xl gap-6">
      <PageHeader />
      <LearningPathWizard exams={exams} initialExamId={initialExamId} />
    </section>
  );
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function toExams(rows: unknown): Exam[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      name: typeof row.name === "string" ? row.name : ""
    }))
    .filter((exam) => exam.id && exam.name);
}

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Learning Path</p>
      <h1 className="mt-2 text-3xl font-semibold">Set your goal</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Tell us what you&apos;re preparing for and when, and we&apos;ll turn your weak topics into a
        week-by-week plan.
      </p>
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
