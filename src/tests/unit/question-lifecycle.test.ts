import { describe, expect, it } from "vitest";
import {
  QUESTION_STATUS_TRANSITIONS,
  canTransitionQuestionStatus,
  isQuestionStatus
} from "@/lib/question-bank/question-lifecycle";

describe("question lifecycle transitions", () => {
  it("allows founder-approved fast-track forward skips", () => {
    expect(canTransitionQuestionStatus("draft", "live")).toBe(true);
    expect(canTransitionQuestionStatus("validated", "live")).toBe(true);
    expect(canTransitionQuestionStatus("reviewed", "approved")).toBe(true);
  });

  it("restricts flagged and retired transitions", () => {
    expect(canTransitionQuestionStatus("draft", "flagged")).toBe(false);
    expect(canTransitionQuestionStatus("live", "flagged")).toBe(true);
    expect(canTransitionQuestionStatus("flagged", "approved")).toBe(false);
    expect(canTransitionQuestionStatus("retired", "draft")).toBe(true);
    expect(canTransitionQuestionStatus("retired", "live")).toBe(false);
  });

  it("does not treat same-status writes as lifecycle transitions", () => {
    expect(canTransitionQuestionStatus("draft", "draft")).toBe(false);
    expect(canTransitionQuestionStatus("live", "live")).toBe(false);
  });

  it("keeps every status represented in the transition map", () => {
    expect(Object.keys(QUESTION_STATUS_TRANSITIONS).sort()).toEqual([
      "approved",
      "draft",
      "flagged",
      "live",
      "retired",
      "reviewed",
      "validated"
    ]);
    expect(isQuestionStatus("approved")).toBe(true);
    expect(isQuestionStatus("pending")).toBe(false);
  });
});
