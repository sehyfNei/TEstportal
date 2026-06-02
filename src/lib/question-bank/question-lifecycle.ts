import { QUESTION_STATUSES } from "@/lib/db/schema/question";

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_STATUS_TRANSITIONS: Record<QuestionStatus, readonly QuestionStatus[]> = {
  draft: ["validated", "reviewed", "approved", "live", "retired"],
  validated: ["draft", "reviewed", "approved", "live", "retired"],
  reviewed: ["draft", "validated", "approved", "live", "retired"],
  approved: ["draft", "validated", "reviewed", "live", "retired"],
  live: ["draft", "flagged", "retired"],
  flagged: ["live", "draft", "retired"],
  retired: ["draft"]
};

export function isQuestionStatus(value: string): value is QuestionStatus {
  return QUESTION_STATUSES.includes(value as QuestionStatus);
}

export function canTransitionQuestionStatus(from: QuestionStatus, to: QuestionStatus) {
  return QUESTION_STATUS_TRANSITIONS[from].includes(to);
}
