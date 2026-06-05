import Link from "next/link";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { retryJobAction } from "./actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type JobRow = {
  id: string;
  type: string;
  status: string;
  idempotency_key: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
  next_run_at: string;
  locked_at: string | null;
  locked_by: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-blue-50 text-blue-700 ring-blue-600/20",
  running: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
  dead: "bg-slate-50 text-slate-700 ring-slate-600/20"
};

const tabs = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "dead", label: "Dead" }
];

export default async function AdminJobsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const statusFilter = typeof resolvedParams.status === "string" ? resolvedParams.status : "all";

  let jobs: JobRow[] = [];
  let loadError: string | null = null;
  const configured = hasSupabaseConfig();

  if (configured) {
    try {
      const supabase = await createClient();
      let query = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        loadError = error.message;
      } else {
        jobs = (data || []) as JobRow[];
      }
    } catch (err: unknown) {
      loadError = getErrorMessage(err) || "An unexpected error occurred.";
    }
  }

  async function handleRetry(formData: FormData) {
    "use server";
    const id = formData.get("jobId") as string;
    if (id) {
      await retryJobAction(id);
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Background processing</p>
        <h1 className="mt-2 text-3xl font-semibold">Jobs Monitor</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Inspect, debug, and manually retry asynchronous jobs. Completed, failed, and dead states are tracked.
        </p>
      </div>

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/admin/jobs?status=${tab.value}`}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  active
                    ? "bg-primary border-primary text-primary-foreground font-semibold"
                    : "bg-card border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {!configured && (
        <Panel message="Supabase is not configured yet. Add Supabase URL and SERVICE_ROLE_KEY to view background jobs." />
      )}

      {configured && loadError && (
        <Panel message={`Failed to load background jobs: ${loadError}`} />
      )}

      {configured && !loadError && (
        jobs.length === 0 ? (
          <Panel message={`No jobs found with status "${statusFilter}".`} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Job ID</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Idempotency Key</th>
                  <th className="px-4 py-3 font-medium">Next Run / Locked At</th>
                  <th className="px-4 py-3 font-medium max-w-xs">Error Message</th>
                  <th className="px-4 py-3 font-medium">Created At</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors" key={job.id}>
                    <td className="px-4 py-3 font-mono text-xs" title={job.id}>
                      {job.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium text-xs">{job.type}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        STATUS_BADGES[job.status] || "bg-slate-50 text-slate-700 ring-slate-600/20"
                      )}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {job.attempts} / {job.max_attempts}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono" title={job.idempotency_key}>
                      {job.idempotency_key ? (
                        job.idempotency_key.length > 40
                          ? `${job.idempotency_key.slice(0, 40)}...`
                          : job.idempotency_key
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {job.locked_at ? (
                        <span className="text-blue-600 font-medium" title={`Locked by: ${job.locked_by || "unknown"}`}>
                          Locked ({new Date(job.locked_at).toLocaleTimeString()})
                        </span>
                      ) : (
                        new Date(job.next_run_at).toLocaleString()
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-rose-600" title={job.error_message || ""}>
                      {job.error_message ? (
                        job.error_message.length > 60
                          ? `${job.error_message.slice(0, 60)}...`
                          : job.error_message
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {["failed", "dead"].includes(job.status) ? (
                        <form action={handleRetry} className="inline-block">
                          <input type="hidden" name="jobId" value={job.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                          >
                            Retry
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
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
