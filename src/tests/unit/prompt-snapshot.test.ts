import { describe, expect, it } from "vitest";
import { buildPromptSnapshot } from "@/lib/test-session/prompt-snapshot";

describe("buildPromptSnapshot", () => {
  it("copies only safe MCQ prompt fields", () => {
    const snapshot = buildPromptSnapshot(
      {
        text: "Choose the correct option.",
        options: ["A", "B", "C", "D"],
        images: ["question.png"],
        correct_options: [2],
        explanation: "The answer is C.",
        nested: { correct_option: 2 }
      },
      "mcq"
    );

    expect(snapshot).toEqual({
      type: "mcq",
      text: "Choose the correct option.",
      options: ["A", "B", "C", "D"],
      images: ["question.png"]
    });
    expect(snapshot).not.toHaveProperty("correct_options");
    expect(snapshot).not.toHaveProperty("explanation");
    expect(snapshot).not.toHaveProperty("nested");
  });

  it("does not leak match pairs", () => {
    const snapshot = buildPromptSnapshot(
      {
        text: "Match the columns.",
        left: ["Article 21", "Article 32"],
        right: ["Life and liberty", "Constitutional remedies"],
        pairs: [
          ["Article 21", "Life and liberty"],
          ["Article 32", "Constitutional remedies"]
        ],
        correct_options: [0]
      },
      "match"
    );

    expect(snapshot).toEqual({
      type: "match",
      text: "Match the columns.",
      left: ["Article 21", "Article 32"],
      right: ["Life and liberty", "Constitutional remedies"]
    });
    expect(snapshot).not.toHaveProperty("pairs");
    expect(JSON.stringify(snapshot)).not.toContain("correct");
  });

  it("uses type-specific allowlists for statement, assertion, and integer prompts", () => {
    expect(
      buildPromptSnapshot(
        {
          statements: ["Statement 1", "Statement 2"],
          options: ["1 only", "2 only"],
          correct_options: [0]
        },
        "statement"
      )
    ).toEqual({
      type: "statement",
      statements: ["Statement 1", "Statement 2"]
    });

    expect(
      buildPromptSnapshot(
        {
          assertion: "Assertion text",
          reason: "Reason text",
          correct_options: [1]
        },
        "assertion"
      )
    ).toEqual({
      type: "assertion",
      assertion: "Assertion text",
      reason: "Reason text"
    });

    expect(
      buildPromptSnapshot(
        {
          text: "Enter the integer.",
          correct_integer: 42,
          explanation_detail: "Hidden"
        },
        "integer"
      )
    ).toEqual({
      type: "integer",
      text: "Enter the integer."
    });
  });
});
