import { z } from "zod";
import { adminQuestionFormSchema } from "@/lib/question-bank/admin-question-schema";

export type BulkQuestionImportFormat = "json" | "csv";

export type BulkQuestionImportInput = z.infer<typeof adminQuestionFormSchema>;

export type BulkQuestionImportDefaults = {
  examId?: string;
  topicId?: string;
};

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
    question: z.string().optional(),
    option_a: z.string().optional(),
    option_b: z.string().optional(),
    option_c: z.string().optional(),
    option_d: z.string().optional(),
    option_e: z.string().optional(),
    option_f: z.string().optional(),
    correct_option: z.union([z.string(), z.number()]).optional().nullable(),
    explanation: z.string().optional().nullable(),
    explanationDetail: z.string().optional().nullable(),
    explanation_detail: z.string().optional().nullable(),
    reviewerNotes: z.string().optional().nullable(),
    reviewer_notes: z.string().optional().nullable()
  })
  .passthrough();

export function parseBulkQuestionImportPayload(
  rawPayload: string,
  format: BulkQuestionImportFormat,
  defaults: BulkQuestionImportDefaults = {}
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

  return createImportPlan(rows, defaults);
}

export function createImportPlan(
  rows: unknown[],
  defaults: BulkQuestionImportDefaults = {}
): BulkQuestionImportPlan {
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
    let simpleRowType: string | null = null;

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

    if (content === undefined && parsedRow.data.question?.trim()) {
      const simple = buildSimpleRowContent(parsedRow.data);

      if (!simple.ok) {
        errors.push({ row: rowNumber, message: simple.message });
        return;
      }

      content = simple.content;
      simpleRowType = simple.type;
    }

    if (content === undefined) {
      errors.push({
        row: rowNumber,
        message:
          "Row needs either a question column with options (simple format) or content/content_json."
      });
      return;
    }

    const resolvedExamId = firstString(parsedRow.data.examId, parsedRow.data.exam_id, defaults.examId);
    const resolvedTopicId = firstString(
      parsedRow.data.topicId,
      parsedRow.data.topic_id,
      defaults.topicId
    );

    if (!resolvedExamId || !resolvedTopicId) {
      errors.push({
        row: rowNumber,
        message: !resolvedExamId ? "Select an exam." : "Select a topic."
      });
      return;
    }

    const result = adminQuestionFormSchema.safeParse({
      examId: resolvedExamId,
      topicId: resolvedTopicId,
      subtopicId: firstNullableString(parsedRow.data.subtopicId, parsedRow.data.subtopic_id),
      type: valueOrDefault(parsedRow.data.type, simpleRowType ?? "mcq"),
      difficulty: valueOrDefault(parsedRow.data.difficulty, "medium"),
      source: valueOrDefault(parsedRow.data.source, "manual"),
      sourceYear: normalizeOptionalInteger(parsedRow.data.sourceYear ?? parsedRow.data.source_year),
      sourceReference: firstNullableString(
        parsedRow.data.sourceReference,
        parsedRow.data.source_reference
      ),
      isContested: normalizeBoolean(parsedRow.data.isContested ?? parsedRow.data.is_contested),
      language: valueOrDefault(parsedRow.data.language, "en"),
      status: valueOrDefault(parsedRow.data.status, "draft"),
      exposurePolicy: valueOrDefault(
        parsedRow.data.exposurePolicy ?? parsedRow.data.exposure_policy,
        "practice"
      ),
      qualityTier: valueOrDefault(
        parsedRow.data.qualityTier ?? parsedRow.data.quality_tier,
        "bronze"
      ),
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

const SIMPLE_OPTION_KEYS = [
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "option_f"
] as const;

export const SIMPLE_QUESTION_CSV_HEADERS = [
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "explanation",
  "difficulty"
] as const;

export const SIMPLE_QUESTION_CSV_TEMPLATE = [
  SIMPLE_QUESTION_CSV_HEADERS.join(","),
  '"Which river is known as the Sorrow of Bengal?","Ganga","Damodar","Hooghly","Teesta","B","Frequent floods in the Damodar valley earned it the name Sorrow of Bengal.","easy"',
  '"Which of the following are fundamental rights? Select all that apply.","Right to Equality","Right to Property","Right to Freedom","Right to Vote","A,C","Right to Property was removed by the 44th Amendment; Right to Vote is a legal right.","medium"'
].join("\n");

type SimpleRowResult =
  | { ok: true; content: Record<string, unknown>; type: "mcq" | "msq" }
  | { ok: false; message: string };

type SimpleRowInput = z.infer<typeof importRowSchema>;

function buildSimpleRowContent(row: SimpleRowInput): SimpleRowResult {
  const rawOptions = SIMPLE_OPTION_KEYS.map((key) => (row[key] ?? "").trim());
  const lastFilled = rawOptions.reduce(
    (last, option, index) => (option ? index : last),
    -1
  );
  const options = rawOptions.slice(0, lastFilled + 1);

  if (options.some((option) => !option)) {
    return {
      ok: false,
      message: "Options must be filled in order (option_a, option_b, ...) with no gaps."
    };
  }

  if (options.length < 2) {
    return {
      ok: false,
      message: "At least two options (option_a and option_b) are required."
    };
  }

  const correct = parseCorrectOptionSpec(row.correct_option, options.length);

  if (!correct.ok) {
    return { ok: false, message: correct.message };
  }

  return {
    ok: true,
    content: {
      text: (row.question ?? "").trim(),
      options,
      correct_options: correct.indexes,
      correct_integer: null,
      pairs: null,
      images: []
    },
    type: correct.indexes.length > 1 ? "msq" : "mcq"
  };
}

export function parseCorrectOptionSpec(
  spec: string | number | null | undefined,
  optionCount: number
): { ok: true; indexes: number[] } | { ok: false; message: string } {
  const raw = spec === null || spec === undefined ? "" : String(spec).trim();

  if (!raw) {
    return {
      ok: false,
      message: "correct_option is required (a letter like B, or a number like 2)."
    };
  }

  const tokens = raw.split(/[,;/\s]+/).filter(Boolean);
  const indexes = new Set<number>();

  for (const token of tokens) {
    let index: number;

    if (/^[A-Fa-f]$/.test(token)) {
      index = token.toUpperCase().charCodeAt(0) - 65;
    } else if (/^\d+$/.test(token)) {
      index = Number(token) - 1;
    } else {
      return {
        ok: false,
        message: `correct_option "${token}" is not an option letter (A-F) or option number.`
      };
    }

    if (index < 0 || index >= optionCount) {
      return {
        ok: false,
        message: `correct_option "${token}" points past the ${optionCount} option${
          optionCount === 1 ? "" : "s"
        } provided.`
      };
    }

    indexes.add(index);
  }

  return { ok: true, indexes: [...indexes].sort((a, b) => a - b) };
}

function valueOrDefault(value: string | undefined | null, fallback: string) {
  return value && value.trim() ? value.trim() : fallback;
}

function firstString(...values: Array<string | undefined | null>) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)
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
