import { z } from "zod";
import type { AiMessage } from "@/lib/ai/types";

export const ANALYSIS_SCHEMA_VERSION = "1.0.0";
export const ANALYSIS_PROMPT_VERSION = "post_test_analysis@1.1.0";

export const analysisQuestionInputSchema = z.object({
  questionId: z.string(),
  type: z.string(),
  stem: z.string(),
  isCorrect: z.boolean().nullable(),
  selectedLabel: z.string().nullable(),
  correctLabel: z.string().nullable(),
  topicName: z.string().nullable(),
  conceptName: z.string().nullable()
});

export const analysisInputSchema = z.object({
  examName: z.string(),
  score: z.number(),
  maxScore: z.number(),
  accuracy: z.number(),
  questions: z.array(analysisQuestionInputSchema).min(1)
});

export type AnalysisInput = z.infer<typeof analysisInputSchema>;

export const questionAnalysisSchema = z.object({
  questionId: z.string(),
  whyCorrect: z.string().min(1),
  whySelectedWrong: z.string().nullable(),
  trapExplanation: z.string().nullable()
});

export const topicSummarySchema = z.object({
  topicName: z.string(),
  summary: z.string().min(1),
  recommendation: z.string().min(1)
});

export const analysisOutputSchema = z.object({
  questionAnalyses: z.array(questionAnalysisSchema),
  topicSummaries: z.array(topicSummarySchema),
  overallSummary: z.string().min(1),
  strategyInsights: z.array(z.string()),
  nextActions: z.array(z.string())
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

export function validateAnalysisOutput(
  raw: unknown
): { ok: true; data: AnalysisOutput } | { ok: false; errors: string[] } {
  const parsed = analysisOutputSchema.safeParse(raw);

  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
  };
}

export function buildAnalysisMessages(input: AnalysisInput): AiMessage[] {
  return [
    {
      role: "system",
      content: [
        "You explain deterministic test results for an exam-prep learner.",
        "The score, correctness, answer labels, topics, and concepts are already computed by the system.",
        "Do not recompute scores, do not change correctness, and do not invent facts outside the supplied question data.",
        "Base each question explanation only on the provided stem, selected label, correct label, topic, and concept.",
        // Explicit shape required: "the requested schema" alone makes the
        // model guess field names (root cause of improvement_plan
        // validation_failed in production).
        'Return ONLY a JSON object with exactly this shape: {"questionAnalyses": [{"questionId": "supplied id", "whyCorrect": "string", "whySelectedWrong": "string or null", "trapExplanation": "string or null"}], "topicSummaries": [{"topicName": "string", "summary": "string", "recommendation": "string"}], "overallSummary": "string", "strategyInsights": ["string"], "nextActions": ["string"]}.',
        "Include one questionAnalyses entry per supplied question, keeping questionId values exactly.",
        "Use concise, concrete, study-focused language."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          schemaVersion: ANALYSIS_SCHEMA_VERSION,
          examName: input.examName,
          questionCount: input.questions.length,
          result: input
        },
        null,
        2
      )
    }
  ];
}
