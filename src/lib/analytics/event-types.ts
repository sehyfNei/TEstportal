export const EVENT_TYPES = [
  "test_start",
  "test_submit",
  "answer_save",
  "analysis_view"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function isValidEventType(value: unknown): value is EventType {
  return typeof value === "string" && (EVENT_TYPES as readonly string[]).includes(value);
}
