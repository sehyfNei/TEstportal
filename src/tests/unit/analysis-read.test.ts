import { describe, expect, it } from "vitest";
import { toAnalysisView } from "@/lib/ai/analysis-read";
import { isTerminalAnalysisStatus } from "@/lib/ai/analysis-view";

function validOutput() {
  return {
    questionAnalyses: [
      {
        questionId: "q-1",
        whyCorrect: "Art 14 is the equality article.",
        whySelectedWrong: null,
        trapExplanation: null
      }
    ],
    topicSummaries: [
      {
        topicName: "Polity",
        summary: "Strong grasp.",
        recommendation: "Keep revising."
      }
    ],
    overallSummary: "Solid fundamentals.",
    strategyInsights: [],
    nextActions: []
  };
}

describe("toAnalysisView", () => {
  it("returns absent for a null row", () => {
    expect(toAnalysisView(null)).toEqual({ status: "absent", output: null });
  });

  it("returns completed with parsed output for a valid completed row", () => {
    const view = toAnalysisView({ status: "completed", output: validOutput() });

    expect(view.status).toBe("completed");
    expect(view.output).toMatchObject({ overallSummary: "Solid fundamentals." });
  });

  it("degrades a completed row with malformed output to failed", () => {
    const view = toAnalysisView({ status: "completed", output: { overallSummary: 123 } });

    expect(view).toEqual({ status: "failed", output: null });
  });

  it("passes through running status without output", () => {
    expect(toAnalysisView({ status: "running", output: null })).toEqual({
      status: "running",
      output: null
    });
  });

  it("passes through pending, failed, and disabled statuses", () => {
    expect(toAnalysisView({ status: "pending", output: null }).status).toBe("pending");
    expect(toAnalysisView({ status: "failed", output: null }).status).toBe("failed");
    expect(toAnalysisView({ status: "disabled", output: null }).status).toBe("disabled");
  });

  it("treats an unknown status as failed", () => {
    expect(toAnalysisView({ status: "weird", output: null })).toEqual({
      status: "failed",
      output: null
    });
  });
});

describe("isTerminalAnalysisStatus", () => {
  it("treats completed, failed, disabled, and absent as terminal", () => {
    expect(isTerminalAnalysisStatus("completed")).toBe(true);
    expect(isTerminalAnalysisStatus("failed")).toBe(true);
    expect(isTerminalAnalysisStatus("disabled")).toBe(true);
    expect(isTerminalAnalysisStatus("absent")).toBe(true);
  });

  it("treats pending and running as non-terminal", () => {
    expect(isTerminalAnalysisStatus("pending")).toBe(false);
    expect(isTerminalAnalysisStatus("running")).toBe(false);
  });
});
