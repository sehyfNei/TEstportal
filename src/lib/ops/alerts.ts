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
  aiSpendRedUsd: 15
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

  if (metrics.jobsFailed24h > OPS_THRESHOLDS.failedJobsRed) {
    alerts.push({
      id: "jobs-failing",
      severity: "red",
      message: `${metrics.jobsFailed24h} jobs failed or died in the last 24h.`
    });
  } else if (metrics.jobsFailed24h >= OPS_THRESHOLDS.failedJobsAmber) {
    alerts.push({
      id: "jobs-failing",
      severity: "amber",
      message: `${metrics.jobsFailed24h} job(s) failed in the last 24h — check /admin/jobs.`
    });
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

  if (metrics.submitsObserved24h === 0) {
    alerts.push({
      id: "no-submits",
      severity: "amber",
      message: "No test submissions observed in 24h (expected pre-beta; a canary once users are live)."
    });
  }

  return alerts;
}
