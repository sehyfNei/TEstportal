import { z } from "zod";
import type { AiMessage } from "@/lib/ai/types";

export const LEARNING_PATH_SCHEMA_VERSION = "1.0.0";
export const LEARNING_PATH_PROMPT_VERSION = "learning_path_generation@1.0.0";

export const learningPathWeakTopicInputSchema = z.object({
  topicId: z.string().uuid(),
  topicName: z.string(),
  masteryScore: z.number(),
  weightPercent: z.number()
});

export const learningPathInputSchema = z.object({
  examName: z.string(),
  goal: z.string(),
  totalWeeks: z.number().int().min(1),
  weakTopics: z.array(learningPathWeakTopicInputSchema).min(1)
});

export type LearningPathInput = z.infer<typeof learningPathInputSchema>;

export const learningPathMilestoneSchema = z.object({
  topicId: z.string().uuid(),
  weekNumber: z.number().int().min(1),
  targetMastery: z.number().min(0).max(100)
});

export const learningPathOutputSchema = z.object({
  milestones: z.array(learningPathMilestoneSchema).min(1)
});

export type LearningPathOutput = z.infer<typeof learningPathOutputSchema>;

export function validateLearningPathOutput(
  raw: unknown
): { ok: true; data: LearningPathOutput } | { ok: false; errors: string[] } {
  const parsed = learningPathOutputSchema.safeParse(raw);

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

export function buildLearningPathMessages(input: LearningPathInput): AiMessage[] {
  return [
    {
      role: "system",
      content: [
        `You build a week-by-week study plan for a learner preparing for ${input.examName}.`,
        `The learner's stated goal is: "${input.goal}". The plan runs for exactly ${input.totalWeeks} week(s), numbered 1 to ${input.totalWeeks}.`,
        "The weak topics, their current mastery scores, and syllabus weights are already computed by the system — do not recompute them and do not invent topics.",
        "For every supplied weak topic, add at least one milestone entry using its topicId value exactly as given (never invent, alter, or abbreviate a topicId).",
        "Distribute milestones across the available weeks sensibly: heavier-weighted and lower-mastery topics should generally appear earlier. A topic may appear in more than one week if useful (e.g. an early checkpoint and a later, higher target).",
        "Each milestone's targetMastery must be a realistic, achievable improvement over that topic's current masteryScore, never lower than it, and weekNumber must be between 1 and the total week count.",
        // Explicit shape required — this project has repeatedly hit
        // validation_failed in production when the exact shape wasn't
        // spelled out; the model invents field names otherwise.
        'Return ONLY a JSON object with exactly this shape: {"milestones": [{"topicId": "exact supplied topic id", "weekNumber": 1, "targetMastery": 65}]}.',
        "milestones must be a non-empty array and must include every supplied topicId at least once."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          schemaVersion: LEARNING_PATH_SCHEMA_VERSION,
          task: "generate_learning_path",
          ...input
        },
        null,
        2
      )
    }
  ];
}
