export type QuestionContext = {
  stem: string;
  selectedLabel: string | null;
  correctLabel: string | null;
};

export function extractQuestionContext(
  type: string,
  content: unknown,
  selectedAnswer: unknown
): QuestionContext {
  return {
    stem: extractStem(content),
    selectedLabel: extractSelectedLabel(type, content, selectedAnswer),
    correctLabel: extractCorrectLabel(type, content)
  };
}

function extractStem(content: unknown): string {
  const record = toRecord(content);
  if (!record) {
    return "(question)";
  }

  return (
    stringOf(record.stem) ??
    stringOf(record.body) ??
    stringOf(record.text) ??
    stringOf(record.question) ??
    stringOf(record.prompt) ??
    "(question)"
  );
}

function extractCorrectLabel(type: string, content: unknown): string | null {
  const record = toRecord(content);
  if (!record) {
    return null;
  }

  if (type === "integer") {
    const value = record.correct_integer ?? record.correctInteger ?? record.correct_answer;
    return value != null ? String(value) : null;
  }

  if (type === "match") {
    const pairs = record.pairs ?? record.correct_pairs;
    return Array.isArray(pairs) ? JSON.stringify(pairs) : null;
  }

  const options = toArray(record.options);
  const correctIndexes = firstIntArray(
    record.correct_options,
    record.correctOptions,
    record.correct_option,
    record.correctOption
  );

  if (!correctIndexes?.length) {
    return null;
  }

  return labelsForIndexes(options, correctIndexes);
}

function extractSelectedLabel(
  type: string,
  content: unknown,
  selectedAnswer: unknown
): string | null {
  const record = toRecord(selectedAnswer);
  if (!record) {
    return null;
  }

  if (type === "integer") {
    const value = record.integer ?? record.value ?? record.answer;
    return value != null ? String(value) : null;
  }

  if (type === "match") {
    return Array.isArray(record.pairs) ? JSON.stringify(record.pairs) : null;
  }

  const options = toArray(toRecord(content)?.options);
  const selectedIndexes = firstIntArray(
    record.options,
    record.selected_options,
    record.selectedOptions,
    record.option,
    record.selected_option,
    record.selectedOption,
    record.value
  );

  if (!selectedIndexes?.length) {
    return null;
  }

  return labelsForIndexes(options, selectedIndexes);
}

function labelsForIndexes(options: unknown[] | null, indexes: number[]): string {
  if (options) {
    const labels = indexes
      .map((index) => labelFromOption(options[index]))
      .filter((label): label is string => label !== null);

    if (labels.length > 0) {
      return labels.join(", ");
    }
  }

  return indexes.map((index) => `Option ${index + 1}`).join(", ");
}

function labelFromOption(option: unknown): string | null {
  if (typeof option === "string") {
    return option;
  }

  const record = toRecord(option);
  if (!record) {
    return null;
  }

  return (
    stringOf(record.text) ??
    stringOf(record.label) ??
    stringOf(record.body) ??
    stringOf(record.value) ??
    null
  );
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function firstIntArray(...values: unknown[]): number[] | null {
  for (const value of values) {
    const intArray = toIntArray(value);
    if (intArray) {
      return intArray;
    }
  }

  return null;
}

function toIntArray(value: unknown): number[] | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return [Math.round(value)];
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? [Math.round(parsed)] : null;
  }

  const array = toArray(value);
  if (!array) {
    return null;
  }

  const ints = array.map((entry) => {
    if (typeof entry === "number" && Number.isFinite(entry)) {
      return Math.round(entry);
    }

    if (typeof entry === "string" && entry.trim()) {
      const parsed = Number(entry);
      return Number.isFinite(parsed) ? Math.round(parsed) : null;
    }

    return null;
  });

  return ints.every((entry): entry is number => entry !== null) ? ints : null;
}

function stringOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
