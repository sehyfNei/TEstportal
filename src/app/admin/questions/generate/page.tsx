import Link from "next/link";
import { QuestionGenerator } from "@/components/admin/question-generator";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type ExamOption = { id: string; name: string };

export default async function AdminQuestionGeneratePage() {
  const exams = await loadExams();

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Question Bank</p>
          <h1 className="mt-2 text-3xl font-semibold">Generate questions with AI</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Pick an exam, topic, and difficulty; AI drafts a batch of MCQs for you to review. Nothing is
            saved until you click Save on a question — generated questions land as drafts and go through
            the normal review queue like any other question.
          </p>
        </div>
        <Link className="text-sm font-medium text-primary" href="/admin/questions">
          Back to questions
        </Link>
      </div>

      {!hasSupabaseConfig() ? (
        <Notice message="Supabase is not configured yet. Add Supabase URL and anon key first." />
      ) : (
        <QuestionGenerator exams={exams} />
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
