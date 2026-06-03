import type { AnalysisOutput } from "@/lib/ai/schemas/analysis";

export type AnalysisStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "disabled"
  | "absent";

export type AnalysisView = {
  status: AnalysisStatus;
  output: AnalysisOutput | null;
};

export const TERMINAL_ANALYSIS_STATUSES: ReadonlySet<AnalysisStatus> = new Set([
  "completed",
  "failed",
  "disabled",
  "absent"
]);

export function isTerminalAnalysisStatus(status: AnalysisStatus): boolean {
  return TERMINAL_ANALYSIS_STATUSES.has(status);
}
