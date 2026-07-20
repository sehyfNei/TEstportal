import { SourceManager } from "@/components/admin/source-manager";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ExamOption = { id: string; name: string };

type SourceRow = {
  id: string;
  title: string;
  source_type: string;
  body_text: string;
  created_at: string;
  exams?: { name?: string | null } | null;
};

export default async function AdminSourcesPage() {
  const [exams, sources] = await Promise.all([loadExams(), loadSources()]);

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Question Bank</p>
        <h1 className="mt-2 text-3xl font-semibold">Source library</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Add past-year papers, articles, or notes here, then pick one on the Generate screen to ground
          AI-written questions in it — the source stays recorded on every question it produces.
        </p>
      </div>

      {!hasSupabaseConfig() ? (
        <Notice message="Supabase is not configured yet. Add Supabase URL and anon key first." />
      ) : (
        <>
          <SourceManager exams={exams} />

          <div className="grid gap-3">
            <h2 className="text-lg font-semibold">Existing sources</h2>
            {sources.length ? (
              sources.map((source) => (
                <article className="rounded-xl border border-border bg-card shadow-card p-4" key={source.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {source.exams?.name ?? "Unknown exam"} · {source.source_type.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold">{source.title}</h3>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(source.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {source.body_text.length.toLocaleString()} characters
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
                No sources yet.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

async function loadExams(): Promise<ExamOption[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase.from("exams").select("id,name").eq("is_active", true).order("name");

  return (data ?? []) as ExamOption[];
}

async function loadSources(): Promise<SourceRow[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("question_sources")
    .select("id,title,source_type,body_text,created_at,exams(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as SourceRow[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}
