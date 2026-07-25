export const MAX_GOAL_LENGTH = 280;

export type ParsedTargetDate = { ok: true; iso: string } | { ok: false; message: string };

export function parseTargetDate(raw: string, now: Date = new Date()): ParsedTargetDate {
  if (!raw) {
    return { ok: false, message: "Target date is required." };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: "Target date must be a valid date." };
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (parsed.getTime() < today.getTime()) {
    return { ok: false, message: "Target date must be in the future." };
  }

  return { ok: true, iso: raw };
}
