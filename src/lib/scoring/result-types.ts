export type ScoreBucket = {
  score: number;
  maxScore: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
};

export type TopicScore = ScoreBucket;

export type DifficultyScores = {
  easy?: TopicScore;
  medium?: TopicScore;
  hard?: TopicScore;
};

export type SourceScores = {
  pyq?: TopicScore;
  ai_generated?: TopicScore;
  manual?: TopicScore;
  vision_ingested?: TopicScore;
};

export type ConceptScores = Record<string, TopicScore>;

export type StrategyMetrics = {
  negativeMarksLost: number;
  highConfidenceWrong: number;
  correctGuessed: number;
  totalRevisits: number;
  timeOnWrongSec: number;
  timeOnSkippedSec: number;
};

export type SessionResultSummary = {
  resultId: string;
  sessionId: string;
  score: number;
  maxScore: number;
  accuracy: number;
  attempted: number;
  correct: number;
  incorrect: number;
  skipped: number;
  durationSec: number;
  topicScores: Record<string, TopicScore>;
  difficultyScores?: DifficultyScores;
  sourceScores?: SourceScores;
  conceptScores?: ConceptScores;
  strategyMetrics?: StrategyMetrics;
};
