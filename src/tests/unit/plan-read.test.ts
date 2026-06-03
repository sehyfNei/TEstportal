import { describe, expect, it } from "vitest";
import { toPlanView } from "@/lib/ai/plan-read";
import { isTerminalPlanStatus } from "@/lib/ai/plan-view";

function validOutput() {
  return {
    overallStrategy: "Focus the next two weeks on high-weight weak topics.",
    prioritizedTopics: [
      {
        topicName: "Polity",
        rationale: "High weight and low mastery make this the top priority.",
        focusActions: ["Revise Fundamental Rights", "Attempt 20 PYQs"]
      }
    ],
    nextActions: ["Schedule a Polity practice set"]
  };
}

describe("toPlanView", () => {
  it("returns absent for a null row", () => {
    expect(toPlanView(null)).toEqual({ status: "absent", output: null });
  });

  it("returns completed with parsed output for a valid completed row", () => {
    const view = toPlanView({ status: "completed", output: validOutput() });

    expect(view.status).toBe("completed");
    expect(view.output).toMatchObject({ overallStrategy: "Focus the next two weeks on high-weight weak topics." });
  });

  it("degrades a completed row with malformed output to failed", () => {
    const view = toPlanView({ status: "completed", output: { prioritizedTopics: [] } });

    expect(view).toEqual({ status: "failed", output: null });
  });

  it("passes through running status without output", () => {
    expect(toPlanView({ status: "running", output: null })).toEqual({
      status: "running",
      output: null
    });
  });

  it("passes through pending, failed, and disabled statuses", () => {
    expect(toPlanView({ status: "pending", output: null }).status).toBe("pending");
    expect(toPlanView({ status: "failed", output: null }).status).toBe("failed");
    expect(toPlanView({ status: "disabled", output: null }).status).toBe("disabled");
  });

  it("treats an unknown status as failed", () => {
    expect(toPlanView({ status: "weird", output: null })).toEqual({
      status: "failed",
      output: null
    });
  });
});

describe("isTerminalPlanStatus", () => {
  it("treats completed, failed, disabled, and absent as terminal", () => {
    expect(isTerminalPlanStatus("completed")).toBe(true);
    expect(isTerminalPlanStatus("failed")).toBe(true);
    expect(isTerminalPlanStatus("disabled")).toBe(true);
    expect(isTerminalPlanStatus("absent")).toBe(true);
  });

  it("treats pending and running as non-terminal", () => {
    expect(isTerminalPlanStatus("pending")).toBe(false);
    expect(isTerminalPlanStatus("running")).toBe(false);
  });
});
