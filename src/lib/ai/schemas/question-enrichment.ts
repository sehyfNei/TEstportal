import { z } from "zod";
import type { AiMessage } from "@/lib/ai/types";

export const ENRICHMENT_SCHEMA_VERSION = "1.0.0";
export const ENRICHMENT_PROMPT_VERSION = "question_enrichment@1.1.0";

const difficultySchema = z.enum(["easy", "medium", "hard"]);

export const enrichmentQuestionInputSchema = z.object({
  rowIndex: z.number().int().min(0),
  stem: z.string().min(1),
  options: z.array(z.string()),
  correctOptionIndex: z.number().int().min(0).nullable(),
  currentDifficulty: difficultySchema,
  hasExplanation: z.boolean()
});

export const enrichmentInputSchema = z.object({
  questions: z.array(enrichmentQuestionInputSchema).min(1).max(30)
});

export const enrichmentQuestionOutputSchema = z.object({
  rowIndex: z.number().int().min(0),
  suggestedDifficulty: difficultySchema,
  suggestedExplanation: z.string().min(1).nullable(),
  reasoning: z.string().min(1)
});

export const enrichmentOutputSchema = z.object({
  questions: z.array(enrichmentQuestionOutputSchema)
});

export type EnrichmentInput = z.infer<typeof enrichmentInputSchema>;
export type EnrichmentOutput = z.infer<typeof enrichmentOutputSchema>;
export type EnrichmentQuestionOutput = z.infer<typeof enrichmentQuestionOutputSchema>;

export function buildEnrichmentMessages(input: EnrichmentInput): AiMessage[] {
  return [
    {
      role: "system",
      content: [
        "You help exam-prep admins improve imported question metadata.",
        "Rate difficulty by cognitive load, not by topic name alone: easy means direct recall or one-step application, medium means standard multi-step reasoning, and hard means traps, synthesis, or unusual reasoning.",
        "Generate a brief explanation under 80 words only when hasExplanation is false.",
        "When hasExplanation is true, set suggestedExplanation to null.",
        "Do not change answers, options, stems, topics, sources, or any fields outside difficulty and explanation.",
        // Explicit shape required: naming "the requested schema" without
        // spelling it out makes the model guess field names (validation_failed
        // root cause seen in the analysis/plan prompts in production).
        'Return ONLY a JSON object with exactly this shape: {"questions": [{"rowIndex": 0, "suggestedDifficulty": "easy|medium|hard", "suggestedExplanation": "string or null", "reasoning": "string"}]}.',
        "Include one questions entry per supplied question, keeping rowIndex values exactly."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          schemaVersion: ENRICHMENT_SCHEMA_VERSION,
          task: "enrich_questions",
          questions: input.questions
        },
        null,
        2
      )
    }
  ];
}

export function validateEnrichmentOutput(
  raw: unknown
): { ok: true; data: EnrichmentOutput } | { ok: false; errors: string[] } {
  const parsed = enrichmentOutputSchema.safeParse(raw);

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
