import Link from "next/link";
import {
  attentionReasons,
  calibrationStatus,
  isQualitySortKey,
  prioritizeQualityRows,
  sortQualityRows,
  type CalibrationStatus,
  type QualityRow,
  type QualitySortKey
} from "@/lib/question-bank/quality-dashboard";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const REASON_LABELS: Record<string, string> = {
  tier_divergence: "Suggested quarantine, still live",
  negative_discrimination: "Weaker students do better (bad key?)",
  flag_threshold: "3+ student flags"
};

const SORT_LINKS: Array<{ key: QualitySortKey; label: string }> = [
  { key: "attempts", label: "Attempts" },
  { key: "usage", label: "Usage" },
  { key: "flags", label: "Flags" },
  { key: "difficulty", label: "Difficulty" },
  { key: "discrimination", label: "Discrimination" }
];

export default async function AdminQualityPage({
  searchParams
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const sortKey: QualitySortKey = isQualitySortKey(sort) ? sort : "attempts";
  const data = await loadQualityData();

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Question Bank</p>
          <h1 className="mt-2 text-3xl font-semibold">Quality analytics</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Calibration signals computed nightly from real student attempts: difficulty, discrimination
            (do stronger students actually do better?), timing, and a suggested quality tier. Advisory
            only — nothing here changes what students see until you act on it.
          </p>
        </div>
        <Link className="text-sm font-medium text-primary" href="/admin/questions">
          All questions
        </Link>
      </div>

      {!data.configured ? (
        <Notice message="Supabase is not configured yet. Add Supabase URL and anon key first." />
      ) : null}

      {data.configured && data.loadError ? <Notice message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        <>
          {data.rows.length === 0 ? (
            <Notice message="No questions have been calibrated yet. The nightly job populates this once students start attempting questions." />
          ) : (
            <>
              <AttentionSection rows={data.attention} />
              <AllQuestionsSection rows={sortQualityRows(data.rest, sortKey)} sortKey={sortKey} />
            </>
          )}
        </>
      ) : null}
    </section>
  );
}

function AttentionSection({ rows }: { rows: QualityRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
        Nothing needs attention right now — no divergent tiers, negative discrimination, or flag spikes.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Needs attention ({rows.length})</h2>
      <div className="grid gap-3">
        {rows.map((row) => (
          <QualityCard highlight key={row.questionId} row={row} />
        ))}
      </div>
    </div>
  );
}

function AllQuestionsSection({ rows, sortKey }: { rows: QualityRow[]; sortKey: QualitySortKey }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">All calibrated questions ({rows.length})</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Sort by:</span>
          {SORT_LINKS.map((link) => (
            <Link
              className={`rounded-full px-3 py-1 font-medium ${
                link.key === sortKey
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              href={`/admin/quality?sort=${link.key}`}
              key={link.key}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <QualityCard key={row.questionId} row={row} />
        ))}
      </div>
    </div>
  );
}

function QualityCard({ row, highlight }: { row: QualityRow; highlight?: boolean }) {
  const reasons = attentionReasons(row);
  const calibration = calibrationStatus(row.lastCalibrated);

  return (
    <article
      className={`rounded-xl border p-4 shadow-card ${
        highlight ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {row.examName} / {row.topicName}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6">{row.stem}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <TierBadge label="Live" tier={row.actualTier} />
          {row.suggestedTier !== row.actualTier ? <TierBadge label="Suggested" tier={row.suggestedTier} /> : null}
          <CalibrationBadge status={calibration} />
        </div>
      </div>

      {reasons.length > 0 ? (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-900/80">
          {reasons.map((reason) => REASON_LABELS[reason]).join(" · ")}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-6">
        <Metric label="Attempts" value={String(row.totalAttempts)} />
        <Metric label="Usage" value={String(row.usageCount)} />
        <Metric label="Flags" value={String(row.flagCount)} />
        <Metric label="Difficulty" value={formatIndex(row.difficultyIndex)} />
        <Metric label="Discrimination" value={formatIndex(row.discrimination)} />
        <Metric label="Avg time" value={row.avgTimeSec === null ? "—" : `${Math.round(row.avgTimeSec)}s`} />
      </dl>

      <Link className="mt-4 inline-block text-xs font-medium text-primary" href={`/admin/questions/${row.questionId}`}>
        Open question
      </Link>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function TierBadge({ label, tier }: { label: string; tier: QualityRow["actualTier"] }) {
  const colors: Record<QualityRow["actualTier"], string> = {
    gold: "bg-amber-400/20 text-amber-800",
    silver: "bg-slate-300/30 text-slate-700",
    bronze: "bg-orange-300/20 text-orange-800",
    quarantine: "bg-red-500/15 text-red-700"
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors[tier]}`}>
      {label}: {tier}
    </span>
  );
}

function CalibrationBadge({ status }: { status: CalibrationStatus }) {
  if (status === "fresh") {
    return null;
  }

  return (
    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {status === "stale" ? "Calibration stale" : "Not yet calibrated"}
    </span>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

async function loadQualityData() {
  if (!hasSupabaseConfig()) {
    return { configured: false as const, loadError: null, rows: [], attention: [], rest: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("question_stats")
    .select(
      "question_id,total_attempts,correct_attempts,difficulty_index,discrimination,point_biserial,avg_time_sec,flag_count,quality_tier,last_calibrated,questions!inner(quality_tier,status,usage_count,exams(name),topic:topics!questions_topic_id_fkey(name),current_version:question_versions!questions_current_version_fk(content))"
    )
    .order("total_attempts", { ascending: false })
    .limit(200);

  if (error) {
    return { configured: true as const, loadError: error.message, rows: [], attention: [], rest: [] };
  }

  const rows = toQualityRows(data);
  const { attention, rest } = prioritizeQualityRows(rows);

  return { configured: true as const, loadError: null, rows, attention, rest };
}

function toQualityRows(data: unknown): QualityRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const record = row as Record<string, unknown>;
      const questionId = typeof record.question_id === "string" ? record.question_id : "";
      const question = record.questions as Record<string, unknown> | null;
      if (!questionId || !question) {
        return null;
      }

      const exam = question.exams as { name?: string } | null;
      const topic = question.topic as { name?: string } | null;
      const currentVersion = question.current_version as { content?: { text?: string } } | null;

      return {
        questionId,
        examName: exam?.name ?? "Exam",
        topicName: topic?.name ?? "Topic",
        stem: currentVersion?.content?.text?.trim() || "Untitled question",
        status: String(question.status ?? "draft"),
        actualTier: toTier(question.quality_tier),
        suggestedTier: toTier(record.quality_tier),
        totalAttempts: toNumber(record.total_attempts),
        difficultyIndex: toNullableNumber(record.difficulty_index),
        discrimination: toNullableNumber(record.discrimination),
        avgTimeSec: toNullableNumber(record.avg_time_sec),
        flagCount: toNumber(record.flag_count),
        usageCount: toNumber(question.usage_count),
        lastCalibrated: typeof record.last_calibrated === "string" ? record.last_calibrated : null
      } satisfies QualityRow;
    })
    .filter((row): row is QualityRow => Boolean(row));
}

function toTier(value: unknown): QualityRow["actualTier"] {
  return value === "gold" || value === "silver" || value === "quarantine" ? value : "bronze";
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatIndex(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}
