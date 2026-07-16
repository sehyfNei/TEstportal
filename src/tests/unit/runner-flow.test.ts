import { describe, expect, it } from "vitest";
import { shouldAdvanceAfterConfidence } from "@/lib/test-session/runner-flow";

describe("shouldAdvanceAfterConfidence", () => {
  it("advances after confidence is recorded for an answered question", () => {
    expect(
      shouldAdvanceAfterConfidence({
        answer: { options: [0] },
        confidence: "sure",
        currentIndex: 0,
        questionCount: 10
      })
    ).toBe(true);
  });

  it("stays put when the question is unanswered", () => {
    expect(
      shouldAdvanceAfterConfidence({
        answer: null,
        confidence: "unsure",
        currentIndex: 0,
        questionCount: 10
      })
    ).toBe(false);
  });

  it("stays on the final question", () => {
    expect(
      shouldAdvanceAfterConfidence({
        answer: { options: [1] },
        confidence: "guessed",
        currentIndex: 9,
        questionCount: 10
      })
    ).toBe(false);
  });

  it("does not advance when confidence is cleared", () => {
    expect(
      shouldAdvanceAfterConfidence({
        answer: { options: [1] },
        confidence: null,
        currentIndex: 2,
        questionCount: 10
      })
    ).toBe(false);
  });
});

