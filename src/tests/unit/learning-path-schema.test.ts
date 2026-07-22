import { describe, expect, it } from "vitest";
import {
  LEARNING_PATH_PROMPT_VERSION,
  LEARNING_PATH_SCHEMA_VERSION,
  buildLearningPathMessages,
  validateLearningPathOutput,
  type LearningPathInput
} from "@/lib/ai/schemas/learning-path";

const TOPIC_ID = "11111111-1111-4111-8111-111111111111";

describe("validateLearningPathOutput", () => {
  it("accepts a well-formed milestone plan", () => {
    const result = validateLearningPathOutput({
      milestones: [{ topicId: TOPIC_ID, weekNumber: 1, targetMastery: 65 }]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.milestones).toHaveLength(1);
    }
  });

  it("rejects an empty milestones array", () => {
    const result = validateLearningPathOutput({ milestones: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-uuid topicId", () => {
    const result = validateLearningPathOutput({
      milestones: [{ topicId: "not-a-uuid", weekNumber: 1, targetMastery: 50 }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a weekNumber below 1", () => {
    const result = validateLearningPathOutput({
      milestones: [{ topicId: TOPIC_ID, weekNumber: 0, targetMastery: 50 }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a targetMastery outside 0-100", () => {
    const result = validateLearningPathOutput({
      milestones: [{ topicId: TOPIC_ID, weekNumber: 1, targetMastery: 150 }]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(validateLearningPathOutput("not json").ok).toBe(false);
    expect(validateLearningPathOutput(null).ok).toBe(false);
  });
});

describe("buildLearningPathMessages", () => {
  const input: LearningPathInput = {
    examName: "UPSC Prelims",
    goal: "Clear Prelims 2026",
    totalWeeks: 8,
    weakTopics: [{ topicId: TOPIC_ID, topicName: "Polity", masteryScore: 30, weightPercent: 20 }]
  };

  it("names the exam, goal, and total weeks in the system prompt", () => {
    const messages = buildLearningPathMessages(input);
    const system = messages.find((m) => m.role === "system")?.content ?? "";

    expect(system).toContain("UPSC Prelims");
    expect(system).toContain("Clear Prelims 2026");
    expect(system).toContain("exactly 8 week(s)");
    expect(system).toContain("1 to 8");
  });

  it("instructs the model to cover every supplied topic and keep topicId verbatim", () => {
    const messages = buildLearningPathMessages(input);
    const system = messages.find((m) => m.role === "system")?.content ?? "";

    expect(system).toContain("at least one milestone entry");
    expect(system).toContain("must include every supplied topicId at least once");
  });

  it("serializes the full input as the user message", () => {
    const messages = buildLearningPathMessages(input);
    const user = messages.find((m) => m.role === "user")?.content ?? "";

    expect(JSON.parse(user)).toMatchObject({ task: "generate_learning_path", goal: "Clear Prelims 2026" });
  });

  it("exposes stable schema and prompt version constants", () => {
    expect(LEARNING_PATH_SCHEMA_VERSION).toBe("1.0.0");
    expect(LEARNING_PATH_PROMPT_VERSION).toBe("learning_path_generation@1.0.0");
  });
});
