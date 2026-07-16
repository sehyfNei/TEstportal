import { isSelectedAnswerAnswered, type Confidence, type SelectedAnswer } from "./answer-shape";

type ConfidenceAdvanceInput = {
  answer: SelectedAnswer;
  confidence: Confidence | null;
  currentIndex: number;
  questionCount: number;
};

export function shouldAdvanceAfterConfidence({
  answer,
  confidence,
  currentIndex,
  questionCount
}: ConfidenceAdvanceInput): boolean {
  return (
    confidence !== null &&
    isSelectedAnswerAnswered(answer) &&
    currentIndex >= 0 &&
    currentIndex < questionCount - 1
  );
}

