import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { AiCallResult } from "@/lib/ai/types";
import { callAi } from "@/lib/ai/gateway";
import {
  buildPlanInput,
  generatePlanJob,
  type PlanJobStore,
  type PlanSource
} from "@/lib/ai/jobs/generate-plan";

describe("buildPlanInput", () => {
  it("maps source fields into the plan input shape", () => {
    const input = buildPlanInput(minimalSource());

    expect(input).toMatchObject({
      examName: "UPSC Prelims",
      readinessScore: 42,
      confidenceLevel: "low",
      coveragePercent: 0.3,
      score: 4,
      maxScore: 8,
      accuracy: 0.5,
      weakTopics: [
        { topicName: "Polity", masteryScore: 30, weightPercent: 20, priority: 14 }
      ]
    });
  });

  it("returns null when there are no weak topics", () => {
    expect(buildPlanInput({ ...minimalSource(), weakTopics: [] })).toBeNull();
  });
});

describe("generatePlanJob", () => {
  it("finalizes completed when AI returns valid schema JSON", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => validAiResult());

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(callAiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "improvement_plan",
        userId: "user-uuid",
        relatedEntityType: "session_result",
        relatedEntityId: "result-uuid",
        jsonMode: true
      })
    );
    expect(store.insertRunningRow).toHaveBeenCalledWith("result-uuid", "user-uuid", "exam-uuid");
    expect(store.finalizeRow).toHaveBeenCalledWith(
      "result-uuid",
      "completed",
      expect.objectContaining({ overallStrategy: "Focus on Polity." }),
      null
    );
  });

  it("finalizes failed when the AI gateway returns a failed result", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => failureAiResult("http_error", "failed"));

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(store.finalizeRow).toHaveBeenCalledWith(
      "result-uuid",
      "failed",
      null,
      "ai_error:http_error"
    );
  });

  it("finalizes disabled when the AI gateway is disabled", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => failureAiResult("ai_disabled", "disabled"));

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(store.finalizeRow).toHaveBeenCalledWith(
      "result-uuid",
      "disabled",
      null,
      "ai_error:ai_disabled"
    );
  });

  it("finalizes failed when AI JSON fails schema validation", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () =>
      validAiResult(
        JSON.stringify({
          overallStrategy: "Plan.",
          prioritizedTopics: [],
          nextActions: []
        })
      )
    );

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(store.finalizeRow).toHaveBeenCalledWith(
      "result-uuid",
      "failed",
      null,
      expect.stringContaining("validation_failed:")
    );
  });

  it("finalizes failed with no_weak_topics when the source has no weak topics", async () => {
    const store = mockStore({
      loadSource: vi.fn().mockResolvedValue({ ...minimalSource(), weakTopics: [] })
    });
    const callAiMock = vi.fn(async () => validAiResult());

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(callAiMock).not.toHaveBeenCalled();
    expect(store.finalizeRow).toHaveBeenCalledWith("result-uuid", "failed", null, "no_weak_topics");
  });

  it("exits idempotently when the running insert conflicts", async () => {
    const store = mockStore({
      insertRunningRow: vi.fn().mockResolvedValue({ conflict: true, error: null })
    });
    const callAiMock = vi.fn(async () => validAiResult());

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(store.loadSource).not.toHaveBeenCalled();
    expect(store.finalizeRow).not.toHaveBeenCalled();
    expect(callAiMock).not.toHaveBeenCalled();
  });

  it("finalizes failed when source loading throws", async () => {
    const store = mockStore({
      loadSource: vi.fn().mockRejectedValue(new Error("database unavailable"))
    });

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: vi.fn(async () => validAiResult()) as unknown as typeof callAi
    });

    expect(store.finalizeRow).toHaveBeenCalledWith(
      "result-uuid",
      "failed",
      null,
      "load_failed:database unavailable"
    );
  });

  it("finalizes failed with user_mismatch when the source belongs to another user", async () => {
    const store = mockStore({
      loadSource: vi.fn().mockResolvedValue({ ...minimalSource(), userId: "someone-else" })
    });

    await generatePlanJob("result-uuid", "user-uuid", "exam-uuid", mockSupabase(), {
      store,
      callAiFn: vi.fn(async () => validAiResult()) as unknown as typeof callAi
    });

    expect(store.finalizeRow).toHaveBeenCalledWith("result-uuid", "failed", null, "user_mismatch");
  });
});

function mockStore(overrides: Partial<PlanJobStore> = {}): PlanJobStore {
  return {
    insertRunningRow: vi.fn().mockResolvedValue({ conflict: false, error: null }),
    finalizeRow: vi.fn().mockResolvedValue(undefined),
    loadSource: vi.fn().mockResolvedValue(minimalSource()),
    ...overrides
  };
}

function minimalSource(): PlanSource {
  return {
    resultId: "result-uuid",
    userId: "user-uuid",
    examId: "exam-uuid",
    examName: "UPSC Prelims",
    score: 4,
    maxScore: 8,
    accuracy: 0.5,
    readiness: {
      score: 42,
      confidenceLevel: "low",
      coveragePercent: 0.3,
      staleTopicIds: [],
      hasBenchmarkSession: false,
      breakdown: {}
    },
    weakTopics: [
      {
        topicId: "topic-1",
        topicName: "Polity",
        masteryScore: 30,
        weightPercent: 20,
        priority: 14
      }
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

function failureAiResult(
  error: "ai_disabled" | "http_error" | "network_error" | "empty_response",
  status: "failed" | "disabled"
): AiCallResult {
  return {
    ok: false,
    error,
    status,
    latencyMs: 100
  };
}

function validAiContent() {
  return JSON.stringify({
    overallStrategy: "Focus on Polity.",
    prioritizedTopics: [
      {
        topicName: "Polity",
        rationale: "High weight and low mastery.",
        focusActions: ["Revise Fundamental Rights"]
      }
    ],
    nextActions: ["Schedule a Polity practice set"]
  });
}

function mockSupabase(): SupabaseClient {
  return {} as SupabaseClient;
}
