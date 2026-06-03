import type { PlanOutput } from "@/lib/ai/schemas/plan";

export type PlanStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "disabled"
  | "absent";

export type PlanView = {
  status: PlanStatus;
  output: PlanOutput | null;
};

export const TERMINAL_PLAN_STATUSES: ReadonlySet<PlanStatus> = new Set([
  "completed",
  "failed",
  "disabled",
  "absent"
]);

export function isTerminalPlanStatus(status: PlanStatus): boolean {
  return TERMINAL_PLAN_STATUSES.has(status);
}
