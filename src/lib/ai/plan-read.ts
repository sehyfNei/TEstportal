import { validatePlanOutput } from "@/lib/ai/schemas/plan";
import type { PlanStatus, PlanView } from "@/lib/ai/plan-view";

export type PlanRow = {
  status: string;
  output: unknown;
};

export function toPlanView(row: PlanRow | null): PlanView {
  if (!row) {
    return { status: "absent", output: null };
  }

  if (row.status === "completed") {
    const validation = validatePlanOutput(row.output);
    return validation.ok
      ? { status: "completed", output: validation.data }
      : { status: "failed", output: null };
  }

  if (
    row.status === "pending" ||
    row.status === "running" ||
    row.status === "failed" ||
    row.status === "disabled"
  ) {
    return { status: row.status as PlanStatus, output: null };
  }

  return { status: "failed", output: null };
}
