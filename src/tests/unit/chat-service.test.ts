import { describe, expect, it } from "vitest";
import { buildSystemMessage } from "@/lib/chat/chat-service";
import type { ContextPayload } from "@/lib/chat/context-injector";

describe("buildSystemMessage", () => {
  it("guides a new user without exposing readiness text", () => {
    const message = buildSystemMessage(context({ hasData: false }));

    expect(message.role).toBe("system");
    expect(message.content).toContain("student is new");
    expect(message.content).toContain("what topic they want to work on");
    expect(message.content).not.toContain("/100");
  });

  it("includes the exam name and readiness for a known user", () => {
    const message = buildSystemMessage(
      context({
        examName: "UPSC Prelims",
        hasData: true,
        readinessScore: 55,
        readinessConfidence: "medium"
      })
    );

    expect(message.content).toContain("UPSC Prelims");
    expect(message.content).toContain("55/100");
    expect(message.content).toContain("medium confidence");
  });

  it("includes weak-topic context", () => {
    const message = buildSystemMessage(
      context({
        hasData: true,
        weakTopics: [
          { topicName: "Polity", masteryScore: 35, weightPercent: 20 },
          { topicName: "Modern History", masteryScore: 42, weightPercent: 15 }
        ]
      })
    );

    expect(message.content).toContain("Weak topics:");
    expect(message.content).toContain("Polity");
    expect(message.content).toContain("Modern History");
  });

  it("includes the current improvement plan headline", () => {
    const message = buildSystemMessage(
      context({
        hasData: true,
        improvementPlanHeadline: "Focus on Modern History"
      })
    );

    expect(message.content).toContain("Current study plan:");
    expect(message.content).toContain("Focus on Modern History");
  });
});

function context(overrides: Partial<ContextPayload> = {}): ContextPayload {
  return {
    examName: null,
    readinessScore: 0,
    readinessConfidence: "low",
    weakTopics: [],
    recentMistakes: [],
    improvementPlanHeadline: null,
    hasData: false,
    ...overrides
  };
}
