import { describe, expect, it } from "vitest";
import { classifyMistake, type MistakeClassificationInput } from "@/lib/jobs/handlers/create-mistake-items";

describe("classifyMistake", () => {
  const cases: Array<{
    name: string;
    input: MistakeClassificationInput;
    expected: ReturnType<typeof classifyMistake>;
  }> = [
    {
      name: "classifies wrong sure answers as overconfidence",
      input: { isCorrect: false, confidence: "sure", markedReview: false },
      expected: "overconfidence"
    },
    {
      name: "classifies wrong unsure answers as conceptual gaps",
      input: { isCorrect: false, confidence: "unsure", markedReview: false },
      expected: "conceptual_gap"
    },
    {
      name: "classifies wrong answers with null confidence as conceptual gaps",
      input: { isCorrect: false, confidence: null, markedReview: false },
      expected: "conceptual_gap"
    },
    {
      name: "classifies wrong guessed answers as conceptual gaps",
      input: { isCorrect: false, confidence: "guessed", markedReview: false },
      expected: "conceptual_gap"
    },
    {
      name: "prioritizes wrong sure answers over marked review",
      input: { isCorrect: false, confidence: "sure", markedReview: true },
      expected: "overconfidence"
    },
    {
      name: "classifies skipped answers as not attempted",
      input: { isCorrect: null, confidence: null, markedReview: false },
      expected: "not_attempted"
    },
    {
      name: "prioritizes skipped answers over guessed confidence",
      input: { isCorrect: null, confidence: "guessed", markedReview: false },
      expected: "not_attempted"
    },
    {
      name: "classifies correct guessed answers as lucky guesses",
      input: { isCorrect: true, confidence: "guessed", markedReview: false },
      expected: "lucky_guess"
    },
    {
      name: "classifies correct marked answers with null confidence as bookmarked",
      input: { isCorrect: true, confidence: null, markedReview: true },
      expected: "bookmarked"
    },
    {
      name: "classifies correct sure marked answers as bookmarked",
      input: { isCorrect: true, confidence: "sure", markedReview: true },
      expected: "bookmarked"
    },
    {
      name: "does not classify correct sure unmarked answers",
      input: { isCorrect: true, confidence: "sure", markedReview: false },
      expected: null
    },
    {
      name: "does not classify correct unsure unmarked answers",
      input: { isCorrect: true, confidence: "unsure", markedReview: false },
      expected: null
    }
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(classifyMistake(testCase.input)).toBe(testCase.expected);
    });
  }
});
