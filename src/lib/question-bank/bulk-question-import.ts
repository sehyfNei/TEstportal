import { z } from "zod";
import { adminQuestionFormSchema } from "@/lib/question-bank/admin-question-schema";

export type BulkQuestionImportFormat = "json" | "csv";

export type BulkQuestionImportInput = z.infer<typeof adminQuestionFormSchema>;

export type BulkQuestionImportError = {
  row: number;
  message: string;
};

export type BulkQuestionImportPlan = {
  questions: BulkQuestionImportInput[];
  errors: BulkQuestionImportError[];
};

const importRowSchema = z
  .object({
    examId: z.string().optional(),
    exam_id: z.string().optional(),
    topicId: z.string().optional(),
    topic_id: z.string().optional(),
    subtopicId: z.string().optional().nullable(),
    subtopic_id: z.string().optional().nullable(),
    type: z.string().optional(),
    difficulty: z.string().optional(),
    source: z.string().optional(),
    sourceYear: z.union([z.string(), z.number()]).optional().nullable(),
    source_year: z.union([z.string(), z.number()]).optional().nullable(),
    sourceReference: z.string().optional().nullable(),
    source_reference: z.string().optional().nullable(),
    isContested: z.union([z.string(), z.boolean()]).optional().nullable(),
    is_contested: z.union([z.string(), z.boolean()]).optional().nullable(),
    language: z.string().optional(),
    status: z.string().optional(),
    exposurePolicy: z.string().optional(),
    exposure_policy: z.string().optional(),
    qualityTier: z.string().optional(),
    quality_tier: z.string().optional(),
    content: z.unknown().optional(),
    content_json: z.string().optional(),
    explanation: z.string().optional().nullable(),
    explanationDetail: z.string().optional().nullable(),
    explanation_detail: z.string().optional().nullable(),
    reviewerNotes: z.string().optional().nullable(),
    reviewer_notes: z.string().optional().nullable()
  })
  .passthrough();

export function parseBulkQuestionImportPayload(
  rawPayload: string,
  format: BulkQuestionImportFormat
): BulkQuestionImportPlan {
  const trimmed = rawPayload.trim();

  if (!trimmed) {
    return {
      questions: [],
      errors: [{ row: 0, message: "Import payload is required." }]
    };
  }

  let rows: unknown[];

  try {
    rows = format === "json" ? parseJsonRows(trimmed) : parseCsvRows(trimmed);
  } catch (error) {
    return {
      questions: [],
      errors: [{ row: 0, message: error instanceof Error ? error.message : "Import parse failed." }]
    };
  }

  return createImportPlan(rows);
}

export function createImportPlan(rows: unknown[]): BulkQuestionImportPlan {
  const questions: BulkQuestionImportInput[] = [];
  const errors: BulkQuestionImportError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const parsedRow = importRowSchema.safeParse(row);

    if (!parsedRow.success) {
      errors.push({
        row: rowNumber,
        message: parsedRow.error.issues[0]?.message ?? "Row is not a valid object."
      });
      return;
    }

    let content = parsedRow.data.content;

    if (content === undefined && parsedRow.data.content_json) {
      try {
        content = JSON.parse(parsedRow.data.content_json);
      } catch {
        errors.push({
          row: rowNumber,
          message: "content_json must be valid JSON."
        });
        return;
      }
    }

    const result = adminQuestionFormSchema.safeParse({
      examId: firstString(parsedRow.data.examId, parsedRow.data.exam_id),
      topicId: firstString(parsedRow.data.topicId, parsedRow.data.topic_id),
      subtopicId: firstNullableString(parsedRow.data.subtopicId, parsedRow.data.subtopic_id),
      type: parsedRow.data.type ?? "mcq",
      difficulty: parsedRow.data.difficulty ?? "medium",
      source: parsedRow.data.source ?? "manual",
      sourceYear: normalizeOptionalInteger(parsedRow.data.sourceYear ?? parsedRow.data.source_year),
      sourceReference: firstNullableString(
        parsedRow.data.sourceReference,
        parsedRow.data.source_reference
      ),
      isContested: normalizeBoolean(parsedRow.data.isContested ?? parsedRow.data.is_contested),
      language: parsedRow.data.language ?? "en",
      status: parsedRow.data.status ?? "draft",
      exposurePolicy: parsedRow.data.exposurePolicy ?? parsedRow.data.exposure_policy ?? "practice",
      qualityTier: parsedRow.data.qualityTier ?? parsedRow.data.quality_tier ?? "bronze",
      content,
      explanation: parsedRow.data.explanation ?? "",
      explanationDetail: parsedRow.data.explanationDetail ?? parsedRow.data.explanation_detail ?? "",
      reviewerNotes: parsedRow.data.reviewerNotes ?? parsedRow.data.reviewer_notes ?? ""
    });

    if (!result.success) {
      errors.push({
        row: rowNumber,
        message: result.error.issues[0]?.message ?? "Question validation failed."
      });
      return;
    }

    questions.push(result.data);
  });

  return {
    questions,
    errors
  };
}

function parseJsonRows(rawPayload: string): unknown[] {
  const parsed = JSON.parse(rawPayload);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON import payload must be an array of question rows.");
  }

  return parsed;
}

function parseCsvRows(rawPayload: string): Record<string, string>[] {
  const rows = parseCsv(rawPayload);

  if (rows.length < 2) {
    throw new Error("CSV import payload must include a header row and at least one data row.");
  }

  const [headers, ...records] = rows;
  const normalizedHeaders = headers.map((header) => header.trim());

  if (normalizedHeaders.some((header) => !header)) {
    throw new Error("CSV headers cannot be empty.");
  }

  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record) =>
      Object.fromEntries(normalizedHeaders.map((header, index) => [header, record[index] ?? ""]))
    );
}

function parseCsv(rawPayload: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < rawPayload.length; index += 1) {
    const char = rawPayload[index];
    const next = rawPayload[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("CSV has an unterminated quoted field.");
  }

  row.push(field);
  rows.push(row);

  return rows;
}

function firstString(...values: Array<string | undefined | null>) {
  return values.find((value): value is string => typeof value === "string" && value.trim())
    ?.trim();
}

function firstNullableString(...values: Array<string | undefined | null>) {
  const value = firstString(...values);
  return value ?? "";
}

function normalizeOptionalInteger(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" ? value : "";
}

function normalizeBoolean(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase());
}
