export type MarkingRule = {
  marksPerCorrect: number;
  negativeMarkingFraction: number;
  noNegativeForTypes?: string[];
};

export type AnswerEvaluation = {
  attempted: boolean;
  isCorrect: boolean | null;
  marksAwarded: number;
};

export const DEFAULT_MARKING_RULE: MarkingRule = {
  marksPerCorrect: 2,
  negativeMarkingFraction: 0.33
};

const MANIFEST_NUMBER_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

export function applyMarkingRule(
  type: string,
  isCorrect: boolean | null,
  rule: MarkingRule = DEFAULT_MARKING_RULE
): AnswerEvaluation {
  if (isCorrect === null) {
    return {
      attempted: false,
      isCorrect: null,
      marksAwarded: 0
    };
  }

  if (isCorrect) {
    return {
      attempted: true,
      isCorrect: true,
      marksAwarded: rule.marksPerCorrect
    };
  }

  const suppressNegative = rule.noNegativeForTypes?.includes(type) ?? false;

  return {
    attempted: true,
    isCorrect: false,
    marksAwarded: suppressNegative ? 0 : -rule.negativeMarkingFraction * rule.marksPerCorrect
  };
}

export function buildMarkingRuleFromManifest(marking: unknown): MarkingRule {
  const record = toRecord(marking);

  if (!record) {
    return { ...DEFAULT_MARKING_RULE };
  }

  const marksPerCorrect = parseManifestNumber(record.marksPerCorrect);
  const negativeMarkingFraction = parseManifestNumber(record.negativeMarkingFraction);

  if (marksPerCorrect === null || negativeMarkingFraction === null) {
    return { ...DEFAULT_MARKING_RULE };
  }

  const rule: MarkingRule = {
    marksPerCorrect,
    negativeMarkingFraction
  };

  if (isStringArray(record.noNegativeForTypes)) {
    rule.noNegativeForTypes = record.noNegativeForTypes;
  }

  return rule;
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseManifestNumber(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    const text = String(value);
    return MANIFEST_NUMBER_PATTERN.test(text) ? value : null;
  }

  if (typeof value === "string" && MANIFEST_NUMBER_PATTERN.test(value)) {
    return Number(value);
  }

  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
