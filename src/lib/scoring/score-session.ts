import { evaluateAnswer } from "./answer-eval";
import { applyMarkingRule, DEFAULT_MARKING_RULE } from "./marking-rules";
import type { AnswerEvaluation, MarkingRule } from "./marking-rules";

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

export function scoreQuestion(
  type: string,
  content: unknown,
  selectedAnswer: unknown,
  rule: MarkingRule = DEFAULT_MARKING_RULE
): AnswerEvaluation {
  return applyMarkingRule(type, evaluateAnswer(type, content, selectedAnswer), rule);
}

export function scoreSession(
  questions: ScoredQuestionInput[],
  rule: MarkingRule = DEFAULT_MARKING_RULE
): SessionScoreSummary {
  const summary: SessionScoreSummary = {
    score: 0,
    maxScore: questions.length * rule.marksPerCorrect,
    accuracy: 0,
    attempted: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    topicScores: {}
  };

  for (const question of questions) {
    const evaluation = scoreQuestion(question.type, question.content, question.selectedAnswer, rule);
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
    topic.maxScore += rule.marksPerCorrect;

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

  const round2 = (n: number) => Math.round(n * 100) / 100;
  summary.score = round2(summary.score);
  for (const topic of Object.values(summary.topicScores)) {
    topic.score = round2(topic.score);
  }

  return summary;
}
