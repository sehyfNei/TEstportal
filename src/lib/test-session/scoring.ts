export type MarkingRule = {
  marksPerCorrect: number;
  negativeMarkingFraction: number;
};

export type AnswerEvaluation = {
  attempted: boolean;
  isCorrect: boolean | null;
  marksAwarded: number;
};

export type ScoredQuestionInput = {
  questionId: string;
  topicId?: string | null;
  type: string;
  content: unknown;
  selectedAnswer: unknown;
};

export type SessionScoreSummary = {
  score: number;
  maxScore: number;
  accuracy: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  topicScores: Record<
    string,
    {
      score: number;
      maxScore: number;
      attempted: number;
      correct: number;
      incorrect: number;
      skipped: number;
    }
  >;
};

export const DEFAULT_MARKING_RULE: MarkingRule = {
  marksPerCorrect: 2,
  negativeMarkingFraction: 0.33
};

export function evaluateAnswer(type: string, content: unknown, selectedAnswer: unknown) {
  const question = toRecord(content);
  const selected = toRecord(selectedAnswer);

  if (!selected || !question) {
    return null;
  }

  if (type === "integer") {
    const correctInteger = toNumber(question.correct_integer);
    const selectedInteger = toNumber(selected.integer ?? selected.value);

    if (selectedInteger === null) {
      return null;
    }

    return correctInteger !== null && selectedInteger === correctInteger;
  }

  if (type === "match") {
    if (!("pairs" in selected)) {
      return null;
    }

    return stableJson(selected.pairs) === stableJson(question.pairs);
  }

  const correctOptions = toNumberArray(question.correct_options);
  const selectedOptions = toNumberArray(selected.options ?? selected.selected_options);

  if (!selectedOptions?.length) {
    return null;
  }

  return (
    correctOptions !== null &&
    correctOptions.length > 0 &&
    arraysEqual(sortNumbers(selectedOptions), sortNumbers(correctOptions))
  );
}

export function scoreAnswer(
  type: string,
  content: unknown,
  selectedAnswer: unknown,
  markingRule: MarkingRule = DEFAULT_MARKING_RULE
): AnswerEvaluation {
  const isCorrect = evaluateAnswer(type, content, selectedAnswer);

  if (isCorrect === null) {
    return {
      attempted: false,
      isCorrect: null,
      marksAwarded: 0
    };
  }

  return {
    attempted: true,
    isCorrect,
    marksAwarded: isCorrect
      ? markingRule.marksPerCorrect
      : -markingRule.negativeMarkingFraction * markingRule.marksPerCorrect
  };
}

export function scoreSession(
  questions: ScoredQuestionInput[],
  markingRule: MarkingRule = DEFAULT_MARKING_RULE
): SessionScoreSummary {
  const summary: SessionScoreSummary = {
    score: 0,
    maxScore: questions.length * markingRule.marksPerCorrect,
    accuracy: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    topicScores: {}
  };

  for (const question of questions) {
    const evaluation = scoreAnswer(question.type, question.content, question.selectedAnswer, markingRule);
    const topicKey = question.topicId ?? "unassigned";
    const topic = (summary.topicScores[topicKey] ??= {
      score: 0,
      maxScore: 0,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0
    });

    summary.score += evaluation.marksAwarded;
    topic.score += evaluation.marksAwarded;
    topic.maxScore += markingRule.marksPerCorrect;
    summary.maxScore = questions.length * markingRule.marksPerCorrect;

    if (!evaluation.attempted) {
      summary.skipped += 1;
      topic.skipped += 1;
      continue;
    }

    summary.attempted += 1;
    topic.attempted += 1;

    if (evaluation.isCorrect) {
      summary.correct += 1;
      topic.correct += 1;
    } else {
      summary.incorrect += 1;
      topic.incorrect += 1;
    }
  }

  summary.accuracy = summary.attempted ? summary.correct / summary.attempted : 0;

  return summary;
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

function arraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}
