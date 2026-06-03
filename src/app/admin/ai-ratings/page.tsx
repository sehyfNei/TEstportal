import Link from "next/link";
import { REPORT_CATEGORY_LABELS, isValidReportCategory } from "@/lib/ai/rating-helpers";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type SessionResultJoin = { session_id?: string | null } | { session_id?: string | null }[] | null;

type RatingRow = {
  id: string;
  scope: string;
  scope_key: string;
  rating: string;
  report_category: string | null;
  created_at: string;
  session_result_id: string;
  session_results: SessionResultJoin;
};

const SCOPE_LABELS: Record<string, string> = {
  question_analysis: "Question",
  topic_summary: "Topic",
  overall: "Overall"
};

export default async function AdminAiRatingsPage() {
  const data = await loadReportedRatings();

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">AI quality</p>
        <h1 className="mt-2 text-3xl font-semibold">Flagged explanations</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Explanations users reported as unhelpful. Open the session to review the full analysis in
          context.
        </p>
      </div>

      {!data.configured ? (
        <Panel message="Supabase is not configured yet. Add Supabase URL and anon key to view reported explanations." />
      ) : null}

      {data.configured && data.loadError ? <Panel message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        data.rows.length ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Scope</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Reported</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const sessionId = firstSessionId(row.session_results);
                  return (
                    <tr className="border-b border-border last:border-0" key={row.id}>
                      <td className="px-4 py-3">{SCOPE_LABELS[row.scope] ?? row.scope}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.scope_key || "—"}</td>
                      <td className="px-4 py-3">{categoryLabel(row.report_category)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3">
                        {sessionId ? (
                          <Link className="text-primary" href={`/tests/${sessionId}`}>
                            View session
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Panel message="No reported explanations yet." />
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

function categoryLabel(value: string | null): string {
  return isValidReportCategory(value) ? REPORT_CATEGORY_LABELS[value] : "—";
}

function firstSessionId(join: SessionResultJoin): string | null {
  const record = Array.isArray(join) ? join[0] : join;
  const sessionId = record?.session_id;
  return typeof sessionId === "string" ? sessionId : null;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

async function loadReportedRatings() {
  if (!hasSupabaseConfig()) {
    return { configured: false, loadError: null, rows: [] as RatingRow[] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("explanation_ratings")
    .select(
      "id,scope,scope_key,rating,report_category,created_at,session_result_id,session_results(session_id)"
    )
    .eq("rating", "down")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return { configured: true, loadError: error.message, rows: [] as RatingRow[] };
  }

  return { configured: true, loadError: null, rows: (data ?? []) as RatingRow[] };
}
