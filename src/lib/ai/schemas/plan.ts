import { z } from "zod";
import type { AiMessage } from "@/lib/ai/types";

export const PLAN_SCHEMA_VERSION = "1.0.0";
export const PLAN_PROMPT_VERSION = "improvement_plan@1.0.0";

export const planWeakTopicInputSchema = z.object({
  topicName: z.string(),
  masteryScore: z.number(),
  weightPercent: z.number(),
  priority: z.number()
});

export const planInputSchema = z.object({
  examName: z.string(),
  readinessScore: z.number(),
  confidenceLevel: z.string(),
  coveragePercent: z.number(),
  score: z.number(),
  maxScore: z.number(),
  accuracy: z.number(),
  weakTopics: z.array(planWeakTopicInputSchema).min(1)
});

export type PlanInput = z.infer<typeof planInputSchema>;

export const prioritizedTopicSchema = z.object({
  topicName: z.string(),
  rationale: z.string().min(1),
  focusActions: z.array(z.string())
});

export const planOutputSchema = z.object({
  overallStrategy: z.string().min(1),
  prioritizedTopics: z.array(prioritizedTopicSchema).min(1),
  nextActions: z.array(z.string()).min(1)
});

export type PlanOutput = z.infer<typeof planOutputSchema>;

export function validatePlanOutput(
  raw: unknown
): { ok: true; data: PlanOutput } | { ok: false; errors: string[] } {
  const parsed = planOutputSchema.safeParse(raw);

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

export function buildPlanMessages(input: PlanInput): AiMessage[] {
  return [
    {
      role: "system",
      content: [
        "You build a prioritized study plan for an exam-prep learner.",
        "The readiness score, confidence level, coverage, accuracy, weak topics, mastery scores, weights, and priorities are already computed by the system.",
        "Do not recompute any score and do not invent topics: base prioritizedTopics only on the supplied weakTopics, keeping their topicName values exactly.",
        "Order prioritizedTopics from most to least urgent, consistent with the supplied priority values.",
        "Write concrete, study-focused rationales and focus actions grounded only in the supplied data.",
        "Return only a JSON object matching the requested plan schema."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          schemaVersion: PLAN_SCHEMA_VERSION,
          examName: input.examName,
          weakTopicCount: input.weakTopics.length,
          result: input
        },
        null,
        2
      )
    }
  ];
}
