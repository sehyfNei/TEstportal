import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { AiCallResult } from "@/lib/ai/types";
import { callAi } from "@/lib/ai/gateway";
import {
  buildAnalysisInput,
  generateAnalysisJob,
  type AnalysisJobStore,
  type AnalysisSource
} from "@/lib/ai/jobs/generate-analysis";
import { extractQuestionContext } from "@/lib/ai/jobs/question-context";

describe("extractQuestionContext", () => {
  it("extracts MCQ stem, correct label, and selected label", () => {
    const result = extractQuestionContext(
      "mcq",
      { stem: "Which article?", options: ["Art 14", "Art 19"], correct_options: [0] },
      { options: [0] }
    );

    expect(result).toEqual({
      stem: "Which article?",
      selectedLabel: "Art 14",
      correctLabel: "Art 14"
    });
  });

  it("keeps the correct label when the selected MCQ option is wrong", () => {
    const result = extractQuestionContext(
      "mcq",
      { stem: "Which article?", options: ["Art 14", "Art 19"], correct_options: [0] },
      { options: [1] }
    );

    expect(result.selectedLabel).toBe("Art 19");
    expect(result.correctLabel).toBe("Art 14");
  });

  it("extracts integer correct and selected values", () => {
    const result = extractQuestionContext(
      "integer",
      { body: "How many schedules?", correct_integer: 12 },
      { value: "12" }
    );

    expect(result).toEqual({
      stem: "How many schedules?",
      selectedLabel: "12",
      correctLabel: "12"
    });
  });

  it("returns a null selected label for skipped questions", () => {
    const result = extractQuestionContext(
      "mcq",
      { stem: "Which schedule?", options: ["Ninth", "Tenth"], correct_options: [1] },
      null
    );

    expect(result.selectedLabel).toBeNull();
    expect(result.correctLabel).toBe("Tenth");
  });

  it("falls back gracefully for malformed content", () => {
    expect(() => extractQuestionContext("mcq", null, { options: [0] })).not.toThrow();

    const result = extractQuestionContext("mcq", { unknown: true }, { options: [0] });

    expect(result).toEqual({
      stem: "(question)",
      selectedLabel: "Option 1",
      correctLabel: null
    });
  });
});

describe("buildAnalysisInput", () => {
  it("maps source fields into the analysis input shape", () => {
    const input = buildAnalysisInput(minimalSource());

    expect(input).toMatchObject({
      examName: "UPSC Prelims",
      score: 4,
      maxScore: 8,
      accuracy: 0.5,
      questions: [
        {
          questionId: "q-1",
          type: "mcq",
          stem: "Which article?",
          isCorrect: true,
          selectedLabel: "Art 14",
          correctLabel: "Art 14",
          topicName: "Polity",
          conceptName: "Fundamental Rights"
        }
      ]
    });
  });
});

describe("generateAnalysisJob", () => {
  it("finalizes completed when AI returns valid schema JSON", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => validAiResult());

    await generateAnalysisJob("result-uuid", "user-uuid", mockSupabase(), {
      store,
      callAiFn: callAiMock as unknown as typeof callAi
    });

    expect(callAiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "post_test_analysis",
        userId: "user-uuid",
        relatedEntityType: "session_result",
        relatedEntityId: "result-uuid",
        jsonMode: true
      })
    );
    expect(store.finalizeRow).toHaveBeenCalledWith(
      "result-uuid",
      "completed",
      expect.objectContaining({ overallSummary: "Solid fundamentals." }),
      null
    );
  });

  it("finalizes failed when the AI gateway returns a failed result", async () => {
    const store = mockStore();
    const callAiMock = vi.fn(async () => failureAiResult("http_error", "failed"));

    await generateAnalysisJob("result-uuid", "user-uuid", mockSupabase(), {
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

    await generateAnalysisJob("result-uuid", "user-uuid", mockSupabase(), {
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
          questionAnalyses: [],
          topicSummaries: [],
          strategyInsights: [],
          nextActions: []
        })
      )
    );

    await generateAnalysisJob("result-uuid", "user-uuid", mockSupabase(), {
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

  it("exits idempotently when the running insert conflicts", async () => {
    const store = mockStore({
      insertRunningRow: vi.fn().mockResolvedValue({ conflict: true, error: null })
    });
    const callAiMock = vi.fn(async () => validAiResult());

    await generateAnalysisJob("result-uuid", "user-uuid", mockSupabase(), {
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

    await generateAnalysisJob("result-uuid", "user-uuid", mockSupabase(), {
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
});

function mockStore(overrides: Partial<AnalysisJobStore> = {}): AnalysisJobStore {
  return {
    insertRunningRow: vi.fn().mockResolvedValue({ conflict: false, error: null }),
    finalizeRow: vi.fn().mockResolvedValue(undefined),
    loadSource: vi.fn().mockResolvedValue(minimalSource()),
    ...overrides
  };
}

function minimalSource(): AnalysisSource {
  return {
    resultId: "result-uuid",
    userId: "user-uuid",
    examName: "UPSC Prelims",
    score: 4,
    maxScore: 8,
    accuracy: 0.5,
    questions: [
      {
        questionId: "q-1",
        type: "mcq",
        content: {
          stem: "Which article?",
          options: ["Art 14", "Art 19"],
          correct_options: [0]
        },
        isCorrect: true,
        selectedAnswer: { options: [0] },
        topicName: "Polity",
        conceptName: "Fundamental Rights"
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
    questionAnalyses: [
      {
        questionId: "q-1",
        whyCorrect: "Art 14 is the equality article.",
        whySelectedWrong: null,
        trapExplanation: null
      }
    ],
    topicSummaries: [
      {
        topicName: "Polity",
        summary: "Good.",
        recommendation: "Review more."
      }
    ],
    overallSummary: "Solid fundamentals.",
    strategyInsights: [],
    nextActions: []
  });
}

function mockSupabase(): SupabaseClient {
  return {} as SupabaseClient;
}
