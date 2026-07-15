import {
  TemplateManager,
  type TemplateExamOption,
  type TemplateSummary
} from "@/components/admin/template-manager";
import { durationFromConfig, questionIdsFromConfig } from "@/lib/exam/test-template";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTemplatesPage() {
  const data = await loadTemplatesData();

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Content Ops</p>
        <h1 className="mt-2 text-3xl font-semibold">Fixed test papers</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Compose a named paper by hand-picking specific questions in a fixed order. Every student who
          starts an active paper gets exactly the same questions in the same order — ideal for shared
          benchmarks and mock tests.
        </p>
      </div>

      {!data.configured ? (
        <Notice message="Supabase is not configured yet. Add Supabase URL and anon key before authoring papers." />
      ) : null}

      {data.loadError ? <Notice message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        <TemplateManager exams={data.exams} templates={data.templates} />
      ) : null}
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

async function loadTemplatesData() {
  if (!hasSupabaseConfig()) {
    return { configured: false, loadError: null, exams: [], templates: [] };
  }

  const supabase = await createClient();
  const [examsResult, templatesResult] = await Promise.all([
    supabase.from("exams").select("id,name,slug").eq("is_active", true).order("name"),
    supabase
      .from("test_templates")
      .select("id,exam_id,title,description,is_active,config,exams(name)")
      .eq("selection_mode", "fixed")
      .order("updated_at", { ascending: false })
  ]);

  const loadError = examsResult.error?.message ?? templatesResult.error?.message ?? null;

  const exams: TemplateExamOption[] = (examsResult.data ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        id: String(record.id ?? ""),
        name: String(record.name ?? ""),
        slug: String(record.slug ?? "")
      };
    })
    .filter((exam) => exam.id && exam.name);

  const templates: TemplateSummary[] = (templatesResult.data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const exam = record.exams as { name?: string } | null;
    const questionIds = questionIdsFromConfig(record.config);
    return {
      id: String(record.id),
      examId: String(record.exam_id),
      examName: exam?.name ?? "Unknown exam",
      title: String(record.title ?? "Untitled paper"),
      description: typeof record.description === "string" ? record.description : null,
      isActive: Boolean(record.is_active),
      questionIds,
      questionCount: questionIds.length,
      durationMinutes: durationFromConfig(record.config)
    };
  });

  return { configured: true, loadError, exams, templates };
}
