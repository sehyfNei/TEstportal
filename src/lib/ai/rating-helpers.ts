export const VALID_SCOPES = ["question_analysis", "topic_summary", "overall"] as const;
export type RatingScope = (typeof VALID_SCOPES)[number];

export const VALID_RATINGS = ["up", "down"] as const;
export type RatingValue = (typeof VALID_RATINGS)[number];

export const VALID_REPORT_CATEGORIES = [
  "wrong_answer",
  "misleading",
  "off_topic",
  "low_quality"
] as const;
export type ReportCategory = (typeof VALID_REPORT_CATEGORIES)[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  wrong_answer: "Wrong answer",
  misleading: "Misleading",
  off_topic: "Off topic",
  low_quality: "Low quality"
};

export function isValidScope(value: unknown): value is RatingScope {
  return typeof value === "string" && (VALID_SCOPES as readonly string[]).includes(value);
}

export function isValidRating(value: unknown): value is RatingValue {
  return typeof value === "string" && (VALID_RATINGS as readonly string[]).includes(value);
}

export function isValidReportCategory(value: unknown): value is ReportCategory {
  return (
    typeof value === "string" && (VALID_REPORT_CATEGORIES as readonly string[]).includes(value)
  );
}
