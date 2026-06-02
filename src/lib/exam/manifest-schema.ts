import { z } from "zod";

const questionTypeSchema = z.enum(["mcq", "msq", "integer", "statement", "assertion", "match"]);

const markingSchema = z.object({
  totalQuestions: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  marksPerCorrect: z.number().positive(),
  negativeMarkingFraction: z.number().min(0),
  sections: z
    .array(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        questionCount: z.number().int().positive()
      })
    )
    .min(1)
});

type TopicManifest = {
  slug: string;
  name: string;
  description?: string;
  weightPercent?: number;
  children?: TopicManifest[];
};

const topicSchema: z.ZodType<TopicManifest> = z.lazy(() =>
  z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    weightPercent: z.number().min(0).max(100).optional(),
    children: z.array(topicSchema).optional()
  })
);

const conceptClusterSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional()
});

const conceptSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  topicSlug: z.string().min(1),
  clusterSlug: z.string().min(1).optional(),
  description: z.string().optional()
});

const cutoffSchema = z.object({
  year: z.number().int().min(1900),
  category: z.string().min(1).default("general"),
  cutoffScore: z.number().min(0),
  maxScore: z.number().positive(),
  metadata: z.record(z.unknown()).default({})
});

export const examManifestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  exam: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    languages: z.array(z.string().min(2)).min(1).default(["en"]),
    supportedQuestionTypes: z.array(questionTypeSchema).min(1),
    aiPersona: z.string().optional()
  }),
  marking: markingSchema,
  topics: z.array(topicSchema).min(1),
  conceptClusters: z.array(conceptClusterSchema).default([]),
  concepts: z.array(conceptSchema).default([]),
  historicalCutoffs: z.array(cutoffSchema).default([])
});

export type ExamManifest = z.infer<typeof examManifestSchema>;
export type ExamManifestTopic = TopicManifest;

