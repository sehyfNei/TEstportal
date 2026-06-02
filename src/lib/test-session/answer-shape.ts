export type SelectedAnswer = { options: number[] } | { integer: number } | null;
export type Confidence = "sure" | "unsure" | "guessed";
export type QuestionState = {
  answer: SelectedAnswer;
  confidence: Confidence | null;
  markedReview: boolean;
};

export function makeMcqAnswer(optionIndex: number): SelectedAnswer {
  return Number.isInteger(optionIndex) && optionIndex >= 0 ? { options: [optionIndex] } : null;
}

export function toggleMsqAnswer(currentAnswer: unknown, optionIndex: number): SelectedAnswer {
  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return normalizeSelectedAnswer("msq", currentAnswer);
  }

  const currentOptions = normalizeOptionIndexes(currentAnswer);
  const nextOptions = currentOptions.includes(optionIndex)
    ? currentOptions.filter((index) => index !== optionIndex)
    : [...currentOptions, optionIndex];

  return nextOptions.length ? { options: sortUniqueOptions(nextOptions) } : null;
}

export function makeIntegerAnswer(value: string | number): SelectedAnswer {
  const normalized = typeof value === "string" ? value.trim() : value;

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? { integer: parsed } : null;
}

export function normalizeSelectedAnswer(type: string, answer: unknown): SelectedAnswer {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return null;
  }

  const record = answer as Record<string, unknown>;

  if (type === "integer") {
    return makeIntegerAnswer(
      typeof record.integer === "number" || typeof record.integer === "string"
        ? record.integer
        : typeof record.value === "number" || typeof record.value === "string"
          ? record.value
          : ""
    );
  }

  if (type === "mcq") {
    const options = normalizeOptionIndexes(record);
    return options.length ? { options: [options[0]] } : null;
  }

  if (type === "msq") {
    const options = normalizeOptionIndexes(record);
    return options.length ? { options } : null;
  }

  return null;
}

export function selectedAnswerToJson(answer: SelectedAnswer) {
  return JSON.stringify(answer);
}

export function isSelectedAnswerAnswered(answer: SelectedAnswer) {
  if (!answer) {
    return false;
  }

  if ("integer" in answer) {
    return Number.isFinite(answer.integer);
  }

  return answer.options.length > 0;
}

function normalizeOptionIndexes(answer: unknown) {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return [];
  }

  const record = answer as Record<string, unknown>;
  const value = record.options ?? record.selected_options;

  if (!Array.isArray(value)) {
    return [];
  }

  return sortUniqueOptions(
    value
      .map((item) => (typeof item === "number" ? item : typeof item === "string" ? Number(item) : NaN))
      .filter((item) => Number.isInteger(item) && item >= 0)
  );
}

function sortUniqueOptions(options: number[]) {
  return [...new Set(options)].sort((left, right) => left - right);
}
