import { getTestMode } from "@/lib/tests/catalog";

export type ScheduledItemStatus = "planned" | "completed" | "cancelled";

export type ScheduledItemLike = {
  scheduledFor: string;
  status: ScheduledItemStatus;
};

export type GroupedScheduledItems<T extends ScheduledItemLike> = {
  overdue: T[];
  upcoming: T[];
  past: T[];
};

/**
 * Overdue is derived, never stored: a planned item whose time has passed.
 * Buckets: overdue (oldest first), upcoming (soonest first), past (most recent first).
 */
export function groupScheduledItems<T extends ScheduledItemLike>(
  items: readonly T[],
  now: Date
): GroupedScheduledItems<T> {
  const overdue: T[] = [];
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const item of items) {
    if (item.status !== "planned") {
      past.push(item);
      continue;
    }

    if (toTime(item.scheduledFor) < now.getTime()) {
      overdue.push(item);
    } else {
      upcoming.push(item);
    }
  }

  overdue.sort((a, b) => toTime(a.scheduledFor) - toTime(b.scheduledFor));
  upcoming.sort((a, b) => toTime(a.scheduledFor) - toTime(b.scheduledFor));
  past.sort((a, b) => toTime(b.scheduledFor) - toTime(a.scheduledFor));

  return { overdue, upcoming, past };
}

function toTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export type ScheduleModeId = "diagnostic" | "topic" | "sectional" | "mock" | "retest";

export type ResolvedScheduleMode = {
  itemType: "test" | "retest";
  sessionType: "diagnostic" | "topic" | "concept_retest" | "sectional" | "mock";
  requiresTopic: boolean;
  title: string;
};

/** Maps a schedule-form mode to the item_type/session_type pair stored on scheduled_items. */
export function resolveScheduleMode(modeId: string | null | undefined): ResolvedScheduleMode | null {
  if (modeId === "retest") {
    return {
      itemType: "retest",
      sessionType: "concept_retest",
      requiresTopic: false,
      title: "Mistake retest"
    };
  }

  const mode = getTestMode(modeId);
  if (!mode) {
    return null;
  }

  return {
    itemType: "test",
    sessionType: mode.sessionType,
    requiresTopic: mode.requiresTopic,
    title: mode.title
  };
}

/** Where "Start now" on a planned item should send the student. */
export function startNowHref(item: { sessionType: string; topicId: string | null }): string {
  if (item.sessionType === "concept_retest") {
    return "/mistakes";
  }

  const mode = getTestMode(item.sessionType);
  if (!mode) {
    return "/tests";
  }

  return item.topicId ? `/tests?mode=${mode.id}&topicId=${item.topicId}` : `/tests?mode=${mode.id}`;
}

export type ScheduledForParse = { ok: true; iso: string } | { ok: false; message: string };

/** Accepts datetime-local ("2026-07-15T18:30") or ISO strings; rejects anything unparseable. */
export function parseScheduledFor(value: unknown): ScheduledForParse {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, message: "A date and time is required." };
  }

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return { ok: false, message: "Enter a valid date and time." };
  }

  return { ok: true, iso: new Date(time).toISOString() };
}

/** Only planned items can change; completed/cancelled are final. */
export function canTransitionScheduleStatus(from: string, to: string): to is ScheduledItemStatus {
  return from === "planned" && (to === "completed" || to === "cancelled");
}
