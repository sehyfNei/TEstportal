// Flag reason allowlist for question reports (TSP-028).
// Keep in sync with:
//   - the SQL CHECK constraint on question_flags.reason
//   - the RPC validation in submit_question_flag
// All three are intentional copies of the same allowlist (same N11-style caveat as quality/exposure).

export const FLAG_REASONS = [
  "incorrect_answer",
  "ambiguous",
  "wrong_topic",
  "outdated",
  "low_quality",
  "other"
] as const;

export type FlagReason = (typeof FLAG_REASONS)[number];

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  incorrect_answer: "Incorrect answer",
  ambiguous: "Ambiguous / unclear",
  wrong_topic: "Wrong topic",
  outdated: "Outdated",
  low_quality: "Low quality",
  other: "Other"
};

export function isValidFlagReason(value: unknown): value is FlagReason {
  return typeof value === "string" && (FLAG_REASONS as readonly string[]).includes(value);
}
