import { describe, expect, it } from "vitest";
import {
  makeIntegerAnswer,
  makeMcqAnswer,
  normalizeSelectedAnswer,
  selectedAnswerToJson,
  toggleMsqAnswer
} from "@/lib/test-session/answer-shape";

describe("answer shape helpers", () => {
  it("creates scorer-compatible MCQ answers", () => {
    const answer = makeMcqAnswer(2);

    expect(answer).toEqual({ options: [2] });
    expect(selectedAnswerToJson(answer)).toBe('{"options":[2]}');
  });

  it("creates stable exact-match MSQ answers", () => {
    const first = toggleMsqAnswer(null, 3);
    const second = toggleMsqAnswer(first, 1);
    const third = toggleMsqAnswer(second, 3);

    expect(second).toEqual({ options: [1, 3] });
    expect(selectedAnswerToJson(second)).toBe('{"options":[1,3]}');
    expect(third).toEqual({ options: [1] });
  });

  it("creates scorer-compatible integer answers", () => {
    const answer = makeIntegerAnswer("42");

    expect(answer).toEqual({ integer: 42 });
    expect(selectedAnswerToJson(answer)).toBe('{"integer":42}');
    expect(makeIntegerAnswer("")).toBeNull();
    expect(makeIntegerAnswer("not a number")).toBeNull();
  });

  it("normalizes existing saved answers by question type", () => {
    expect(normalizeSelectedAnswer("mcq", { options: [2, 1] })).toEqual({ options: [1] });
    expect(normalizeSelectedAnswer("msq", { selected_options: ["3", "1"] })).toEqual({
      options: [1, 3]
    });
    expect(normalizeSelectedAnswer("integer", { value: "7" })).toEqual({ integer: 7 });
    expect(normalizeSelectedAnswer("match", { pairs: [] })).toBeNull();
  });
});
