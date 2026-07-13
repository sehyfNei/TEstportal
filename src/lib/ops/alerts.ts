import type { OpsMetrics } from "@/lib/ops/metrics";

export type OpsAlert = {
  id: string;
  severity: "red" | "amber";
  message: string;
};

export const OPS_THRESHOLDS = {
  queueAgeRedMin: 15,
  failedJobsAmber: 1,
  failedJobsRed: 3,
  aiSpendAmberUsd: 5,
  aiSpendRedUsd: 15,
  // Monthly LLM budget (TSP-142). Retune here when the founder sets a real
  // budget; the dashboard and tests follow automatically.
  aiBudgetMonthAmberUsd: 30,
  aiBudgetMonthRedUsd: 60,
  // Nightly jobs (TSP-143): red when a nightly type hasn't completed within
  // this window (or has never completed).
  nightlyStaleRedHours: 36
} as const;

// Pure: metrics in, alerts out. No I/O and no clock — ages are precomputed
// in loadOpsMetrics so thresholds are unit-testable at their boundaries.
export function evaluateOpsAlerts(metrics: OpsMetrics): OpsAlert[] {
  const alerts: OpsAlert[] = [];

  if (
    metrics.oldestPendingAgeMin !== null &&
    metrics.oldestPendingAgeMin > OPS_THRESHOLDS.queueAgeRedMin
  ) {
    alerts.push({
      id: "queue-stalled",
      severity: "red",
      message: `Job queue stalled: oldest pending job has waited ${metrics.oldestPendingAgeMin} min (limit ${OPS_THRESHOLDS.queueAgeRedMin}).`
    });
  }

  const typeSuffix =
    metrics.failedTypes24h.length > 0 ? ` Types: ${metrics.failedTypes24h.join(", ")}.` : "";

  if (metrics.jobsFailed24h > OPS_THRESHOLDS.failedJobsRed) {
    alerts.push({
      id: "jobs-failing",
      severity: "red",
      message: `${metrics.jobsFailed24h} jobs failed or died in the last 24h.${typeSuffix}`
    });
  } else if (metrics.jobsFailed24h >= OPS_THRESHOLDS.failedJobsAmber) {
    alerts.push({
      id: "jobs-failing",
      severity: "amber",
      message: `${metrics.jobsFailed24h} job(s) failed in the last 24h — check /admin/jobs.${typeSuffix}`
    });
  }

  if (metrics.jobsDead24h > 0) {
    alerts.push({
      id: "jobs-dead",
      severity: "red",
      message: `${metrics.jobsDead24h} job(s) exhausted retries and died in the last 24h — manual retry needed on /admin/jobs.`
    });
  }

  for (const nightly of metrics.nightly) {
    if (
      nightly.hoursSinceSuccess === null ||
      nightly.hoursSinceSuccess > OPS_THRESHOLDS.nightlyStaleRedHours
    ) {
      alerts.push({
        id: `nightly-stale:${nightly.type}`,
        severity: "red",
        message:
          nightly.hoursSinceSuccess === null
            ? `Nightly job ${nightly.type} has never completed.`
            : `Nightly job ${nightly.type} last completed ${nightly.hoursSinceSuccess}h ago (limit ${OPS_THRESHOLDS.nightlyStaleRedHours}h).`
      });
    }

    if (nightly.failed24h > 0) {
      alerts.push({
        id: `nightly-failed:${nightly.type}`,
        severity: "red",
        message: `Nightly job ${nightly.type} failed ${nightly.failed24h} time(s) in the last 24h.`
      });
    }
  }

  if (metrics.aiSpend24hUsd > OPS_THRESHOLDS.aiSpendRedUsd) {
    alerts.push({
      id: "ai-spend",
      severity: "red",
      message: `AI spend $${metrics.aiSpend24hUsd.toFixed(2)} in 24h exceeds $${OPS_THRESHOLDS.aiSpendRedUsd} — investigate before it compounds.`
    });
  } else if (metrics.aiSpend24hUsd > OPS_THRESHOLDS.aiSpendAmberUsd) {
    alerts.push({
      id: "ai-spend",
      severity: "amber",
      message: `AI spend $${metrics.aiSpend24hUsd.toFixed(2)} in 24h is above the $${OPS_THRESHOLDS.aiSpendAmberUsd} watchline.`
    });
  }

  if (metrics.aiSpendMonthUsd > OPS_THRESHOLDS.aiBudgetMonthRedUsd) {
    alerts.push({
      id: "ai-budget",
      severity: "red",
      message: `Monthly AI spend $${metrics.aiSpendMonthUsd.toFixed(2)} has blown the $${OPS_THRESHOLDS.aiBudgetMonthRedUsd} budget — pause AI features or raise the budget deliberately.`
    });
  } else if (metrics.aiSpendMonthUsd > OPS_THRESHOLDS.aiBudgetMonthAmberUsd) {
    alerts.push({
      id: "ai-budget",
      severity: "amber",
      message: `Monthly AI spend $${metrics.aiSpendMonthUsd.toFixed(2)} passed the $${OPS_THRESHOLDS.aiBudgetMonthAmberUsd} watchline.`
    });
  }

  if (metrics.submitsObserved24h === 0) {
    alerts.push({
      id: "no-submits",
      severity: "amber",
      message: "No test submissions observed in 24h (expected pre-beta; a canary once users are live)."
    });
  }

  return alerts;
}
