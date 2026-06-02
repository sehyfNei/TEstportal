import { describe, expect, it } from "vitest";
import { evaluateAnswer, scoreAnswer, scoreSession } from "@/lib/test-session/scoring";

const markingRule = {
  marksPerCorrect: 2,
  negativeMarkingFraction: 0.33
};

describe("test session scoring", () => {
  it("scores MCQ and MSQ with exact option matching", () => {
    expect(evaluateAnswer("mcq", { correct_options: [1] }, { options: [1] })).toBe(true);
    expect(evaluateAnswer("mcq", { correct_options: [1] }, { options: [0] })).toBe(false);
    expect(evaluateAnswer("msq", { correct_options: [1, 3] }, { options: [3, 1] })).toBe(true);
    expect(evaluateAnswer("msq", { correct_options: [1, 3] }, { options: [1] })).toBe(false);
  });

  it("scores integer and match answers", () => {
    expect(evaluateAnswer("integer", { correct_integer: 42 }, { integer: "42" })).toBe(true);
    expect(evaluateAnswer("integer", { correct_integer: 42 }, { value: 41 })).toBe(false);
    expect(
      evaluateAnswer(
        "match",
        { pairs: [["A", "1"]] },
        { pairs: [["A", "1"]] }
      )
    ).toBe(true);
  });

  it("handles skipped answers without negative marks", () => {
    expect(scoreAnswer("mcq", { correct_options: [0] }, null, markingRule)).toEqual({
      attempted: false,
      isCorrect: null,
      marksAwarded: 0
    });
    expect(scoreAnswer("mcq", { correct_options: [0] }, { options: [] }, markingRule)).toEqual({
      attempted: false,
      isCorrect: null,
      marksAwarded: 0
    });
  });

  it("applies positive and negative marking", () => {
    expect(scoreAnswer("mcq", { correct_options: [0] }, { options: [0] }, markingRule)).toEqual({
      attempted: true,
      isCorrect: true,
      marksAwarded: 2
    });
    expect(scoreAnswer("mcq", { correct_options: [0] }, { options: [1] }, markingRule)).toEqual({
      attempted: true,
      isCorrect: false,
      marksAwarded: -0.66
    });
  });

  it("aggregates a session result and topic scores", () => {
    const result = scoreSession(
      [
        {
          questionId: "q1",
          topicId: "polity",
          type: "mcq",
          content: { correct_options: [0] },
          selectedAnswer: { options: [0] }
        },
        {
          questionId: "q2",
          topicId: "polity",
          type: "integer",
          content: { correct_integer: 5 },
          selectedAnswer: { integer: 4 }
        },
        {
          questionId: "q3",
          topicId: "history",
          type: "mcq",
          content: { correct_options: [1] },
          selectedAnswer: null
        }
      ],
      markingRule
    );

    expect(result).toMatchObject({
      score: 1.34,
      maxScore: 6,
      accuracy: 0.5,
      attempted: 2,
      correct: 1,
      incorrect: 1,
      skipped: 1
    });
    expect(result.topicScores.polity).toMatchObject({
      score: 1.34,
      maxScore: 4,
      attempted: 2,
      correct: 1,
      incorrect: 1,
      skipped: 0
    });
  });
});
