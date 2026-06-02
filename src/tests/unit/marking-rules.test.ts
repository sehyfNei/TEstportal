import { describe, expect, it } from "vitest";
import { evaluateAnswer } from "@/lib/scoring/answer-eval";
import {
  applyMarkingRule,
  buildMarkingRuleFromManifest,
  DEFAULT_MARKING_RULE
} from "@/lib/scoring/marking-rules";
import { scoreQuestion, scoreSession } from "@/lib/scoring/score-session";

const markingRule = {
  marksPerCorrect: 2,
  negativeMarkingFraction: 0.33
};

describe("answer evaluation", () => {
  it("evaluates mcq answers and skips malformed single-choice selections", () => {
    expect(evaluateAnswer("mcq", { correct_options: [1] }, { options: [1] })).toBe(true);
    expect(evaluateAnswer("mcq", { correct_options: [1] }, { options: [0] })).toBe(false);
    expect(evaluateAnswer("mcq", { correct_options: [1] }, null)).toBeNull();
    expect(evaluateAnswer("mcq", { correct_options: [1] }, { options: [0, 1] })).toBeNull();
    expect(evaluateAnswer("mcq", { correct_options: [0, 1] }, { options: [0] })).toBe(false);
  });

  it("evaluates msq answers as all-or-nothing", () => {
    expect(evaluateAnswer("msq", { correct_options: [1, 3] }, { options: [3, 1] })).toBe(true);
    expect(evaluateAnswer("msq", { correct_options: [1, 3] }, { options: [1] })).toBe(false);
    expect(evaluateAnswer("msq", { correct_options: [1, 3] }, null)).toBeNull();
  });

  it("evaluates integer answers from strings and numbers", () => {
    expect(evaluateAnswer("integer", { correct_integer: 42 }, { integer: "42" })).toBe(true);
    expect(evaluateAnswer("integer", { correct_integer: 42 }, { value: 41 })).toBe(false);
    expect(evaluateAnswer("integer", { correct_integer: 42 }, null)).toBeNull();
  });

  it("evaluates statement answers explicitly as single-choice", () => {
    expect(evaluateAnswer("statement", { correct_options: [2] }, { options: [2] })).toBe(true);
    expect(evaluateAnswer("statement", { correct_options: [2] }, { options: [1] })).toBe(false);
    expect(evaluateAnswer("statement", { correct_options: [2] }, null)).toBeNull();
    expect(evaluateAnswer("statement", { correct_options: [2] }, { options: [1, 2] })).toBeNull();
    expect(evaluateAnswer("statement", { correct_options: [1, 2] }, { options: [1] })).toBe(false);
  });

  it("evaluates assertion answers explicitly as single-choice", () => {
    expect(evaluateAnswer("assertion", { correct_options: [3] }, { options: [3] })).toBe(true);
    expect(evaluateAnswer("assertion", { correct_options: [3] }, { options: [0] })).toBe(false);
    expect(evaluateAnswer("assertion", { correct_options: [3] }, null)).toBeNull();
    expect(evaluateAnswer("assertion", { correct_options: [3] }, { options: [0, 3] })).toBeNull();
    expect(evaluateAnswer("assertion", { correct_options: [0, 3] }, { options: [0] })).toBe(false);
  });

  it("evaluates match answers without depending on pair order", () => {
    expect(
      evaluateAnswer(
        "match",
        { pairs: [["A", "1"], ["B", "2"]] },
        { pairs: [["B", "2"], ["A", "1"]] }
      )
    ).toBe(true);
    expect(
      evaluateAnswer(
        "match",
        { pairs: [["A", "1"], ["B", "2"]] },
        { pairs: [["A", "2"], ["B", "1"]] }
      )
    ).toBe(false);
    expect(evaluateAnswer("match", { pairs: [["A", "1"]] }, {})).toBeNull();
  });

  it("treats null answers as skipped for all supported types", () => {
    const cases = [
      ["mcq", { correct_options: [0] }],
      ["msq", { correct_options: [0, 1] }],
      ["integer", { correct_integer: 7 }],
      ["statement", { correct_options: [0] }],
      ["assertion", { correct_options: [0] }],
      ["match", { pairs: [["A", "1"]] }]
    ] as const;

    for (const [type, content] of cases) {
      expect(scoreQuestion(type, content, null, markingRule)).toEqual({
        attempted: false,
        isCorrect: null,
        marksAwarded: 0
      });
    }
  });
});

