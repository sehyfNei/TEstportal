// Fixed test template authoring (TSP-161).
//
// A fixed template pins a specific, ordered set of questions so every user who
// starts it gets the same paper in the same order. It is stored in
// public.test_templates as: type = 'benchmark', selection_mode = 'fixed',
// config = { selectionMode: 'fixed', questionIds: [...], durationMinutes }.
// start_test_session reads config.questionIds for benchmark/mock sessions.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MIN_TEMPLATE_QUESTIONS = 1;
export const MAX_TEMPLATE_QUESTIONS = 100;
export const MIN_TEMPLATE_DURATION = 1;
export const MAX_TEMPLATE_DURATION = 600;
export const MAX_TEMPLATE_TITLE = 160;

export type FixedTemplateConfig = {
  selectionMode: "fixed";
  questionIds: string[];
  durationMinutes: number | null;
};

export type TemplateInput = {
  title: string;
  description: string | null;
  examId: string;
  questionIds: string[];
  durationMinutes: number | null;
  isActive: boolean;
};

export type TemplateRow = {
  exam_id: string;
  type: "benchmark";
  title: string;
  description: string | null;
  selection_mode: "fixed";
  config: FixedTemplateConfig;
  is_active: boolean;
};

export type ValidateResult =
  | { ok: true; value: TemplateInput }
  | { ok: false; errors: string[] };

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Dedupe UUIDs preserving first-seen order (a paper can't repeat a question). */
export function normalizeQuestionIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (id && isUuid(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function validateTemplateInput(raw: {
  title: string;
  description?: string | null;
  examId: string;
  questionIds: string[];
  durationMinutes?: number | null;
  isActive?: boolean;
}): ValidateResult {
  const errors: string[] = [];

  const title = raw.title.trim();
  if (!title) {
    errors.push("Give the paper a title.");
  } else if (title.length > MAX_TEMPLATE_TITLE) {
    errors.push(`Title must be ${MAX_TEMPLATE_TITLE} characters or fewer.`);
  }

  if (!isUuid(raw.examId)) {
    errors.push("Select an exam.");
  }

  const questionIds = normalizeQuestionIds(raw.questionIds);
  if (questionIds.length < MIN_TEMPLATE_QUESTIONS) {
    errors.push("Add at least one question.");
  } else if (questionIds.length > MAX_TEMPLATE_QUESTIONS) {
    errors.push(`A fixed paper can have at most ${MAX_TEMPLATE_QUESTIONS} questions.`);
  }

  let durationMinutes: number | null = null;
  if (raw.durationMinutes !== null && raw.durationMinutes !== undefined) {
    const d = Number(raw.durationMinutes);
    if (!Number.isInteger(d) || d < MIN_TEMPLATE_DURATION || d > MAX_TEMPLATE_DURATION) {
      errors.push(`Duration must be between ${MIN_TEMPLATE_DURATION} and ${MAX_TEMPLATE_DURATION} minutes, or blank.`);
    } else {
      durationMinutes = d;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const description = raw.description?.trim() ? raw.description.trim() : null;

  return {
    ok: true,
    value: {
      title,
      description,
      examId: raw.examId,
      questionIds,
      durationMinutes,
      isActive: raw.isActive ?? true
    }
  };
}

export function buildTemplateRow(input: TemplateInput): TemplateRow {
  return {
    exam_id: input.examId,
    type: "benchmark",
    title: input.title,
    description: input.description,
    selection_mode: "fixed",
    config: {
      selectionMode: "fixed",
      questionIds: input.questionIds,
      durationMinutes: input.durationMinutes
    },
    is_active: input.isActive
  };
}

/** Pull the ordered questionIds back out of a stored config (defensive). */
export function questionIdsFromConfig(config: unknown): string[] {
  if (!config || typeof config !== "object") {
    return [];
  }
  const ids = (config as Record<string, unknown>).questionIds;
  if (!Array.isArray(ids)) {
    return [];
  }
  return normalizeQuestionIds(ids.filter((v): v is string => typeof v === "string"));
}

export function durationFromConfig(config: unknown): number | null {
  if (!config || typeof config !== "object") {
    return null;
  }
  const d = Number((config as Record<string, unknown>).durationMinutes);
  return Number.isInteger(d) && d >= MIN_TEMPLATE_DURATION && d <= MAX_TEMPLATE_DURATION ? d : null;
}
