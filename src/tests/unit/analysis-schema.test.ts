import { describe, expect, it } from "vitest";
import {
  buildAnalysisMessages,
  validateAnalysisOutput,
  type AnalysisInput,
  type AnalysisOutput
} from "@/lib/ai/schemas/analysis";

describe("validateAnalysisOutput", () => {
  it("accepts a valid output object", () => {
    expect(validateAnalysisOutput(validOutput())).toMatchObject({ ok: true });
  });

  it("rejects missing overallSummary with a path in the errors", () => {
    const output = validOutput() as Partial<AnalysisOutput>;
    delete output.overallSummary;

    const result = validateAnalysisOutput(output);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("overallSummary"))).toBe(true);
    }
  });

  it("accepts null whySelectedWrong for skipped or correct questions", () => {
    const output = validOutput();
    output.questionAnalyses[0].whySelectedWrong = null;

    expect(validateAnalysisOutput(output)).toMatchObject({ ok: true });
  });

  it("rejects empty whyCorrect strings", () => {
    const output = validOutput();
    output.questionAnalyses[0].whyCorrect = "";

    const result = validateAnalysisOutput(output);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.includes("whyCorrect"))).toBe(true);
    }
  });

  it("rejects non-object values", () => {
    expect(validateAnalysisOutput("not-json")).toMatchObject({ ok: false });
    expect(validateAnalysisOutput(42)).toMatchObject({ ok: false });
    expect(validateAnalysisOutput(null)).toMatchObject({ ok: false });
  });
});

describe("buildAnalysisMessages", () => {
  it("returns grounded system and user messages with exam name and question count", () => {
    const messages = buildAnalysisMessages(validInput());

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[0].content).toContain("Do not recompute scores");
    expect(messages[0].content).toContain("do not invent facts");
    expect(messages[1]).toMatchObject({ role: "user" });
    expect(messages[1].content).toContain("UPSC Prelims");
    expect(messages[1].content).toContain("\"questionCount\": 2");
  });
});

function validOutput(): AnalysisOutput {
  return {
    questionAnalyses: [
      {
        questionId: "question-1",
        whyCorrect: "The selected option matches the supplied correct label.",
        whySelectedWrong: null,
        trapExplanation: null
      }
    ],
    topicSummaries: [
      {
        topicName: "Polity",
        summary: "Core constitutional basics are improving.",
        recommendation: "Review federalism questions next."
      }
    ],
    overallSummary: "You performed well on familiar concepts and should review missed basics.",
    strategyInsights: ["Avoid high-confidence guesses without evidence."],
    nextActions: ["Retest weak polity concepts."]
  };
}

function validInput(): AnalysisInput {
  return {
    examName: "UPSC Prelims",
    score: 4,
    maxScore: 8,
    accuracy: 0.5,
    questions: [
      {
        questionId: "question-1",
        type: "mcq",
        stem: "Which article establishes equality before law?",
        isCorrect: true,
        selectedLabel: "Article 14",
        correctLabel: "Article 14",
        topicName: "Polity",
        conceptName: "Fundamental Rights"
      },
      {
        questionId: "question-2",
        type: "mcq",
        stem: "Which schedule covers anti-defection?",
        isCorrect: false,
        selectedLabel: "Ninth Schedule",
        correctLabel: "Tenth Schedule",
        topicName: "Polity",
        conceptName: "Parliament"
      }
    ]
  };
}
