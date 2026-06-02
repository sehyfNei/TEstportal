export type ConfidenceLevel = "low" | "medium" | "high";

export type SessionType = "diagnostic" | "topic" | "concept_retest" | "sectional" | "mock" | "benchmark" | "custom";

export type QuestionDifficulty = "easy" | "medium" | "hard";

export type AnswerConfidence = "sure" | "unsure" | "guessed";

export type MasteryScope = "topic" | "concept";

export type ScoreBucket = {
  score: number;
  maxScore: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
};

export type SessionAnswerForMastery = {
  questionId: string;
  isCorrect: boolean | null;
  confidence: AnswerConfidence | null;
  marksAwarded: number;
  timeSpentSec: number;
  revisitCount: number;
};

export type MasteryInput = {
  userId: string;
  examId: string;
  sessionId: string;
  sessionType: SessionType;
  topicScores: Record<string, ScoreBucket>;
  conceptScores: Record<string, ScoreBucket> | null;
  sessionAnswers: SessionAnswerForMastery[];
  questionDifficulties: Map<string, QuestionDifficulty>;
  questionTopics: Map<string, string>;
  questionConcepts: Map<string, string[]>;
};

export type WeightFactors = {
  latestAccuracy: number;
  difficultyWeight: number;
  confidenceWeight: number;
  benchmarkWeight: number;
  recencyWeight: number;
};

export type MasteryUpdate = {
  topicId?: string;
  conceptId?: string;
  oldMasteryScore: number | null;
  newMasteryScore: number;
  confidenceLevel: ConfidenceLevel;
  stabilityFactor: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastTestedAt: Date;
};

export type MasteryRecord = {
  id: string;
  userId: string;
  examId: string;
  topicId?: string | null;
  conceptId?: string | null;
  masteryScore: number;
  confidenceLevel: ConfidenceLevel;
  baselineScore?: number | null;
  stabilityFactor: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastTestedAt?: Date | null;
  updatedAt: Date;
};
