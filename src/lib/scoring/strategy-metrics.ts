import type { StrategyMetrics } from "./result-types";

export type ScoredAnswerInput = {
  isCorrect: boolean | null;
  marksAwarded: number;
  confidence: "sure" | "unsure" | "guessed" | null;
  timeSpentSec: number;
  revisitCount: number;
};

export function computeStrategyMetrics(answers: ScoredAnswerInput[]): StrategyMetrics {
  return answers.reduce<StrategyMetrics>(
    (metrics, answer) => {
      if (answer.isCorrect === false) {
        metrics.negativeMarksLost += Math.abs(answer.marksAwarded);
        metrics.timeOnWrongSec += answer.timeSpentSec;

        if (answer.confidence === "sure") {
          metrics.highConfidenceWrong += 1;
        }
      }

      if (answer.isCorrect === true && answer.confidence === "guessed") {
        metrics.correctGuessed += 1;
      }

      if (answer.isCorrect === null) {
        metrics.timeOnSkippedSec += answer.timeSpentSec;
      }

      metrics.totalRevisits += answer.revisitCount;

      return metrics;
    },
    {
      negativeMarksLost: 0,
      highConfidenceWrong: 0,
      correctGuessed: 0,
      totalRevisits: 0,
      timeOnWrongSec: 0,
      timeOnSkippedSec: 0
    }
  );
}
