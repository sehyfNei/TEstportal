"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getSessionPlanAction } from "@/app/test/actions";
import { isTerminalPlanStatus, type PlanStatus, type PlanView } from "@/lib/ai/plan-view";
import type { PlanOutput } from "@/lib/ai/schemas/plan";

const MAX_POLLS = 20;
const POLL_INTERVAL_MS = 3000;

type PlanPanelProps = {
  initialPlan: PlanView | null;
  sessionId: string;
};

export function PlanPanel({ initialPlan, sessionId }: PlanPanelProps) {
  const [plan, setPlan] = useState<PlanView>(
    initialPlan ?? { status: "running", output: null }
  );
  const [isPolling, startPolling] = useTransition();
  const attemptsRef = useRef(0);

  const fetchPlan = useCallback(() => {
    startPolling(async () => {
      const next = await getSessionPlanAction(sessionId);
      if (next.ok) {
        setPlan(next.plan);
      }
    });
  }, [sessionId]);

  useEffect(() => {
    if (isTerminalPlanStatus(plan.status) || attemptsRef.current >= MAX_POLLS) {
      return;
    }

    const timer = window.setTimeout(() => {
      attemptsRef.current += 1;
      fetchPlan();
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [plan.status, fetchPlan, isPolling]);

  const handleRefresh = useCallback(() => {
    attemptsRef.current = 0;
    fetchPlan();
  }, [fetchPlan]);

  if (plan.status === "absent") {
    return null;
  }

  if (plan.status === "completed" && plan.output) {
    return <PlanReport output={plan.output} />;
  }

  return <PendingPanel status={plan.status} isPolling={isPolling} onRefresh={handleRefresh} />;
}

function PendingPanel({
  status,
  isPolling,
  onRefresh
}: {
  isPolling: boolean;
  onRefresh: () => void;
  status: PlanStatus;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">AI study plan</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{statusMessage(status)}</p>
        </div>
        {status === "pending" || status === "running" || status === "failed" ? (
          <button
            className="h-9 rounded-md border border-border px-3 text-sm font-semibold transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPolling}
            onClick={onRefresh}
            type="button"
          >
            {isPolling ? "Checking..." : "Refresh"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function statusMessage(status: PlanStatus): string {
  if (status === "pending" || status === "running") {
    return "Building your study plan...";
  }

  if (status === "disabled") {
    return "AI study plans are currently turned off.";
  }

  return "We couldn't generate a study plan for this attempt. You can click Refresh to try again.";
}

function PlanReport({ output }: { output: PlanOutput }) {
  return (
    <div className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-5">
      <div>
        <p className="text-sm font-medium text-primary">Your study plan</p>
        <p className="mt-2 text-sm leading-7">{output.overallStrategy}</p>
      </div>

      {output.prioritizedTopics.length ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Prioritized topics</h3>
          <div className="grid gap-3">
            {output.prioritizedTopics.map((topic, index) => (
              <div key={`${topic.topicName}-${index}`} className="rounded-md border border-border p-4">
                <p className="font-semibold">{topic.topicName}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.rationale}</p>
                {topic.focusActions.length ? (
                  <ul className="mt-2 ml-5 list-disc text-sm leading-7">
                    {topic.focusActions.map((action, actionIndex) => (
                      <li key={actionIndex}>{action}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {output.nextActions.length ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Next actions</h3>
          <ul className="ml-5 list-disc text-sm leading-7">
            {output.nextActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
