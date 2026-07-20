import { z } from "zod";

export const SOURCE_TYPES = ["past_year_paper", "article", "other"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const MAX_SOURCE_BODY_CHARS = 20000;

// Keeps the grounding prompt bounded regardless of how long an admin-pasted
// source is — a cost/latency guard, not a content-quality one.
export const MAX_GROUNDING_EXCERPT_CHARS = 6000;

export const createSourceSchema = z.object({
  examId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  sourceType: z.enum(SOURCE_TYPES),
  bodyText: z.string().trim().min(50).max(MAX_SOURCE_BODY_CHARS)
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export function truncateForGrounding(bodyText: string): string {
  const trimmed = bodyText.trim();

  if (trimmed.length <= MAX_GROUNDING_EXCERPT_CHARS) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_GROUNDING_EXCERPT_CHARS)}…`;
}
