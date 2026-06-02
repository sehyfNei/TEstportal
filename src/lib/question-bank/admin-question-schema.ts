import { z } from "zod";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_EXPOSURE_POLICIES,
  QUESTION_QUALITY_TIERS,
  QUESTION_SOURCES,
  QUESTION_STATUSES,
  QUESTION_TYPES
} from "@/lib/db/schema/question";

const optionalUuidSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .pipe(z.string().uuid().nullable());

const optionalIntegerSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? Number(value) : null))
  .pipe(z.number().int().min(1800).max(2200).nullable());

const questionContentSchema = z
  .object({
    text: z.string().trim().min(1, "Question text is required."),
    options: z.array(z.string()).optional(),
    correct_options: z.array(z.number().int()).optional(),
    correct_integer: z.number().nullable().optional(),
    pairs: z.array(z.unknown()).nullable().optional(),
    images: z.array(z.string()).optional()
  })
  .passthrough();

export const adminQuestionFormSchema = z.object({
  questionId: optionalUuidSchema.optional(),
  examId: z.string().uuid("Select an exam."),
  topicId: z.string().uuid("Select a topic."),
  subtopicId: optionalUuidSchema,
  type: z.enum(QUESTION_TYPES),
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  source: z.enum(QUESTION_SOURCES),
  sourceYear: optionalIntegerSchema,
  sourceReference: z.string().trim().optional().transform(emptyToNull),
  isContested: z.boolean().default(false),
  language: z.string().trim().min(2).max(12).default("en"),
  status: z.enum(QUESTION_STATUSES).default("draft"),
  exposurePolicy: z.enum(QUESTION_EXPOSURE_POLICIES).default("practice"),
  qualityTier: z.enum(QUESTION_QUALITY_TIERS).default("bronze"),
  content: questionContentSchema,
  explanation: z.string().trim().optional().transform(emptyToNull),
  explanationDetail: z.string().trim().optional().transform(emptyToNull),
  reviewerNotes: z.string().trim().optional().transform(emptyToNull)
});

export type AdminQuestionFormInput = z.infer<typeof adminQuestionFormSchema>;

export type AdminQuestionActionState = {
  ok: boolean;
  message: string;
  questionId?: string;
};

export const initialAdminQuestionActionState: AdminQuestionActionState = {
  ok: false,
  message: ""
};

export function parseAdminQuestionFormData(formData: FormData) {
  const rawContent = stringValue(formData, "content");
  let content: unknown;

  try {
    content = JSON.parse(rawContent);
  } catch {
    throw new Error("Question content must be valid JSON.");
  }

  const result = adminQuestionFormSchema.safeParse({
    questionId: stringValue(formData, "questionId"),
    examId: stringValue(formData, "examId"),
    topicId: stringValue(formData, "topicId"),
    subtopicId: stringValue(formData, "subtopicId"),
    type: stringValue(formData, "type"),
    difficulty: stringValue(formData, "difficulty"),
    source: stringValue(formData, "source"),
    sourceYear: stringValue(formData, "sourceYear"),
    sourceReference: stringValue(formData, "sourceReference"),
    isContested: formData.get("isContested") === "on",
    language: stringValue(formData, "language") || "en",
    status: stringValue(formData, "status") || "draft",
    exposurePolicy: stringValue(formData, "exposurePolicy") || "practice",
    qualityTier: stringValue(formData, "qualityTier") || "bronze",
    content,
    explanation: stringValue(formData, "explanation"),
    explanationDetail: stringValue(formData, "explanationDetail"),
    reviewerNotes: stringValue(formData, "reviewerNotes")
  });

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Question validation failed.");
  }

  return result.data;
}

export function defaultQuestionContent() {
  return JSON.stringify(
    {
      text: "Question text in markdown",
      options: ["A", "B", "C", "D"],
      correct_options: [0],
      correct_integer: null,
      pairs: null,
      images: []
    },
    null,
    2
  );
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value?: string) {
  return value ? value : null;
}
