import Link from "next/link";
import { ExplanationBackfillRunner } from "@/components/admin/explanation-backfill-runner";
import { loadExplanationBackfillCandidates } from "@/lib/question-bank/explanation-backfill";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function ExplanationBackfillPage() {
  const status = await loadBackfillStatus();

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Question Bank</p>
          <h1 className="mt-2 text-3xl font-semibold">AI explanation backfill</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Many imported questions have no explanation, so students see nothing in the mistake
            notebook. This tool writes an AI explanation for each of them, ten at a time, saved as
            a new question version you can review or edit later. Answers are never changed.
          </p>
        </div>
        <Link className="text-sm font-medium text-primary" href="/admin/questions">
          Back to questions
        </Link>
      </div>

      {!status.configured ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          Supabase is not configured yet.
        </div>
      ) : status.error ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          Questions could not be loaded: {status.error}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card shadow-card p-5">
            <p className="text-sm text-muted-foreground">Questions missing an explanation</p>
            <p className="mt-2 text-3xl font-semibold">{status.missingCount}</p>
            {status.skippedCount > 0 ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {status.skippedCount} more lack explanations but cannot be backfilled automatically
                (no options or no marked answer, e.g. integer or match questions). Edit those by
                hand from the question list.
              </p>
            ) : null}
          </div>

          <ExplanationBackfillRunner missingCount={status.missingCount} />
        </>
      )}
    </section>
  );
}

async function loadBackfillStatus() {
  if (!hasSupabaseConfig()) {
    return { configured: false, error: null, missingCount: 0, skippedCount: 0 };
  }

  const supabase = await createClient();
  const [{ candidates, error }, totalMissing] = await Promise.all([
    loadExplanationBackfillCandidates(supabase),
    countAllMissingExplanations(supabase)
  ]);

  return {
    configured: true,
    error,
    missingCount: candidates.length,
    skippedCount: Math.max(0, totalMissing - candidates.length)
  };
}

async function countAllMissingExplanations(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from("questions")
    .select(
      "id,current_version:question_versions!questions_current_version_fk(explanation,explanation_detail)"
    )
    .neq("status", "retired");

  let missing = 0;

  for (const row of data ?? []) {
    const version = Array.isArray(row.current_version)
      ? row.current_version[0]
      : row.current_version;

    if (!version) continue;

    const hasExplanation =
      (typeof version.explanation === "string" && version.explanation.trim()) ||
      (typeof version.explanation_detail === "string" && version.explanation_detail.trim());

    if (!hasExplanation) missing += 1;
  }

  return missing;
}
