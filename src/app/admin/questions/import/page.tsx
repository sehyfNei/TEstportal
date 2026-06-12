import Link from "next/link";
import { QuestionImporter } from "@/components/admin/question-importer";

export default function AdminQuestionImportPage() {
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border border-border bg-card shadow-card p-5">
          <QuestionImporter />
        </div>

        <aside className="rounded-xl border border-border bg-card shadow-card p-5">
          <h2 className="text-lg font-semibold">Accepted fields</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              Required: `examId`, `topicId`, and either `content` in JSON rows or `content_json` in
              CSV rows.
            </p>
            <p>
              Optional: `subtopicId`, `type`, `difficulty`, `source`, `sourceYear`,
              `sourceReference`, `isContested`, `language`, `status`, `exposurePolicy`,
              `qualityTier`, `explanation`, `explanationDetail`, and `reviewerNotes`.
            </p>
            <p>
              CSV also accepts snake_case aliases such as `exam_id`, `topic_id`, `content_json`,
              and `quality_tier`.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
