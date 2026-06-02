import { StartTest } from "@/components/test/start-test";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ExamOption = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
};

export default async function TestsPage() {
  const data = await loadTestsPageData();

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Tests</p>
        <h1 className="mt-2 text-3xl font-semibold">Start practice</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Start a timed session from the live practice pool, answer one question at a time, and submit for an inline
          score.
        </p>
      </div>

      {!data.configured ? (
        <StatusPanel message="Supabase is not configured yet. Add Supabase URL and anon key before starting tests." />
      ) : null}

      {data.loadError ? <StatusPanel message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <StartTest exams={data.exams} />

          <aside className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Available exams</h2>
            {data.exams.length ? (
              <div className="mt-4 grid gap-3">
                {data.exams.map((exam) => (
                  <div className="rounded-md border border-border bg-background p-3" key={exam.id}>
                    <p className="text-sm font-semibold">{exam.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{exam.slug}</p>
                    {exam.description ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{exam.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">No active exams are visible yet.</p>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

async function loadTestsPageData() {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      exams: []
    };
  }

  const supabase = await createClient();
  const examsResult = await supabase
    .from("exams")
    .select("id,name,slug,description")
    .eq("is_active", true)
    .order("name");

  return {
    configured: true,
    loadError: examsResult.error?.message ?? null,
    exams: toExamOptions(examsResult.data)
  };
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
