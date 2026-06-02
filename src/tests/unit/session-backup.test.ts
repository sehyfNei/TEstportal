import { describe, expect, it } from "vitest";
import {
  mergeWithBackup,
  type SessionBackupSnapshot
} from "@/lib/test-session/session-backup-store";
import { type QuestionState } from "@/lib/test-session/answer-shape";

const serverAnswered: QuestionState = {
  answer: { options: [1] },
  confidence: "sure",
  markedReview: false
};

const backupAnswered: QuestionState = {
  answer: { options: [2] },
  confidence: "guessed",
  markedReview: true
};

const serverUnanswered: QuestionState = {
  answer: null,
  confidence: null,
  markedReview: false
};

function backup(questionStates: Record<string, QuestionState>): SessionBackupSnapshot {
  return {
    questionStates,
    savedAt: "2026-05-31T00:00:00.000Z"
  };
}

describe("mergeWithBackup", () => {
  it("keeps the server state when the server has an answer", () => {
    expect(mergeWithBackup({ q1: serverAnswered }, backup({ q1: backupAnswered }))).toEqual({
      q1: serverAnswered
    });
  });

  it("uses the backup when the server answer is null", () => {
    expect(mergeWithBackup({ q1: serverUnanswered }, backup({ q1: backupAnswered }))).toEqual({
      q1: backupAnswered
    });
  });

  it("uses the backup when the server is missing the question key", () => {
    expect(mergeWithBackup({ q1: serverAnswered }, backup({ q2: backupAnswered }))).toEqual({
      q1: serverAnswered,
      q2: backupAnswered
    });
  });

  it("leaves server state unchanged when no backup exists", () => {
    expect(mergeWithBackup({ q1: serverAnswered }, null)).toEqual({
      q1: serverAnswered
    });
  });

  it("keeps overlapping non-null server answers over backup metadata", () => {
    const server = {
      answer: { integer: 42 },
      confidence: "unsure",
      markedReview: false
    } satisfies QuestionState;
    const local = {
      answer: { integer: 7 },
      confidence: "sure",
      markedReview: true
    } satisfies QuestionState;

    expect(mergeWithBackup({ q1: server }, backup({ q1: local }))).toEqual({
      q1: server
    });
  });
});
