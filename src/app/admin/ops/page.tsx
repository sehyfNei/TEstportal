import { getErrorMessage } from "@/lib/errors";
import { listFeatureFlags, type FeatureFlagRow } from "@/lib/flags";
import { evaluateOpsAlerts, type OpsAlert } from "@/lib/ops/alerts";
import { loadOpsMetrics, type OpsMetrics } from "@/lib/ops/metrics";
import { cn } from "@/lib/utils";
import { toggleFeatureFlagAction } from "./actions";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  let metrics: OpsMetrics | null = null;
  let flags: FeatureFlagRow[] = [];
  let loadError: string | null = null;
  const configured = hasSupabaseConfig();

  if (configured) {
    try {
      const supabase = await createClient();
      [metrics, flags] = await Promise.all([loadOpsMetrics(supabase), listFeatureFlags(supabase)]);
    } catch (err: unknown) {
      loadError = getErrorMessage(err) || "An unexpected error occurred.";
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Observability</p>
        <h1 className="mt-2 text-3xl font-semibold">Ops Dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Live health of the critical paths: background job queue, AI spend, and submit
          throughput. Metric-to-source mapping lives in docs/ops/OBSERVABILITY.md.
        </p>
      </div>

      {!configured && (
        <Panel message="Supabase is not configured yet. Add Supabase keys to view live ops metrics." />
      )}

      {configured && loadError && <Panel message={`Failed to load ops metrics: ${loadError}`} />}

      {metrics && (
        <>
          <AlertBanner alerts={evaluateOpsAlerts(metrics)} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Pending jobs"
              value={String(metrics.jobsPending)}
              hint={
                metrics.oldestPendingAgeMin === null
                  ? "queue empty"
                  : `oldest waiting ${metrics.oldestPendingAgeMin} min`
              }
            />
            <MetricCard
              label="Jobs failed (24h)"
              value={String(metrics.jobsFailed24h)}
              hint={`${metrics.jobsSucceeded24h} succeeded`}
            />
            <MetricCard
              label="AI spend (24h)"
              value={`$${metrics.aiSpend24hUsd.toFixed(4)}`}
              hint={`${metrics.aiCalls24h} calls · $${metrics.aiSpendMonthUsd.toFixed(2)} this month`}
            />
            <MetricCard
              label="Submits observed (24h)"
              value={String(metrics.submitsObserved24h)}
              hint="via update_mastery jobs"
            />
          </div>

          {metrics.warnings.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Metric warnings</h2>
              <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
                {metrics.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-sm font-semibold">Feature flags</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              DB-backed — toggling takes effect immediately, no deploy needed.
            </p>
            {flags.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No flags found — has the feature_flags migration been applied?
              </p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {flags.map((flag) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-3 py-2"
                    key={flag.key}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-mono">{flag.key}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                    <form action={toggleFeatureFlagAction} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                          flag.enabled
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-slate-50 text-slate-700 ring-slate-600/20"
                        )}
                      >
                        {flag.enabled ? "on" : "off"}
                      </span>
                      <input name="key" type="hidden" value={flag.key} />
                      <input name="enabled" type="hidden" value={String(!flag.enabled)} />
                      <button
                        className="rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                        type="submit"
                      >
                        {flag.enabled ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            As of {new Date(metrics.loadedAt).toLocaleString()} — refresh the page for current
            numbers.
          </p>
        </>
      )}
    </section>
  );
}

function AlertBanner({ alerts }: { alerts: OpsAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-600/20 bg-emerald-50 p-4 text-sm text-emerald-700">
        All ops checks healthy.
      </div>
    );
  }

  return (
    <div className="grid gap-2" role="alert">
      {alerts.map((alert) => (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
            alert.severity === "red"
              ? "border-red-600/20 bg-red-50 text-red-700"
              : "border-amber-600/20 bg-amber-50 text-amber-700"
          )}
          key={alert.id}
        >
          <span className="font-semibold uppercase">{alert.severity}</span> — {alert.message}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-card">
      {message}
    </div>
  );
}
