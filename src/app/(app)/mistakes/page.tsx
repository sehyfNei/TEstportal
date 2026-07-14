import Link from "next/link";
import { MistakeItemRow } from "@/components/mistakes/mistake-item-row";
import {
  fetchMistakeDetails,
  fetchMistakeItems,
  MISTAKE_TYPE_LABELS,
  type MistakeAnswerView
} from "@/lib/mistakes/mistake-list";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Exam = { id: string; name: string; slug: string };

export default async function MistakesPage({
  searchParams
}: {
  searchParams: Promise<{ exam?: string; status?: string; type?: string }>;
}) {
  const params = await searchParams;
  const examParam = params.exam;
  const statusParam = params.status ?? "unresolved";
  const typeParam = params.type;

  const data = await loadMistakesData(examParam, statusParam, typeParam);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Mistake Notebook" />
        <Notice message="Supabase is not configured. Add environment variables to enable the mistake notebook." />
      </section>
    );
  }

  if (!data.authed) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Mistake Notebook" />
        <Notice message="Sign in to view your mistake notebook." />
      </section>
    );
  }

  if (!data.examId || data.exams.length === 0) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Mistake Notebook" />
        <Notice message="No active exams found. Import an exam manifest from the admin panel to get started." />
      </section>
    );
  }

  const { examId, exams, mistakes } = data;
  const currentExam = exams.find((exam) => exam.id === examId) ?? exams[0];

  // Group mistakes by topicName
  const groupedMistakes = new Map<string, typeof mistakes>();
  mistakes.forEach((m) => {
    const topic = m.topicName ?? "Unsorted";
    if (!groupedMistakes.has(topic)) {
      groupedMistakes.set(topic, []);
    }
    groupedMistakes.get(topic)!.push(m);
  });

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Mistake Notebook</p>
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
                href={`/mistakes?exam=${exam.id}&status=${statusParam}${typeParam ? `&type=${typeParam}` : ""}`}
                key={exam.id}
              >
                {exam.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* Filter controls */}
      <div className="rounded-xl border border-border bg-card shadow-card p-5 grid gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Status</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { id: "unresolved", label: "Unresolved" },
              { id: "reviewed", label: "Reviewed" },
              { id: "resolved", label: "Resolved" },
              { id: "ignored", label: "Ignored" },
              { id: "all", label: "All Statuses" }
            ].map((s) => {
              const isActive = statusParam === s.id;
              const href = `/mistakes?exam=${examId}&status=${s.id}${typeParam ? `&type=${typeParam}` : ""}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border transition ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Mistake Type</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/mistakes?exam=${examId}&status=${statusParam}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium border transition ${
                !typeParam
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              All Types
            </Link>
            {Object.entries(MISTAKE_TYPE_LABELS).map(([typeKey, typeLabel]) => {
              const isActive = typeParam === typeKey;
              const href = `/mistakes?exam=${examId}&status=${statusParam}&type=${typeKey}`;
              return (
                <Link
                  key={typeKey}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border transition ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {typeLabel}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mistakes list grouped by topic */}
      {mistakes.length === 0 ? (
        <Notice message="No mistakes here yet — take a diagnostic or practice test and your missed questions will show up for review." />
      ) : (
        <div className="grid gap-6">
          {Array.from(groupedMistakes.entries()).map(([topicName, items]) => (
            <div key={topicName} className="rounded-xl border border-border bg-card shadow-card p-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 mb-4">
                {topicName}
              </h2>
              <ul className="grid gap-4">
                {items.map((mistake) => (
                  <MistakeItemRow
                    answerView={data.answerViews.get(mistake.id) ?? null}
                    key={mistake.id}
                    mistake={mistake}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type MistakesData =
  | { configured: false }
  | { configured: true; authed: false }
  | { configured: true; authed: true; examId: null; exams: Exam[] }
  | {
      configured: true;
      authed: true;
      examId: string;
      exams: Exam[];
      mistakes: Awaited<ReturnType<typeof fetchMistakeItems>>;
      answerViews: Map<string, MistakeAnswerView>;
    };

async function loadMistakesData(
  examParam: string | undefined,
  statusParam: string,
  typeParam: string | undefined
): Promise<MistakesData> {
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

  const mistakes = await fetchMistakeItems(supabase, user.id, examId, {
    status: statusParam === "all" ? undefined : statusParam,
    mistakeType: typeParam
  });
  const answerViews = await fetchMistakeDetails(
    supabase,
    mistakes.map((mistake) => mistake.id)
  );

  return { configured: true, authed: true, examId, exams, mistakes, answerViews };
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
      <p className="text-sm font-medium text-primary">Mistake Notebook</p>
      <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
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
