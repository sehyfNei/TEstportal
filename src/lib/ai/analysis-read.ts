import { validateAnalysisOutput } from "@/lib/ai/schemas/analysis";
import type { AnalysisStatus, AnalysisView } from "@/lib/ai/analysis-view";

export type AnalysisRow = {
  status: string;
  output: unknown;
};

export function toAnalysisView(row: AnalysisRow | null): AnalysisView {
  if (!row) {
    return { status: "absent", output: null };
  }

  if (row.status === "completed") {
    const validation = validateAnalysisOutput(row.output);
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
    return { status: row.status as AnalysisStatus, output: null };
  }

  return { status: "failed", output: null };
}
