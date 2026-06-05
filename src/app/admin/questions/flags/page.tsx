import Link from "next/link";
import { FLAG_REASON_LABELS, isValidFlagReason } from "@/lib/question-bank/flag-reasons";
import {
  computeTriageSummary,
  filterGroups,
  groupFlagsByQuestion
} from "@/lib/question-bank/flag-triage";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { FlagFilterForm } from "./flag-filter-form";
import { ResolveAllFlagsForm } from "./resolve-all-flags-form";
import { ResolveFlagForm } from "./resolve-flag-form";

// ---------------------------------------------------------------------------
// Types for DB rows
// ---------------------------------------------------------------------------

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

type ExamRow = { id: string; name: string };

type SearchParams = Promise<{ reason?: string; statuses?: string; examId?: string }>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminQuestionFlagsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const filterReason = searchParams.reason ?? "";
  const filterStatuses = searchParams.statuses ?? "";
  const filterExamId = searchParams.examId ?? "";

  const data = await loadTriageData();

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Panel message="Supabase is not configured yet. Add Supabase URL and anon key to view flagged questions." />
      </section>
    );
  }

  if (data.loadError) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Panel message={data.loadError} />
      </section>
    );
  }

  // Group and filter using pure helpers.
  const rawFlagsWithQ = data.rows.map((row) => ({
    ...row,
    question: firstQuestion(row.questions)
  }));

  const allGroups = groupFlagsByQuestion(rawFlagsWithQ);
  const filteredGroups = filterGroups(allGroups, {
    reason: filterReason || undefined,
    statuses: filterStatuses || undefined,
    examId: filterExamId || undefined
  });
  const summary = computeTriageSummary(allGroups); // summary always over all flags

  return (
    <section className="grid gap-6">
      <PageHeader />

      {/* ── Analytics summary ── */}
      {summary.totalOpenFlags > 0 && (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Queue overview</h2>
          <div className="flex flex-wrap gap-6">
            <Stat label="Open flags" value={String(summary.totalOpenFlags)} />
            <Stat label="Flagged questions" value={String(summary.totalFlaggedQuestions)} />
          </div>

          {summary.reasonStats.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                By reason
              </p>
              <div className="flex flex-wrap gap-2">
                {summary.reasonStats.map(({ reason, label, count }) => (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs text-foreground"
                    key={reason}
                  >
                    {label}
                    <span className="font-semibold text-primary">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <FlagFilterForm
        currentExamId={filterExamId}
        currentReason={filterReason}
        currentStatuses={filterStatuses}
        exams={data.exams}
      />

      {/* ── Triage cards ── */}
      {filteredGroups.length === 0 ? (
        <Panel
          message={
            filterReason || filterStatuses || filterExamId
              ? "No flagged questions match these filters."
              : "No open flags."
          }
        />
      ) : (
        <div className="grid gap-4">
          {filteredGroups.map((group) => (
            <div
              className="rounded-lg border border-border bg-card"
              key={group.questionId}
            >
              {/* Card header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-mono text-sm font-medium text-primary hover:underline"
                      href={`/admin/questions/${group.questionId}`}
                    >
                      {group.questionId.slice(0, 8)}…
                    </Link>
                    <StatusBadge status={group.questionStatus} />
                    <TierBadge tier={group.qualityTier} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.distinctReasons.map((r) => (
                      <span
                        className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200"
                        key={r}
                      >
                        {isValidFlagReason(r) ? FLAG_REASON_LABELS[r] : r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {group.openFlagCount} open flag{group.openFlagCount !== 1 ? "s" : ""}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {/* Bulk action */}
                    <ResolveAllFlagsForm questionId={group.questionId} />
                    {/* Editor link */}
                    <Link
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                      href={`/admin/questions/${group.questionId}`}
                    >
                      Edit
                    </Link>
                  </div>
                  {group.qualityTier === "quarantine" && (
                    <p className="text-xs text-muted-foreground">
                      Quarantined — restore status via the editor.
                    </p>
                  )}
                </div>
              </div>

              {/* Per-flag detail rows */}
              <div className="divide-y divide-border">
                {group.flags.map((flag) => (
                  <div
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
                    key={flag.id}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {isValidFlagReason(flag.reason)
                          ? FLAG_REASON_LABELS[flag.reason]
                          : flag.reason}
                      </span>
                      {flag.details && (
                        <span className="max-w-xs text-xs text-muted-foreground line-clamp-2">
                          {flag.details}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(flag.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {flag.status === "resolved" || flag.status === "rejected" ? (
                        <span className="text-xs capitalize text-muted-foreground">
                          {flag.status}
                        </span>
                      ) : (
                        <ResolveFlagForm flagId={flag.id} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AP-07 explanation half — cross-link to /admin/ai-ratings */}
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Explanation ratings</span> — User
        down-rated AI explanations are tracked separately in{" "}
        <Link className="text-primary hover:underline" href="/admin/ai-ratings">
          AI ratings
        </Link>
        .
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Question quality</p>
      <h1 className="mt-2 text-3xl font-semibold">Flagged questions</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
        User-reported flags grouped by question. Resolve or reject flags here. To restore a
        quarantined question or change its tier, use the{" "}
        <Link className="text-primary" href="/admin/questions">
          question editor
        </Link>
        .
      </p>
    </div>
  );
}

function Panel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    flagged: "bg-amber-50 text-amber-700 ring-amber-200",
    live: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    retired: "bg-red-50 text-red-700 ring-red-200",
    draft: "bg-slate-100 text-slate-600 ring-slate-200"
  };
  const cls = classes[status] ?? "bg-muted text-muted-foreground ring-border";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs capitalize ring-1 ${cls}`}>
      {status}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (!tier) return null;
  const isQuarantine = tier === "quarantine";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs capitalize ring-1 ${
        isQuarantine
          ? "bg-red-50 text-red-700 ring-red-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {tier}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function firstQuestion(join: QuestionJoin | QuestionJoin[]): QuestionJoin {
  return Array.isArray(join) ? (join[0] ?? null) : join;
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

async function loadTriageData(): Promise<{
  configured: boolean;
  loadError: string | null;
  rows: FlagRow[];
  exams: ExamRow[];
}> {
  if (!hasSupabaseConfig()) {
    return { configured: false, loadError: null, rows: [], exams: [] };
  }

  const supabase = await createClient();

  // Load open+reviewing flags with question join (same base query as before, extended).
  const { data: flagData, error: flagError } = await supabase
    .from("question_flags")
    .select(
      "id,question_id,reason,details,status,created_at,questions(id,status,quality_tier,exam_id,topic_id)"
    )
    .in("status", ["open", "reviewing", "resolved", "rejected"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (flagError) {
    return { configured: true, loadError: flagError.message, rows: [], exams: [] };
  }

  // Load exam list for the filter dropdown (best-effort; failure is non-fatal).
  let exams: ExamRow[] = [];
  try {
    const { data: examData } = await supabase
      .from("exams")
      .select("id,name")
      .order("name");
    exams = (examData ?? []) as ExamRow[];
  } catch {
    // non-fatal
  }

  return {
    configured: true,
    loadError: null,
    rows: (flagData ?? []) as FlagRow[],
    exams
  };
}
