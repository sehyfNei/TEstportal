import { describe, expect, it } from "vitest";
import {
  PLAN_PROMPT_VERSION,
  PLAN_SCHEMA_VERSION,
  buildPlanMessages,
  validatePlanOutput,
  type PlanInput
} from "@/lib/ai/schemas/plan";

describe("validatePlanOutput", () => {
  it("accepts a well-formed plan", () => {
    const result = validatePlanOutput({
      overallStrategy: "Focus the next two weeks on high-weight weak topics.",
      prioritizedTopics: [
        {
          topicName: "Polity",
          rationale: "High weight and low mastery make this the top priority.",
          focusActions: ["Revise Fundamental Rights", "Attempt 20 PYQs"]
        }
      ],
      nextActions: ["Schedule a Polity practice set"]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.prioritizedTopics).toHaveLength(1);
    }
  });

  it("rejects an empty prioritizedTopics array", () => {
    const result = validatePlanOutput({
      overallStrategy: "Plan.",
      prioritizedTopics: [],
      nextActions: ["Do something"]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("prioritizedTopics");
    }
  });

  it("rejects an empty nextActions array", () => {
    const result = validatePlanOutput({
      overallStrategy: "Plan.",
      prioritizedTopics: [
        { topicName: "Polity", rationale: "Weak.", focusActions: [] }
      ],
      nextActions: []
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a blank overallStrategy", () => {
    const result = validatePlanOutput({
      overallStrategy: "",
      prioritizedTopics: [
        { topicName: "Polity", rationale: "Weak.", focusActions: [] }
      ],
      nextActions: ["Do something"]
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a blank topic rationale", () => {
    const result = validatePlanOutput({
      overallStrategy: "Plan.",
      prioritizedTopics: [
        { topicName: "Polity", rationale: "", focusActions: [] }
      ],
      nextActions: ["Do something"]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("rationale");
    }
  });
});

describe("buildPlanMessages", () => {
  it("emits a grounded system prompt and serializes the input", () => {
    const input: PlanInput = {
      examName: "UPSC Prelims",
      readinessScore: 42,
      confidenceLevel: "low",
      coveragePercent: 0.3,
      score: 4,
      maxScore: 8,
      accuracy: 0.5,
      weakTopics: [
        { topicName: "Polity", masteryScore: 30, weightPercent: 20, priority: 14 }
      ]
    };

    const messages = buildPlanMessages(input);

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Do not recompute");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("UPSC Prelims");
    expect(messages[1].content).toContain(PLAN_SCHEMA_VERSION);
  });

  it("exposes stable schema and prompt version constants", () => {
    expect(PLAN_SCHEMA_VERSION).toBe("1.0.0");
    expect(PLAN_PROMPT_VERSION).toBe("improvement_plan@1.0.0");
  });
});
