export function evaluateAnswer(type: string, content: unknown, selectedAnswer: unknown): boolean | null {
  if (type === "integer") {
    return evaluateInteger(content, selectedAnswer);
  }

  if (type === "match") {
    return evaluateMatch(content, selectedAnswer);
  }

  if (type === "msq") {
    return evaluateMsq(content, selectedAnswer);
  }

  if (type === "mcq" || type === "statement" || type === "assertion") {
    return evaluateSingleChoice(content, selectedAnswer);
  }

  return null;
}

function evaluateSingleChoice(content: unknown, selectedAnswer: unknown) {
  const question = toRecord(content);
  const selected = toRecord(selectedAnswer);

  if (!question || !selected) {
    return null;
  }

  const correctOptions = toNumberArray(question.correct_options);
  const selectedOptions = toNumberArray(selected.options ?? selected.selected_options);

  if (!correctOptions || !selectedOptions?.length) {
    return null;
  }

  if (selectedOptions.length > 1) {
    return null;
  }

  if (correctOptions.length !== 1) {
    return false;
  }

  return selectedOptions[0] === correctOptions[0];
}

function evaluateMsq(content: unknown, selectedAnswer: unknown) {
  const question = toRecord(content);
  const selected = toRecord(selectedAnswer);

  if (!question || !selected) {
    return null;
  }

  const correctOptions = toNumberArray(question.correct_options);
  const selectedOptions = toNumberArray(selected.options ?? selected.selected_options);

  if (!correctOptions || !selectedOptions?.length) {
    return null;
  }

  return arraysEqual(sortNumbers(selectedOptions), sortNumbers(correctOptions));
}

function evaluateInteger(content: unknown, selectedAnswer: unknown) {
  const question = toRecord(content);
  const selected = toRecord(selectedAnswer);

  if (!question || !selected) {
    return null;
  }

  const correctInteger = toNumber(question.correct_integer);
  const selectedInteger = toNumber(selected.integer ?? selected.value);

  if (correctInteger === null || selectedInteger === null) {
    return null;
  }

  return selectedInteger === correctInteger;
}

function evaluateMatch(content: unknown, selectedAnswer: unknown) {
  const question = toRecord(content);
  const selected = toRecord(selectedAnswer);

  if (!question || !selected || !("pairs" in selected)) {
    return null;
  }

  if (!Array.isArray(question.pairs) || !Array.isArray(selected.pairs)) {
    return null;
  }

  if (question.pairs.length !== selected.pairs.length) {
    return false;
  }

  return arraysEqual(sortByJson(selected.pairs), sortByJson(question.pairs), stableJson);
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const numbers = value.map(toNumber);
  return numbers.every((number): number is number => number !== null) ? numbers : null;
}

function sortNumbers(values: number[]) {
  return [...values].sort((left, right) => left - right);
}

function sortByJson(values: unknown[]) {
  return [...values].sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
}

function arraysEqual<T>(left: T[], right: T[], normalize: (value: T) => unknown = (value) => value) {
  return left.length === right.length && left.every((value, index) => normalize(value) === normalize(right[index]));
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}
