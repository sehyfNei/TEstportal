export type ComposerValue = {
  text: string;
  options: string[];
  correctOptions: number[];
  correctInteger: string;
};

export const COMPOSER_MIN_OPTIONS = 2;
export const COMPOSER_MAX_OPTIONS = 6;

export const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

const COMPOSER_TYPES = ["mcq", "msq", "integer", "statement", "assertion"] as const;

export function isComposerType(type: string): boolean {
  return (COMPOSER_TYPES as readonly string[]).includes(type);
}

export function isSingleAnswerType(type: string): boolean {
  return type === "mcq";
}

export function emptyComposerValue(): ComposerValue {
  return {
    text: "",
    options: ["", "", "", ""],
    correctOptions: [],
    correctInteger: ""
  };
}

export function buildComposerContent(value: ComposerValue, type: string): Record<string, unknown> {
  if (type === "integer") {
    const parsed = Number(value.correctInteger.trim());

    return {
      text: value.text,
      options: [],
      correct_options: [],
      correct_integer: Number.isFinite(parsed) && value.correctInteger.trim() ? parsed : null,
      pairs: null,
      images: []
    };
  }

  const options = value.options.map((option) => option.trim());

  return {
    text: value.text,
    options,
    correct_options: [...value.correctOptions].sort((a, b) => a - b),
    correct_integer: null,
    pairs: null,
    images: []
  };
}

export function validateComposerValue(value: ComposerValue, type: string): string | null {
  if (!value.text.trim()) {
    return "Write the question text.";
  }

  if (type === "integer") {
    const raw = value.correctInteger.trim();

    if (!raw || !Number.isFinite(Number(raw))) {
      return "Enter the correct numeric answer.";
    }

    return null;
  }

  const filled = value.options.map((option) => option.trim()).filter(Boolean);

  if (filled.length < COMPOSER_MIN_OPTIONS) {
    return "Fill in at least two options.";
  }

  if (value.options.some((option, index) => !option.trim() && index < filled.length)) {
    return "Options must be filled from the top with no gaps.";
  }

  if (!value.correctOptions.length) {
    return "Tick the correct option.";
  }

  if (value.correctOptions.some((index) => index >= filled.length || !value.options[index]?.trim())) {
    return "A ticked option is empty. Fill it in or untick it.";
  }

  if (isSingleAnswerType(type) && value.correctOptions.length > 1) {
    return "This question type allows exactly one correct option.";
  }

  return null;
}

type ComposerFromContent =
  | { ok: true; value: ComposerValue }
  | { ok: false; reason: string };

/**
 * Maps stored version content back into the simple composer. Content the
 * composer cannot represent without losing data (pairs, images, extra keys
 * beyond the standard shape) must be edited as raw JSON instead.
 */
export function composerValueFromContent(content: unknown, type: string): ComposerFromContent {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return { ok: false, reason: "Content is not an object." };
  }

  const record = content as Record<string, unknown>;

  if (!isComposerType(type)) {
    return { ok: false, reason: `The ${type} type needs the JSON editor.` };
  }

  if (Array.isArray(record.pairs) && record.pairs.length) {
    return { ok: false, reason: "Content uses pairs, which need the JSON editor." };
  }

  if (Array.isArray(record.images) && record.images.length) {
    return { ok: false, reason: "Content includes images, which need the JSON editor." };
  }

  const knownKeys = new Set([
    "text",
    "options",
    "correct_options",
    "correct_integer",
    "pairs",
    "images"
  ]);

  if (Object.keys(record).some((key) => !knownKeys.has(key))) {
    return { ok: false, reason: "Content has custom fields, which need the JSON editor." };
  }

  if (typeof record.text !== "string") {
    return { ok: false, reason: "Content is missing question text." };
  }

  const options = Array.isArray(record.options) ? record.options : [];

  if (options.some((option) => typeof option !== "string")) {
    return { ok: false, reason: "Options are not plain text." };
  }

  const correctOptions = Array.isArray(record.correct_options) ? record.correct_options : [];

  if (correctOptions.some((index) => typeof index !== "number" || !Number.isInteger(index))) {
    return { ok: false, reason: "Correct options are not option numbers." };
  }

  return {
    ok: true,
    value: {
      text: record.text,
      options: options.length ? (options as string[]) : ["", "", "", ""],
      correctOptions: correctOptions as number[],
      correctInteger:
        typeof record.correct_integer === "number" ? String(record.correct_integer) : ""
    }
  };
}
