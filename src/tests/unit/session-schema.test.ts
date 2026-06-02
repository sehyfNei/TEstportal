import { describe, expect, it } from "vitest";
import {
  SESSION_ANSWER_CONFIDENCE,
  TEST_SESSION_STATUSES,
  TEST_TEMPLATE_SELECTION_MODES,
  TEST_TEMPLATE_TYPES,
  sessionAnswers,
  sessionQuestions,
  sessionResults,
  testSessions,
  testTemplates
} from "@/lib/db/schema/session";

describe("test session schema constants", () => {
  it("supports the planned test template and session variants", () => {
    expect(TEST_TEMPLATE_TYPES).toEqual([
      "diagnostic",
      "topic",
      "concept_retest",
      "sectional",
      "mock",
      "benchmark",
      "custom"
    ]);
    expect(TEST_TEMPLATE_SELECTION_MODES).toEqual([
      "fixed",
      "random_weighted",
      "adaptive_practice",
      "fsrs_retest",
      "custom"
    ]);
    expect(TEST_SESSION_STATUSES).toContain("in_progress");
    expect(TEST_SESSION_STATUSES).toContain("scored");
    expect(TEST_SESSION_STATUSES).toContain("analyzed");
    expect(SESSION_ANSWER_CONFIDENCE).toEqual(["sure", "unsure", "guessed"]);
  });

  it("models sanitized question snapshots, answer autosave, and scored results", () => {
    expect(testTemplates).toHaveProperty("selectionMode");
    expect(testSessions).toHaveProperty("tabSwitchCount");
    expect(sessionQuestions).toHaveProperty("promptSnapshot");
    expect(sessionAnswers).toHaveProperty("markedReview");
    expect(sessionResults).toHaveProperty("topicScores");
  });
});
