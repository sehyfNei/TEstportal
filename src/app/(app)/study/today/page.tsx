import { DailyFocusView } from "@/components/study/daily-focus-view";
import { loadDailyFocus, type DailyFocusView as DailyFocusData } from "@/lib/dashboard/load-daily-focus";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Today's Focus"
};

type Exam = { id: string; name: string };

type PageData =
  | { configured: false }
  | { configured: true; authed: false }
  | { configured: true; authed: true; examId: null }
  | { configured: true; authed: true; examId: string; focus: DailyFocusData };

export default async function TodayPage({
  searchParams
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examParam } = await searchParams;
  const data = await loadPageData(examParam);

  if (!data.configured) {
    return <Notice message="Supabase is not configured. Add environment variables to enable this page." />;
  }

  if (!data.authed) {
    return <Notice message="Sign in to see today's focus." />;
  }

  if (!data.examId) {
    return <Notice message="No active exams found. Import an exam manifest from the admin panel to get started." />;
  }

  return <DailyFocusView examId={data.examId} focus={data.focus} />;
}

async function loadPageData(examParam: string | undefined): Promise<PageData> {
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
    .select("id,name")
    .eq("is_active", true)
    .order("name");

  const exams = toExams(examRows);

  if (exams.length === 0) {
    return { configured: true, authed: true, examId: null };
  }

  const examId = examParam && exams.some((exam) => exam.id === examParam) ? examParam : exams[0].id;
  const focus = await loadDailyFocus(supabase, user.id, examId);

  return { configured: true, authed: true, examId, focus };
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

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}
