import Link from "next/link";
import { TestCatalog } from "@/components/test/test-catalog";
import { FixedPapers, type FixedPaper } from "@/components/test/fixed-papers";
import type { ExamOption, TopicOption } from "@/components/test/start-test";
import { durationFromConfig, questionIdsFromConfig } from "@/lib/exam/test-template";
import { parseCatalogSearchParams } from "@/lib/tests/catalog";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type TestsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const preselect = parseCatalogSearchParams(resolvedParams);
  const data = await loadTestsPageData();

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Tests</p>
        <h1 className="mt-2 text-3xl font-semibold">Test catalog</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Pick how you want to practice: map your level with a diagnostic, drill a topic, take a timed sectional or
          full mock, or re-attempt your recorded mistakes.
        </p>
      </div>
        <Link className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline" href="/tests/history">
          View test history
        </Link>

      {!data.configured ? (
        <StatusPanel message="Supabase is not configured yet. Add Supabase URL and anon key before starting tests." />
      ) : null}

      {data.loadError ? <StatusPanel message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        <>
          <TestCatalog exams={data.exams} preselect={preselect} topics={data.topics} />
          <FixedPapers papers={data.fixedPapers} />
        </>
      ) : null}
    </section>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

async function loadTestsPageData() {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      exams: [] as ExamOption[],
      topics: [] as TopicOption[],
      fixedPapers: [] as FixedPaper[]
    };
  }

  const supabase = await createClient();
  const [examsResult, topicsResult, papersResult] = await Promise.all([
    supabase.from("exams").select("id,name,slug,description").eq("is_active", true).order("name"),
    supabase.from("topics").select("id,exam_id,name,level,order_index").eq("level", 1).order("order_index"),
    supabase
      .from("test_templates")
      .select("id,exam_id,title,description,config,exams(name)")
      .eq("selection_mode", "fixed")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
  ]);

  return {
    configured: true,
    loadError: examsResult.error?.message ?? topicsResult.error?.message ?? null,
    exams: toExamOptions(examsResult.data),
    topics: toTopicOptions(topicsResult.data),
    fixedPapers: toFixedPapers(papersResult.data)
  };
}

function toFixedPapers(rows: unknown): FixedPaper[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const examId = typeof record.exam_id === "string" ? record.exam_id : "";
      const exam = record.exams as { name?: string } | null;
      const questionCount = questionIdsFromConfig(record.config).length;

      return id && examId && questionCount > 0
        ? {
            id,
            examId,
            examName: exam?.name ?? "Exam",
            title: typeof record.title === "string" ? record.title : "Fixed paper",
            description: typeof record.description === "string" ? record.description : null,
            questionCount,
            durationMinutes: durationFromConfig(record.config)
          }
        : null;
    })
    .filter((paper): paper is FixedPaper => Boolean(paper));
}

function toExamOptions(rows: unknown): ExamOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const name = typeof record.name === "string" ? record.name : "";
      const slug = typeof record.slug === "string" ? record.slug : "";
      const description = typeof record.description === "string" ? record.description : null;

      return id && name && slug ? { description, id, name, slug } : null;
    })
    .filter((row): row is ExamOption => Boolean(row));
}

function toTopicOptions(rows: unknown): TopicOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const examId = typeof record.exam_id === "string" ? record.exam_id : "";
      const name = typeof record.name === "string" ? record.name : "";

      return id && examId && name ? { examId, id, name } : null;
    })
    .filter((row): row is TopicOption => Boolean(row));
}