describe("marking rules", () => {
  it("keeps the default marking rule unchanged", () => {
    expect(DEFAULT_MARKING_RULE).toEqual({
      marksPerCorrect: 2,
      negativeMarkingFraction: 0.33
    });
  });

  it("applies positive, negative, skipped, and type-exempt marking", () => {
    expect(applyMarkingRule("mcq", true, markingRule)).toEqual({
      attempted: true,
      isCorrect: true,
      marksAwarded: 2
    });
    expect(applyMarkingRule("mcq", false, markingRule)).toEqual({
      attempted: true,
      isCorrect: false,
      marksAwarded: -0.66
    });
    expect(applyMarkingRule("mcq", null, markingRule)).toEqual({
      attempted: false,
      isCorrect: null,
      marksAwarded: 0
    });
    expect(
      applyMarkingRule("integer", false, {
        ...markingRule,
        noNegativeForTypes: ["integer"]
      })
    ).toEqual({
      attempted: true,
      isCorrect: false,
      marksAwarded: 0
    });
  });

  it("builds marking rules from valid manifest strings and numbers", () => {
    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "3",
        negativeMarkingFraction: "0.25"
      })
    ).toEqual({
      marksPerCorrect: 3,
      negativeMarkingFraction: 0.25
    });

    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: 4,
        negativeMarkingFraction: 0.5
      })
    ).toEqual({
      marksPerCorrect: 4,
      negativeMarkingFraction: 0.5
    });
  });

  it("falls back to the default marking rule for invalid manifest values", () => {
    expect(buildMarkingRuleFromManifest(null)).toEqual(DEFAULT_MARKING_RULE);
    expect(buildMarkingRuleFromManifest(undefined)).toEqual(DEFAULT_MARKING_RULE);
    expect(buildMarkingRuleFromManifest("invalid")).toEqual(DEFAULT_MARKING_RULE);
    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "abc",
        negativeMarkingFraction: "0.25"
      })
    ).toEqual(DEFAULT_MARKING_RULE);
    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "-3",
        negativeMarkingFraction: "0.25"
      })
    ).toEqual(DEFAULT_MARKING_RULE);
    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "3",
        negativeMarkingFraction: "0x1"
      })
    ).toEqual(DEFAULT_MARKING_RULE);
  });

  it("includes noNegativeForTypes only when manifest value is a string array", () => {
    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "3",
        negativeMarkingFraction: "0.25",
        noNegativeForTypes: ["integer"]
      })
    ).toEqual({
      marksPerCorrect: 3,
      negativeMarkingFraction: 0.25,
      noNegativeForTypes: ["integer"]
    });

    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "3",
        negativeMarkingFraction: "0.25",
        noNegativeForTypes: [1, "integer"]
      })
    ).toEqual({
      marksPerCorrect: 3,
      negativeMarkingFraction: 0.25
    });

    expect(
      buildMarkingRuleFromManifest({
        marksPerCorrect: "3",
        negativeMarkingFraction: "0.25",
        noNegativeForTypes: null
      })
    ).toEqual({
      marksPerCorrect: 3,
      negativeMarkingFraction: 0.25
    });
  });
});

describe("session scoring", () => {
  it("combines answer evaluation and marking for a single question", () => {
    expect(scoreQuestion("mcq", { correct_options: [0] }, { options: [0] }, markingRule)).toEqual({
      attempted: true,
      isCorrect: true,
      marksAwarded: 2
    });
  });

  it("aggregates session score, accuracy, and topic scores", () => {
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
          type: "msq",
          content: { correct_options: [1, 2] },
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
    expect(result.topicScores.history).toMatchObject({
      score: 0,
      maxScore: 2,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      skipped: 1
    });
  });
});
