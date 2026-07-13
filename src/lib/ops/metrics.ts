import type { SupabaseClient } from "@supabase/supabase-js";

export type OpsMetrics = {
  jobsPending: number;
  oldestPendingAgeMin: number | null;
  jobsFailed24h: number;
  jobsSucceeded24h: number;
  aiSpend24hUsd: number;
  aiCalls24h: number;
  // Submits proxied by update_mastery jobs (one enqueued per submit) because
  // test_sessions is owner-scoped RLS and not readable by the admin client.
  submitsObserved24h: number;
  warnings: string[];
  loadedAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function loadOpsMetrics(supabase: SupabaseClient): Promise<OpsMetrics> {
  const now = Date.now();
  const cutoff = new Date(now - DAY_MS).toISOString();
  const warnings: string[] = [];

  const metrics: OpsMetrics = {
    jobsPending: 0,
    oldestPendingAgeMin: null,
    jobsFailed24h: 0,
    jobsSucceeded24h: 0,
    aiSpend24hUsd: 0,
    aiCalls24h: 0,
    submitsObserved24h: 0,
    warnings,
    loadedAt: new Date(now).toISOString()
  };

  await Promise.all([
    (async () => {
      try {
        const { count, error } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        if (error) throw new Error(error.message);
        metrics.jobsPending = count ?? 0;
      } catch (err) {
        warnings.push(`pending jobs: ${messageOf(err)}`);
      }
    })(),
    (async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1);
        if (error) throw new Error(error.message);
        const oldest = data?.[0]?.created_at as string | undefined;
        metrics.oldestPendingAgeMin = oldest
          ? Math.max(0, Math.round((now - new Date(oldest).getTime()) / 60000))
          : null;
      } catch (err) {
        warnings.push(`oldest pending job: ${messageOf(err)}`);
      }
    })(),
    (async () => {
      try {
        const { count, error } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .in("status", ["failed", "dead"])
          .gte("updated_at", cutoff);
        if (error) throw new Error(error.message);
        metrics.jobsFailed24h = count ?? 0;
      } catch (err) {
        warnings.push(`failed jobs: ${messageOf(err)}`);
      }
    })(),
    (async () => {
      try {
        const { count, error } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("updated_at", cutoff);
        if (error) throw new Error(error.message);
        metrics.jobsSucceeded24h = count ?? 0;
      } catch (err) {
        warnings.push(`succeeded jobs: ${messageOf(err)}`);
      }
    })(),
    (async () => {
      try {
        const { data, error } = await supabase
          .from("llm_cost_ledger")
          .select("cost_usd")
          .gte("created_at", cutoff)
          .limit(2000);
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        metrics.aiCalls24h = rows.length;
        metrics.aiSpend24hUsd = rows.reduce((sum, row) => {
          const cost = Number(row.cost_usd);
          return Number.isFinite(cost) ? sum + cost : sum;
        }, 0);
      } catch (err) {
        warnings.push(`AI ledger: ${messageOf(err)}`);
      }
    })(),
    (async () => {
      try {
        const { count, error } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("type", "update_mastery")
          .gte("created_at", cutoff);
        if (error) throw new Error(error.message);
        metrics.submitsObserved24h = count ?? 0;
      } catch (err) {
        warnings.push(`submit proxy: ${messageOf(err)}`);
      }
    })()
  ]);

  return metrics;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
