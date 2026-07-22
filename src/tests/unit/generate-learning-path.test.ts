import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { AiCallResult } from "@/lib/ai/types";
import { callAi } from "@/lib/ai/gateway";
import {
  computeTotalWeeks,
  generateLearningPathJob,
  MAX_LEARNING_PATH_WEEKS,
  type LearningPathJobStore,
  type LearningPathSource
} from "@/lib/ai/jobs/generate-learning-path";

const TOPIC_A = "11111111-1111-4111-8111-111111111111";
const TOPIC_B = "22222222-2222-4222-8222-222222222222";

describe("computeTotalWeeks", () => {
  it("computes whole weeks between now and the target date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(computeTotalWeeks("2026-01-29T00:00:00Z", now)).toBe(4);
  });

  it("clamps to at least 1 week when the target date is today or in the past", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(computeTotalWeeks("2026-01-01T00:00:00Z", now)).toBe(1);
    expect(computeTotalWeeks("2025-01-01T00:00:00Z", now)).toBe(1);
  });

  it("caps at MAX_LEARNING_PATH_WEEKS for a far-out target date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(computeTotalWeeks("2028-01-01T00:00:00Z", now)).toBe(MAX_LEARNING_PATH_WEEKS);
  });

  it("falls back to 1 week for an unparseable date", () => {
    expect(computeTotalWeeks("not-a-date", new Date())).toBe(1);
  });
});

describe("generateLearningPathJob", () => {
  it("upserts milestones covering every weak topic when AI output is valid", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => validAiResult());

    await generateLearningPathJob("path-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi,
      now: () => new Date("2026-01-01T00:00:00Z")
    });

    expect(callAiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "learning_path_generation",
        userId: "user-uuid",
        relatedEntityType: "learning_path",
        relatedEntityId: "path-uuid",
        jsonMode: true
      })
    );
    expect(store.upsertMilestones).toHaveBeenCalledWith("path-uuid", [
      { topicId: TOPIC_A, weekNumber: 1, targetMastery: 65 },
      { topicId: TOPIC_B, weekNumber: 2, targetMastery: 55 }
    ]);
  });

  it("throws learning_path_not_found when the path doesn't exist", async () => {
    const store = mockStore({ loadSource: vi.fn().mockResolvedValue(null) });

    await expect(
      generateLearningPathJob("path-uuid", mockSupabase(), { store, callAiFn: vi.fn() as never })
    ).rejects.toThrow("learning_path_not_found");
  });

  it("does nothing (no throw, no AI call) when the path is no longer active", async () => {
    const store = mockStore({
      loadSource: vi.fn().mockResolvedValue({ ...minimalSource(), status: "abandoned" })
    });
    const callAiMock = vi.fn(async () => validAiResult());

    await generateLearningPathJob("path-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(callAiMock).not.toHaveBeenCalled();
    expect(store.upsertMilestones).not.toHaveBeenCalled();
  });

  it("throws no_weak_topics when the student has no weak topics", async () => {
    const store = mockStore({
      loadSource: vi.fn().mockResolvedValue({ ...minimalSource(), weakTopics: [] })
    });
    const callAiMock = vi.fn(async () => validAiResult());

    await expect(
      generateLearningPathJob("path-uuid", mockSupabase(), {
        store,
        callAiFn: callAiMock as unknown as typeof callAi
      })
    ).rejects.toThrow("no_weak_topics");
    expect(callAiMock).not.toHaveBeenCalled();
  });

  it("throws ai_error when the AI gateway fails", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => failureAiResult());

    await expect(
      generateLearningPathJob("path-uuid", mockSupabase(), {
        store,
        callAiFn: callAiMock as unknown as typeof callAi
      })
    ).rejects.toThrow("ai_error:http_error");
  });

  it("throws json_parse_error when the AI response isn't valid JSON", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => validAiResult("not json"));

    await expect(
      generateLearningPathJob("path-uuid", mockSupabase(), {
        store,
        callAiFn: callAiMock as unknown as typeof callAi
      })
    ).rejects.toThrow("json_parse_error");
  });

  it("throws validation_failed when the AI output doesn't match the schema", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => validAiResult(JSON.stringify({ milestones: [] })));

    await expect(
      generateLearningPathJob("path-uuid", mockSupabase(), {
        store,
        callAiFn: callAiMock as unknown as typeof callAi
      })
    ).rejects.toThrow("validation_failed:");
  });

  it("throws incomplete_coverage when a supplied weak topic is missing a milestone", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () =>
      validAiResult(JSON.stringify({ milestones: [{ topicId: TOPIC_A, weekNumber: 1, targetMastery: 65 }] }))
    );

    await expect(
      generateLearningPathJob("path-uuid", mockSupabase(), {
        store,
        callAiFn: callAiMock as unknown as typeof callAi
      })
    ).rejects.toThrow("incomplete_coverage:");
  });

  it("filters out milestones for unknown topics or weeks beyond the plan length", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () =>
      validAiResult(
        JSON.stringify({
          milestones: [
            { topicId: TOPIC_A, weekNumber: 1, targetMastery: 65 },
            { topicId: TOPIC_B, weekNumber: 2, targetMastery: 55 },
            { topicId: TOPIC_B, weekNumber: 99, targetMastery: 90 },
            { topicId: "33333333-3333-4333-8333-333333333333", weekNumber: 1, targetMastery: 40 }
          ]
        })
      )
    );

    await generateLearningPathJob("path-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi,
      now: () => new Date("2026-01-01T00:00:00Z")
    });

    expect(store.upsertMilestones).toHaveBeenCalledWith("path-uuid", [
      { topicId: TOPIC_A, weekNumber: 1, targetMastery: 65 },
      { topicId: TOPIC_B, weekNumber: 2, targetMastery: 55 }
    ]);
  });
});

function mockStore(overrides: Partial<LearningPathJobStore> = {}): LearningPathJobStore {
  return {
    loadSource: vi.fn().mockResolvedValue(minimalSource()),
    upsertMilestones: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function minimalSource(): LearningPathSource {
  return {
    pathId: "path-uuid",
    userId: "user-uuid",
    examId: "exam-uuid",
    examName: "UPSC Prelims",
    goal: "Clear Prelims 2026",
    targetDate: "2026-01-15T00:00:00Z",
    status: "active",
    weakTopics: [
      { topicId: TOPIC_A, topicName: "Polity", masteryScore: 30, weightPercent: 20, priority: 14 },
      { topicId: TOPIC_B, topicName: "Geography", masteryScore: 40, weightPercent: 15, priority: 9 }
    ]
  };
}

function validAiResult(content = validAiContent()): AiCallResult {
  return {
    ok: true,
    content,
    model: "llama-3.3-70b-versatile",
    tokensIn: 50,
    tokensOut: 25,
    costUsd: 0.001,
    latencyMs: 100
  };
}

function failureAiResult(): AiCallResult {
  return { ok: false, error: "http_error", status: "failed", latencyMs: 100 };
}

function validAiContent() {
  return JSON.stringify({
    milestones: [
      { topicId: TOPIC_A, weekNumber: 1, targetMastery: 65 },
      { topicId: TOPIC_B, weekNumber: 2, targetMastery: 55 }
    ]
  });
}

function mockSupabase(): SupabaseClient {
  return {} as SupabaseClient;
}
