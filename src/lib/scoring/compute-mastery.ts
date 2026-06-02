import type {
  AnswerConfidence,
  ConfidenceLevel,
  QuestionDifficulty,
  SessionType,
  WeightFactors
} from "./mastery-types";

const WEIGHTS: WeightFactors = {
  latestAccuracy: 0.4,
  difficultyWeight: 0.15,
  confidenceWeight: 0.25,
  benchmarkWeight: 0.15,
  recencyWeight: 0.05
};

const SESSION_TYPE_WEIGHT: Record<SessionType, number> = {
  diagnostic: 1.0,
  topic: 1.0,
  concept_retest: 1.0,
  sectional: 1.0,
  mock: 1.5,
  benchmark: 1.5,
  custom: 1.0
};

const CONFIDENCE_ADJUSTMENT: Record<AnswerConfidence, number> = {
  sure: 1.0,
  unsure: 0.7,
  guessed: 0.5
};

const DEFAULT_CONFIDENCE = 0.6;

export type MasteryComputationResult = {
  masteryScore: number;
  confidenceLevel: ConfidenceLevel;
  stabilityFactor: number;
};

export function computeTopicMastery(
  oldMastery: number | null,
  topicAccuracy: number,
  sessionType: SessionType,
  confidenceInTopic: number,
  difficultyInTopic: number,
  questionsAttempted: number,
  questionsCorrect: number,
  oldQuestionsAttempted = 0,
  oldQuestionsCorrect = 0,
  oldStabilityFactor = 1.0
): MasteryComputationResult {
  const accuracy = clamp01(topicAccuracy);
  const confidence = clamp(confidenceInTopic, -1, 1);
  const positiveConfidence = clamp01(confidence);
  const difficulty = clamp01(difficultyInTopic);
  const currentAttempted = Math.max(0, questionsAttempted);
  const currentCorrect = Math.max(0, Math.min(questionsCorrect, currentAttempted));
  const priorAttempted = Math.max(0, oldQuestionsAttempted);
  const priorCorrect = Math.max(0, Math.min(oldQuestionsCorrect, priorAttempted));
  const totalAttempted = priorAttempted + currentAttempted;

  if (oldMastery === null) {
    return {
      masteryScore: roundMastery(accuracy * 100 * (0.7 + 0.3 * positiveConfidence)),
      confidenceLevel: priorAttempted === 0 ? "low" : updateConfidenceLevel(totalAttempted),
      stabilityFactor: 1.0
    };
  }

  const oldScore = clamp100(oldMastery);
  const sessionWeight = SESSION_TYPE_WEIGHT[sessionType] ?? 1.0;
  const totalCorrect = priorCorrect + currentCorrect;
  const lifetimeAccuracy = totalAttempted > 0 ? totalCorrect / totalAttempted : accuracy;
  const latestSignal = accuracy * 100 * sessionWeight;
  const difficultySignal = accuracy * 100 * (0.8 + 0.4 * difficulty) * sessionWeight;
  const confidenceSignal = confidence * 100 * sessionWeight;
  const benchmarkSignal = accuracy * 100 * sessionWeight;
  const recencySignal = lifetimeAccuracy * 100;
  const weightedScore =
    latestSignal * WEIGHTS.latestAccuracy +
    difficultySignal * WEIGHTS.difficultyWeight +
    confidenceSignal * WEIGHTS.confidenceWeight +
    benchmarkSignal * WEIGHTS.benchmarkWeight +
    recencySignal * WEIGHTS.recencyWeight;

  const newSignal = weightedScore / totalWeight();
  const blendedScore = oldScore * 0.6 + newSignal * 0.4;
  const stabilityFactor = updateStabilityFactor(accuracy, oldScore, oldStabilityFactor);

  if (accuracy < 0.5 && positiveConfidence > 0.8) {
    const penalty = Math.min(oldScore, 1.5 * Math.abs(accuracy * 100 - oldScore));
    const penalizedScore = Math.max(0, oldScore - penalty);

    return {
      masteryScore: roundMastery(penalizedScore * 0.5 + blendedScore * 0.5),
      confidenceLevel: updateConfidenceLevel(totalAttempted),
      stabilityFactor
    };
  }

  return {
    masteryScore: roundMastery(blendedScore),
    confidenceLevel: updateConfidenceLevel(totalAttempted),
    stabilityFactor
  };
}

export function aggregateConfidenceInTopic(
  answers: Array<{ isCorrect: boolean | null; confidence: AnswerConfidence | null }>
): number {
  if (answers.length === 0) {
    return DEFAULT_CONFIDENCE;
  }

  let totalConfidence = 0;
  let counted = 0;

  for (const answer of answers) {
    if (answer.isCorrect === null) {
      continue;
    }

    const baseConfidence = answer.confidence ? CONFIDENCE_ADJUSTMENT[answer.confidence] : DEFAULT_CONFIDENCE;
    totalConfidence += answer.isCorrect ? baseConfidence : -baseConfidence * 0.5;
    counted += 1;
  }

  return counted > 0 ? clamp(totalConfidence / counted, -1, 1) : DEFAULT_CONFIDENCE;
}

export function averageDifficultyInTopic(difficulties: QuestionDifficulty[]): number {
  if (difficulties.length === 0) {
    return 0.67;
  }

  const difficultyScore: Record<QuestionDifficulty, number> = {
    easy: 0.33,
    medium: 0.67,
    hard: 1.0
  };

  return difficulties.reduce((sum, difficulty) => sum + difficultyScore[difficulty], 0) / difficulties.length;
}

function updateConfidenceLevel(totalAttempts: number): ConfidenceLevel {
  if (totalAttempts < 3) {
    return "low";
  }

  if (totalAttempts < 10) {
    return "medium";
  }

  return "high";
}

function updateStabilityFactor(accuracy: number, oldMastery: number, oldStabilityFactor: number): number {
  if (accuracy * 100 > oldMastery * 0.8) {
    return Math.min(2.0, Math.max(1.0, oldStabilityFactor) + 0.1);
  }

  return 1.0;
}

function totalWeight() {
  return (
    WEIGHTS.latestAccuracy +
    WEIGHTS.difficultyWeight +
    WEIGHTS.confidenceWeight +
    WEIGHTS.benchmarkWeight +
    WEIGHTS.recencyWeight
  );
}

function roundMastery(score: number) {
  return Math.round(clamp100(score) * 100) / 100;
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function clamp100(value: number) {
  return clamp(value, 0, 100);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
