export const AUDIT_ACTIONS = [
  "question_status_change",
  "question_bulk_import",
  "manifest_import"
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isValidAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && (AUDIT_ACTIONS as readonly string[]).includes(value);
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  question_status_change: "Question status change",
  question_bulk_import: "Question bulk import",
  manifest_import: "Manifest import"
};
