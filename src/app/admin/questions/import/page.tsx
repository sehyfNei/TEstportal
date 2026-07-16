import Link from "next/link";
import { EmbeddingIndexCard } from "@/components/admin/embedding-index-card";
import { QuestionImportWizard } from "@/components/admin/question-import-wizard";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ExamOption = {
  id: string;
  name: string;
};

export default async function AdminQuestionImportPage() {
  const exams = await loadExams();

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Question Bank</p>
          <h1 className="mt-2 text-3xl font-semibold">Bulk question import</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Import JSON arrays or CSV rows into draft question records. Every row is validated
            before any database write runs.
          </p>
        </div>
        <Link className="text-sm font-medium text-primary" href="/admin/questions">
          Back to questions
        </Link>
      </div>

      <QuestionImportWizard exams={exams} />

      <EmbeddingIndexCard />
    </section>
  );
}

async function loadExams(): Promise<ExamOption[]> {
  if (!hasSupabaseConfig()) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("exams").select("id,name").order("name");

  return data ?? [];
}
