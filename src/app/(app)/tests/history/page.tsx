import Link from "next/link";
import {
  buildTestHistory,
  type HistoryAnalysisRow,
  type HistoryExamRow,
  type HistoryResultRow,
  type HistorySessionRow,
  type TestHistoryItem
} from "@/lib/tests/history";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function TestHistoryPage() {
  const data = await loadTestHistory();

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Tests</p>
          <h1 className="mt-2 text-3xl font-semibold">Test history</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Reopen any completed attempt to review its score, AI analysis, and diagnostic plan.
          </p>
        </div>
        <Link className="text-sm font-semibold text-primary hover:underline" href="/tests">
          Test catalog
        </Link>
      </div>

      {!data.configured ? <Notice message="Supabase is not configured yet." /> : null}
      {data.error ? <Notice message={data.error} /> : null}
      {data.configured && !data.error && data.items.length === 0 ? (
        <Notice message="No completed tests yet. Your scored attempts will appear here." />
      ) : null}

      {data.items.length ? <HistoryTable items={data.items} /> : null}
    </section>
  );
}

function HistoryTable({ items }: { items: TestHistoryItem[] }) {
  return (
    <div className="overflow-x-auto border-y border-border">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Completed</th>
            <th className="px-4 py-3 font-semibold">Test</th>
            <th className="px-4 py-3 font-semibold">Score</th>
            <th className="px-4 py-3 font-semibold">Accuracy</th>
            <th className="px-4 py-3 font-semibold">AI analysis</th>
            <th className="px-4 py-3 text-right font-semibold">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.sessionId}>
              <td className="px-4 py-4 text-muted-foreground">{formatDate(item.completedAt)}</td>
              <td className="px-4 py-4">
                <p className="font-semibold">{formatType(item.type)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.examName}</p>
              </td>
              <td className="px-4 py-4 font-semibold">
                {formatNumber(item.score)} / {formatNumber(item.maxScore)}
              </td>
              <td className="px-4 py-4">{formatPercent(item.accuracy)}</td>
              <td className="px-4 py-4">{analysisLabel(item.analysisStatus)}</td>
              <td className="px-4 py-4 text-right">
                <Link className="font-semibold text-primary hover:underline" href={`/tests/${item.sessionId}`}>
                  View result
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function loadTestHistory(): Promise<{
  configured: boolean;
  error: string | null;
  items: TestHistoryItem[];
}> {
  if (!hasSupabaseConfig()) {
    return { configured: false, error: null, items: [] };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { configured: true, error: authError?.message ?? "Sign in to view test history.", items: [] };
  }

  const sessionsResult = await supabase
    .from("test_sessions")
    .select("id,exam_id,type,status,started_at,submitted_at,created_at")
    .eq("user_id", authData.user.id)
    .in("status", ["submitted", "scored", "analyzed"])
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (sessionsResult.error) {
    return { configured: true, error: sessionsResult.error.message, items: [] };
  }

  const sessions = (sessionsResult.data ?? []) as HistorySessionRow[];
  if (!sessions.length) {
    return { configured: true, error: null, items: [] };
  }

  const sessionIds = sessions.map((session) => session.id);
  const examIds = [...new Set(sessions.map((session) => session.exam_id))];
  const [resultsResult, examsResult] = await Promise.all([
    supabase
      .from("session_results")
      .select("id,session_id,score,max_score,accuracy,attempted,correct,incorrect,skipped")
      .in("session_id", sessionIds),
    supabase.from("exams").select("id,name").in("id", examIds)
  ]);

  const firstError = resultsResult.error?.message ?? examsResult.error?.message ?? null;
  if (firstError) {
    return { configured: true, error: firstError, items: [] };
  }

  const results = (resultsResult.data ?? []) as HistoryResultRow[];
  const resultIds = results.map((result) => result.id);
  const analysesResult = resultIds.length
    ? await supabase.from("ai_analyses").select("session_result_id,status").in("session_result_id", resultIds)
    : { data: [], error: null };

  if (analysesResult.error) {
    return { configured: true, error: analysesResult.error.message, items: [] };
  }

  return {
    configured: true,
    error: null,
    items: buildTestHistory(
      sessions,
      results,
      (analysesResult.data ?? []) as HistoryAnalysisRow[],
      (examsResult.data ?? []) as HistoryExamRow[]
    )
  };
}

function Notice({ message }: { message: string }) {
  return <div className="border-y border-border py-5 text-sm text-muted-foreground">{message}</div>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatType(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatPercent(value: number): string {
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function analysisLabel(status: TestHistoryItem["analysisStatus"]): string {
  if (status === "completed") return "Ready";
  if (status === "failed") return "Needs retry";
  if (status === "disabled") return "Unavailable";
  if (status === "pending" || status === "running") return "Generating";
  return "Not generated";
}
