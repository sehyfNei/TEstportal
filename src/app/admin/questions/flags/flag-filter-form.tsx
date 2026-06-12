"use client";

import { useRouter } from "next/navigation";
import { FLAG_REASON_LABELS, FLAG_REASONS } from "@/lib/question-bank/flag-reasons";

type Props = {
  currentReason: string;
  currentStatuses: string;
  currentExamId: string;
  exams: Array<{ id: string; name: string }>;
};

export function FlagFilterForm({
  currentReason,
  currentStatuses,
  currentExamId,
  exams
}: Props) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const reason = fd.get("reason") as string;
    const statuses = fd.get("statuses") as string;
    const examId = fd.get("examId") as string;
    if (reason) params.set("reason", reason);
    if (statuses) params.set("statuses", statuses);
    if (examId) params.set("examId", examId);
    router.push(`/admin/questions/flags${params.size ? `?${params.toString()}` : ""}`);
  }

  function handleReset() {
    router.push("/admin/questions/flags");
  }

  const hasFilter = currentReason || currentStatuses || currentExamId;

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card shadow-card p-4"
      onSubmit={handleSubmit}
    >
      {/* Reason filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="flag-filter-reason">
          Reason
        </label>
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          defaultValue={currentReason}
          id="flag-filter-reason"
          name="reason"
        >
          <option value="">All reasons</option>
          {FLAG_REASONS.map((r) => (
            <option key={r} value={r}>
              {FLAG_REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {/* Status/tier filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="flag-filter-statuses">
          Question status
        </label>
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          defaultValue={currentStatuses}
          id="flag-filter-statuses"
          name="statuses"
        >
          <option value="">Any status</option>
          <option value="flagged">Flagged</option>
          <option value="live">Live</option>
          <option value="flagged,live">Flagged + Live</option>
          <option value="draft">Draft</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Exam filter */}
      {exams.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="flag-filter-exam">
            Exam
          </label>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            defaultValue={currentExamId}
            id="flag-filter-exam"
            name="examId"
          >
            <option value="">All exams</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
          type="submit"
        >
          Apply
        </button>
        {hasFilter && (
          <button
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            onClick={handleReset}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
