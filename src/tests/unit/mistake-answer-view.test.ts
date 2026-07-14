import { describe, expect, it } from "vitest";
import { buildAnswerView, type MistakeDetailRow } from "@/lib/mistakes/mistake-list";

function row(overrides: Partial<MistakeDetailRow> = {}): MistakeDetailRow {
  return {
    mistake_id: "m-1",
    question_type: "mcq",
    options: ["Delhi", "Mumbai", "Chennai", "Kolkata"],
    correct_options: [0],
    selected_answer: { options: [1] },
    explanation: "Delhi is the capital.",
    ...overrides
  };
}

describe("buildAnswerView", () => {
  it("maps option indices to option text for a wrong MCQ answer", () => {
    const view = buildAnswerView(row());

    expect(view.yourAnswers).toEqual(["Mumbai"]);
    expect(view.correctAnswers).toEqual(["Delhi"]);
    expect(view.wasCorrect).toBe(false);
    expect(view.explanation).toBe("Delhi is the capital.");
  });

  it("marks a matching answer as correct (lucky-guess mistakes exist)", () => {
    const view = buildAnswerView(row({ selected_answer: { options: [0] } }));

    expect(view.wasCorrect).toBe(true);
  });

  it("handles MSQ multi-select order-insensitively", () => {
    const view = buildAnswerView(
      row({ correct_options: [0, 2], selected_answer: { options: [2, 0] } })
    );

    expect(view.correctAnswers).toEqual(["Delhi", "Chennai"]);
    expect(view.wasCorrect).toBe(true);
  });

  it("treats a missing selection as not attempted", () => {
    const view = buildAnswerView(row({ selected_answer: null }));

    expect(view.yourAnswers).toEqual([]);
    expect(view.wasCorrect).toBe(false);
  });

  it("falls back to positional labels when options are missing", () => {
    const view = buildAnswerView(row({ options: null }));

    expect(view.correctAnswers).toEqual(["Option 1"]);
    expect(view.yourAnswers).toEqual(["Option 2"]);
  });

  it("normalizes blank explanations to null", () => {
    expect(buildAnswerView(row({ explanation: "  " })).explanation).toBeNull();
    expect(buildAnswerView(row({ explanation: null })).explanation).toBeNull();
  });

  it("ignores malformed correct_options and selections", () => {
    const view = buildAnswerView(
      row({ correct_options: "not-an-array", selected_answer: { options: ["x", -1, 1] } })
    );

    expect(view.correctAnswers).toEqual([]);
    expect(view.yourAnswers).toEqual(["Mumbai"]);
    expect(view.wasCorrect).toBe(false);
  });
});
