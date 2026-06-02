import type { QUESTION_TYPES } from "@/lib/db/schema/question";

type QuestionType = (typeof QUESTION_TYPES)[number];
type JsonRecord = Record<string, unknown>;

// Keep this allowlist in sync with public.build_session_prompt_snapshot in the
// Session 3 SQL migration. The SQL RPC is the security boundary.
export function buildPromptSnapshot(content: unknown, type: QuestionType | string) {
  const record = toRecord(content);
  const snapshot: JsonRecord = { type };

  copyString(record, snapshot, "text");
  copyString(record, snapshot, "stem");
  copyStringArray(record, snapshot, "images");

  if (type === "mcq" || type === "msq") {
    copyStringArray(record, snapshot, "options");
  }

  if (type === "statement") {
    copyStringArray(record, snapshot, "statements");
  }

  if (type === "assertion") {
    copyString(record, snapshot, "assertion");
    copyString(record, snapshot, "reason");
  }

  if (type === "match") {
    copyStringArray(record, snapshot, "left");
    copyStringArray(record, snapshot, "right");
    copyStringArray(record, snapshot, "leftColumn");
    copyStringArray(record, snapshot, "rightColumn");
    copyStringArray(record, snapshot, "prompts");
    copyStringArray(record, snapshot, "choices");
  }

  return snapshot;
}

function toRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function copyString(source: JsonRecord, target: JsonRecord, key: string) {
  const value = source[key];

  if (typeof value === "string") {
    target[key] = value;
  }
}

function copyStringArray(source: JsonRecord, target: JsonRecord, key: string) {
  const value = source[key];

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    target[key] = value;
  }
}
