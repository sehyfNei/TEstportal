import { describe, expect, it } from "vitest";
import {
  canTransitionScheduleStatus,
  groupScheduledItems,
  parseScheduledFor,
  resolveScheduleMode,
  startNowHref,
  type ScheduledItemStatus
} from "@/lib/schedule/schedule-service";

const NOW = new Date("2026-07-12T12:00:00.000Z");

function item(id: string, scheduledFor: string, status: ScheduledItemStatus = "planned") {
  return { id, scheduledFor, status };
}

describe("groupScheduledItems", () => {
  it("splits overdue, upcoming, and past with correct ordering", () => {
    const grouped = groupScheduledItems(
      [
        item("done", "2026-07-01T10:00:00.000Z", "completed"),
        item("late-recent", "2026-07-11T10:00:00.000Z"),
        item("late-old", "2026-07-05T10:00:00.000Z"),
        item("soon", "2026-07-13T10:00:00.000Z"),
        item("later", "2026-07-20T10:00:00.000Z"),
        item("cancelled", "2026-07-10T10:00:00.000Z", "cancelled")
      ],
      NOW
    );

    expect(grouped.overdue.map((entry) => entry.id)).toEqual(["late-old", "late-recent"]);
    expect(grouped.upcoming.map((entry) => entry.id)).toEqual(["soon", "later"]);
    expect(grouped.past.map((entry) => entry.id)).toEqual(["cancelled", "done"]);
  });

  it("treats an item scheduled exactly now as upcoming, not overdue", () => {
    const grouped = groupScheduledItems([item("now", NOW.toISOString())], NOW);
    expect(grouped.overdue).toEqual([]);
    expect(grouped.upcoming.map((entry) => entry.id)).toEqual(["now"]);
  });

  it("completed and cancelled items never appear as overdue", () => {
    const grouped = groupScheduledItems([item("old-done", "2020-01-01T00:00:00.000Z", "completed")], NOW);
    expect(grouped.overdue).toEqual([]);
    expect(grouped.past).toHaveLength(1);
  });
});

describe("resolveScheduleMode", () => {
  it("maps catalog modes to test items", () => {
    expect(resolveScheduleMode("diagnostic")).toMatchObject({ itemType: "test", sessionType: "diagnostic" });
    expect(resolveScheduleMode("sectional")).toMatchObject({
      itemType: "test",
      sessionType: "sectional",
      requiresTopic: true
    });
  });

  it("maps retest to a concept_retest item and rejects unknowns", () => {
    expect(resolveScheduleMode("retest")).toMatchObject({ itemType: "retest", sessionType: "concept_retest" });
    expect(resolveScheduleMode("benchmark")).toBeNull();
    expect(resolveScheduleMode(null)).toBeNull();
    expect(resolveScheduleMode("")).toBeNull();
  });
});

describe("startNowHref", () => {
  it("deep-links test items into the catalog with mode and topic", () => {
    expect(startNowHref({ sessionType: "topic", topicId: "abc" })).toBe("/tests?mode=topic&topicId=abc");
    expect(startNowHref({ sessionType: "mock", topicId: null })).toBe("/tests?mode=mock");
  });

  it("sends retests to the mistake notebook and unknown types to the catalog", () => {
    expect(startNowHref({ sessionType: "concept_retest", topicId: null })).toBe("/mistakes");
    expect(startNowHref({ sessionType: "custom", topicId: null })).toBe("/tests");
  });
});

describe("parseScheduledFor", () => {
  it("accepts datetime-local and ISO strings", () => {
    const local = parseScheduledFor("2026-07-15T18:30");
    expect(local.ok).toBe(true);

    const iso = parseScheduledFor("2026-07-15T18:30:00.000Z");
    expect(iso).toEqual({ ok: true, iso: "2026-07-15T18:30:00.000Z" });
  });

  it("rejects missing or unparseable values", () => {
    expect(parseScheduledFor("").ok).toBe(false);
    expect(parseScheduledFor("   ").ok).toBe(false);
    expect(parseScheduledFor("not-a-date").ok).toBe(false);
    expect(parseScheduledFor(null).ok).toBe(false);
    expect(parseScheduledFor(42).ok).toBe(false);
  });
});

describe("canTransitionScheduleStatus", () => {
  it("only allows planned items to become completed or cancelled", () => {
    expect(canTransitionScheduleStatus("planned", "completed")).toBe(true);
    expect(canTransitionScheduleStatus("planned", "cancelled")).toBe(true);
    expect(canTransitionScheduleStatus("planned", "planned")).toBe(false);
    expect(canTransitionScheduleStatus("completed", "cancelled")).toBe(false);
    expect(canTransitionScheduleStatus("planned", "deleted")).toBe(false);
  });
});
