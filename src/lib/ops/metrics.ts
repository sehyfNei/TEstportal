import type { SupabaseClient } from "@supabase/supabase-js";

// Job types expected to complete on a nightly cadence. compute_question_stats
// (TSP-098) is the first nightly handler; when decay_mastery/weekly_digest
// land, add their type strings here too and the staleness alert covers them
// with no further wiring.
export const NIGHTLY_JOB_TYPES: readonly string[] = ["compute_question_stats"];

export type NightlyJobHealth = {
  type: string;
  // null = never completed
  hoursSinceSuccess: number | null;
  failed24h: number;
};

export type OpsMetrics = {
  jobsPending: number;
  oldestPendingAgeMin: number | null;
  jobsFailed24h: number;
  jobsSucceeded24h: number;
  jobsDead24h: number;
  failedTypes24h: string[];
  nightly: NightlyJobHealth[];
  aiSpend24hUsd: number;
  aiCalls24h: number;
  aiSpendMonthUsd: number;
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
    jobsDead24h: 0,
    failedTypes24h: [],
    nightly: [],
    aiSpend24hUsd: 0,
    aiCalls24h: 0,
    aiSpendMonthUsd: 0,
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
          .from("jobs")
          .select("type,status")
          .in("status", ["failed", "dead"])
          .gte("updated_at", cutoff)
          .limit(500);
        if (error) throw new Error(error.message);
        const rows = data ?? [];
        metrics.jobsDead24h = rows.filter((row) => row.status === "dead").length;
        metrics.failedTypes24h = [...new Set(rows.map((row) => String(row.type)))].sort();
      } catch (err) {
        warnings.push(`failed job types: ${messageOf(err)}`);
      }
    })(),
    ...NIGHTLY_JOB_TYPES.map((jobType) => async () => {
      try {
        const [lastSuccess, failed] = await Promise.all([
          supabase
            .from("jobs")
            .select("updated_at")
            .eq("type", jobType)
            .eq("status", "completed")
            .order("updated_at", { ascending: false })
            .limit(1),
          supabase
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("type", jobType)
            .in("status", ["failed", "dead"])
            .gte("updated_at", cutoff)
        ]);
        if (lastSuccess.error) throw new Error(lastSuccess.error.message);
        if (failed.error) throw new Error(failed.error.message);
        const last = lastSuccess.data?.[0]?.updated_at as string | undefined;
        metrics.nightly.push({
          type: jobType,
          hoursSinceSuccess: last
            ? Math.max(0, Math.round((now - new Date(last).getTime()) / 3600000))
            : null,
          failed24h: failed.count ?? 0
        });
      } catch (err) {
        warnings.push(`nightly ${jobType}: ${messageOf(err)}`);
      }
    }).map((fn) => fn()),
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
        const monthStart = new Date(now);
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);
        const { data, error } = await supabase
          .from("llm_cost_ledger")
          .select("cost_usd")
          .gte("created_at", monthStart.toISOString())
          .limit(10000);
        if (error) throw new Error(error.message);
        metrics.aiSpendMonthUsd = (data ?? []).reduce((sum, row) => {
          const cost = Number(row.cost_usd);
          return Number.isFinite(cost) ? sum + cost : sum;
        }, 0);
      } catch (err) {
        warnings.push(`AI monthly spend: ${messageOf(err)}`);
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
