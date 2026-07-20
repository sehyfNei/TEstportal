import { z } from "zod";
import type { AiMessage } from "@/lib/ai/types";

export const GENERATION_SCHEMA_VERSION = "1.1.0";
export const GENERATION_PROMPT_VERSION = "question_generation@1.1.0";

// First pass targets plain MCQ only (4 options, one correct answer) — msq and
// integer generation are meaningfully harder to validate automatically and
// are left for a follow-up once this simpler path has founder mileage on it.
const DIFFICULTY = z.enum(["easy", "medium", "hard"]);
const CONFIDENCE = z.enum(["high", "medium", "low"]);

export const generationRequestSchema = z.object({
  examName: z.string().min(1),
  topicName: z.string().min(1),
  conceptName: z.string().min(1).nullable(),
  difficulty: DIFFICULTY,
  count: z.number().int().min(1).max(8)
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;

// TSP-074: every wrong option must trace back to one specific, plausible
// student misconception (rather than being random filler) — this is what
// makes a distractor "adversarial". optionIndex ties the rationale back to
// options[optionIndex] so it can be shown next to the option it explains.
export const distractorRationaleSchema = z.object({
  optionIndex: z.number().int().min(0).max(3),
  misconception: z.string().min(5)
});

export type DistractorRationale = z.infer<typeof distractorRationaleSchema>;

export const generatedQuestionSchema = z
  .object({
    index: z.number().int().min(0),
    stem: z.string().min(10),
    options: z.array(z.string().min(1)).length(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: z.string().min(10),
    // The model's own read on how confident it is in the factual correctness
    // of the answer key — a cheap self-critique signal, not a substitute for
    // human review, surfaced as a soft quality-gate warning.
    confidence: CONFIDENCE,
    distractorRationales: z.array(distractorRationaleSchema)
  })
  .superRefine((question, ctx) => {
    const expected = [0, 1, 2, 3].filter((i) => i !== question.correctOptionIndex);
    const actual = [...question.distractorRationales.map((r) => r.optionIndex)].sort((a, b) => a - b);
    const matches = actual.length === expected.length && actual.every((v, i) => v === expected[i]);

    if (!matches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["distractorRationales"],
        message: `distractorRationales must have exactly one entry per wrong option (expected optionIndex values: ${expected.join(", ")}).`
      });
    }
  });

export const generationOutputSchema = z.object({
  questions: z.array(generatedQuestionSchema)
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GenerationOutput = z.infer<typeof generationOutputSchema>;

export function buildGenerationMessages(input: GenerationRequest): AiMessage[] {
  const scope = input.conceptName
    ? `${input.examName} / ${input.topicName} / ${input.conceptName}`
    : `${input.examName} / ${input.topicName}`;

  return [
    {
      role: "system",
      content: [
        "You write original multiple-choice questions for competitive exam preparation.",
        `Write exactly ${input.count} new MCQ questions scoped to: ${scope}.`,
        `Target difficulty: ${input.difficulty} (easy = direct recall or one-step application, medium = standard multi-step reasoning, hard = traps, synthesis, or unusual reasoning).`,
        "Each question needs exactly 4 options, exactly one correct answer, and an explanation of at least one full sentence justifying the correct option.",
        "Every wrong option must be adversarial: the answer a real student would pick because of one specific, plausible misconception (a common factual mix-up, a near-identical but wrong term, a calculation slip, an outdated fact) — never random or obviously-irrelevant filler.",
        "For each wrong option, add one entry to distractorRationales giving its optionIndex and, in under 20 words, the exact misconception that option targets.",
        "Do not reuse a well-known previous-year question verbatim; write original phrasing.",
        "Set confidence to 'low' for any question whose factual answer you are not fully sure of — do not silently guess.",
        // Explicit shape required — a prior production bug (analysis/plan
        // prompts, later fixed) showed that naming "the requested schema"
        // without spelling it out makes the model invent field names.
        'Return ONLY a JSON object with exactly this shape: {"questions": [{"index": 0, "stem": "string", "options": ["string","string","string","string"], "correctOptionIndex": 0, "explanation": "string", "confidence": "high|medium|low", "distractorRationales": [{"optionIndex": 1, "misconception": "string"}, {"optionIndex": 2, "misconception": "string"}, {"optionIndex": 3, "misconception": "string"}]}]}.',
        "distractorRationales must contain exactly one entry for every option index that is NOT correctOptionIndex — never one for the correct option.",
        `Include exactly ${input.count} entries, indexed 0 to ${input.count - 1}.`
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify(
        { schemaVersion: GENERATION_SCHEMA_VERSION, task: "generate_questions", ...input },
        null,
        2
      )
    }
  ];
}

export function validateGenerationOutput(
  raw: unknown
): { ok: true; data: GenerationOutput } | { ok: false; errors: string[] } {
  const parsed = generationOutputSchema.safeParse(raw);

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
