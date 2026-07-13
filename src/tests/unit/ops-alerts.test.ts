import { describe, expect, it } from "vitest";
import { evaluateOpsAlerts, OPS_THRESHOLDS } from "@/lib/ops/alerts";
import type { OpsMetrics } from "@/lib/ops/metrics";

function metrics(overrides: Partial<OpsMetrics> = {}): OpsMetrics {
  return {
    jobsPending: 0,
    oldestPendingAgeMin: null,
    jobsFailed24h: 0,
    jobsSucceeded24h: 5,
    aiSpend24hUsd: 0.5,
    aiCalls24h: 10,
    aiSpendMonthUsd: 2,
    submitsObserved24h: 3,
    warnings: [],
    loadedAt: "2026-07-13T00:00:00.000Z",
    ...overrides
  };
}

describe("evaluateOpsAlerts", () => {
  it("returns no alerts for healthy metrics", () => {
    expect(evaluateOpsAlerts(metrics())).toEqual([]);
  });

  it("does not alert when the oldest pending job is exactly at the age limit", () => {
    const alerts = evaluateOpsAlerts(
      metrics({ oldestPendingAgeMin: OPS_THRESHOLDS.queueAgeRedMin })
    );

    expect(alerts.find((alert) => alert.id === "queue-stalled")).toBeUndefined();
  });

  it("raises red when the oldest pending job exceeds the age limit", () => {
    const alerts = evaluateOpsAlerts(
      metrics({ oldestPendingAgeMin: OPS_THRESHOLDS.queueAgeRedMin + 1 })
    );

    expect(alerts).toContainEqual(
      expect.objectContaining({ id: "queue-stalled", severity: "red" })
    );
  });

  it("ignores queue age when the queue is empty", () => {
    const alerts = evaluateOpsAlerts(metrics({ oldestPendingAgeMin: null, jobsPending: 0 }));

    expect(alerts.find((alert) => alert.id === "queue-stalled")).toBeUndefined();
  });

  it("raises amber at the first failed job and red past the red threshold", () => {
    const amber = evaluateOpsAlerts(metrics({ jobsFailed24h: OPS_THRESHOLDS.failedJobsAmber }));
    const red = evaluateOpsAlerts(metrics({ jobsFailed24h: OPS_THRESHOLDS.failedJobsRed + 1 }));

    expect(amber).toContainEqual(expect.objectContaining({ id: "jobs-failing", severity: "amber" }));
    expect(red).toContainEqual(expect.objectContaining({ id: "jobs-failing", severity: "red" }));
  });

  it("keeps failed jobs amber at exactly the red threshold", () => {
    const alerts = evaluateOpsAlerts(metrics({ jobsFailed24h: OPS_THRESHOLDS.failedJobsRed }));

    expect(alerts).toContainEqual(expect.objectContaining({ id: "jobs-failing", severity: "amber" }));
  });

  it("does not flag AI spend at exactly the amber watchline", () => {
    const alerts = evaluateOpsAlerts(metrics({ aiSpend24hUsd: OPS_THRESHOLDS.aiSpendAmberUsd }));

    expect(alerts.find((alert) => alert.id === "ai-spend")).toBeUndefined();
  });

  it("escalates AI spend from amber to red across the thresholds", () => {
    const amber = evaluateOpsAlerts(
      metrics({ aiSpend24hUsd: OPS_THRESHOLDS.aiSpendAmberUsd + 0.01 })
    );
    const red = evaluateOpsAlerts(metrics({ aiSpend24hUsd: OPS_THRESHOLDS.aiSpendRedUsd + 0.01 }));

    expect(amber).toContainEqual(expect.objectContaining({ id: "ai-spend", severity: "amber" }));
    expect(red).toContainEqual(expect.objectContaining({ id: "ai-spend", severity: "red" }));
  });

  it("does not flag monthly AI spend at exactly the budget watchline", () => {
    const alerts = evaluateOpsAlerts(
      metrics({ aiSpendMonthUsd: OPS_THRESHOLDS.aiBudgetMonthAmberUsd })
    );

    expect(alerts.find((alert) => alert.id === "ai-budget")).toBeUndefined();
  });

  it("escalates monthly AI budget from amber to red across the thresholds", () => {
    const amber = evaluateOpsAlerts(
      metrics({ aiSpendMonthUsd: OPS_THRESHOLDS.aiBudgetMonthAmberUsd + 0.01 })
    );
    const red = evaluateOpsAlerts(
      metrics({ aiSpendMonthUsd: OPS_THRESHOLDS.aiBudgetMonthRedUsd + 0.01 })
    );

    expect(amber).toContainEqual(expect.objectContaining({ id: "ai-budget", severity: "amber" }));
    expect(red).toContainEqual(expect.objectContaining({ id: "ai-budget", severity: "red" }));
  });

  it("flags zero submits in 24h as an amber canary", () => {
    const alerts = evaluateOpsAlerts(metrics({ submitsObserved24h: 0 }));

    expect(alerts).toContainEqual(expect.objectContaining({ id: "no-submits", severity: "amber" }));
  });

  it("stacks independent alerts", () => {
    const alerts = evaluateOpsAlerts(
      metrics({
        oldestPendingAgeMin: 60,
        jobsFailed24h: 10,
        aiSpend24hUsd: 20,
        submitsObserved24h: 0
      })
    );

    expect(alerts.map((alert) => alert.id).sort()).toEqual([
      "ai-spend",
      "jobs-failing",
      "no-submits",
      "queue-stalled"
    ]);
  });
});
