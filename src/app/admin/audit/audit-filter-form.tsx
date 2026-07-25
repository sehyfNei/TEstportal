"use client";

import { useRouter } from "next/navigation";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS } from "@/lib/audit/audit-actions";

export function AuditFilterForm({ currentAction }: { currentAction: string }) {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const action = fd.get("action") as string;
    router.push(action ? `/admin/audit?action=${action}` : "/admin/audit");
  }

  function handleReset() {
    router.push("/admin/audit");
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card shadow-card p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="audit-filter-action">
          Action
        </label>
        <select
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          defaultValue={currentAction}
          id="audit-filter-action"
          name="action"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {AUDIT_ACTION_LABELS[action]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
          type="submit"
        >
          Apply
        </button>
        {currentAction && (
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
