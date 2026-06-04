import Link from "next/link";
import { FLAG_REASON_LABELS, isValidFlagReason } from "@/lib/question-bank/flag-reasons";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ResolveFlagForm } from "./resolve-flag-form";

type QuestionJoin = {
  id: string;
  status: string;
  quality_tier: string;
  exam_id: string | null;
  topic_id: string | null;
} | null;

type FlagRow = {
  id: string;
  question_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  questions: QuestionJoin | QuestionJoin[];
};

export default async function AdminQuestionFlagsPage() {
  const data = await loadOpenFlags();

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Question quality</p>
        <h1 className="mt-2 text-3xl font-semibold">Flagged questions</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Open flags reported by users. Resolve or reject each flag here. To restore a quarantined
          question or change its tier, use the{" "}
          <Link className="text-primary" href="/admin/questions">
            question editor
          </Link>
          .
        </p>
      </div>

      {!data.configured ? (
        <Panel message="Supabase is not configured yet. Add Supabase URL and anon key to view flagged questions." />
      ) : null}

      {data.configured && data.loadError ? <Panel message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        data.rows.length ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Question</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Q Status / Tier</th>
                  <th className="px-4 py-3 font-medium">Flagged</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const question = firstQuestion(row.questions);
                  return (
                    <tr className="border-b border-border last:border-0" key={row.id}>
                      <td className="px-4 py-3">
                        {question ? (
                          <Link
                            className="font-mono text-xs text-primary"
                            href={`/admin/questions/${question.id}`}
                          >
                            {question.id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">
                            {row.question_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isValidFlagReason(row.reason) ? FLAG_REASON_LABELS[row.reason] : row.reason}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-muted-foreground">
                        {row.details ? (
                          <span className="line-clamp-2">{row.details}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {question ? (
                          <span>
                            <span className="capitalize">{question.status}</span>
                            {" / "}
                            <span className="capitalize">{question.quality_tier}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        <ResolveFlagForm flagId={row.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Panel message="No open flags." />
        )
      ) : null}
    </section>
  );
}

function Panel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

function firstQuestion(join: QuestionJoin | QuestionJoin[]): QuestionJoin {
  return Array.isArray(join) ? (join[0] ?? null) : join;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

async function loadOpenFlags() {
  if (!hasSupabaseConfig()) {
    return { configured: false, loadError: null, rows: [] as FlagRow[] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_flags")
    .select("id,question_id,reason,details,status,created_at,questions(id,status,quality_tier,exam_id,topic_id)")
    .in("status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { configured: true, loadError: error.message, rows: [] as FlagRow[] };
  }

  return { configured: true, loadError: null, rows: (data ?? []) as FlagRow[] };
}
