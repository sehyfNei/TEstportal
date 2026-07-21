import { z } from "zod";

export const GENERATION_CADENCES = ["manual", "daily", "weekly"] as const;
export type GenerationCadence = (typeof GENERATION_CADENCES)[number];

export const MAX_PERSONA_SOURCES = 20;

export const createExpertPersonaSchema = z.object({
  topicId: z.string().uuid(),
  name: z.string().trim().min(3).max(120),
  systemPrompt: z.string().trim().min(20).max(4000),
  generationCadence: z.enum(GENERATION_CADENCES),
  sourceIds: z.array(z.string().uuid()).max(MAX_PERSONA_SOURCES)
});

export type CreateExpertPersonaInput = z.infer<typeof createExpertPersonaSchema>;
