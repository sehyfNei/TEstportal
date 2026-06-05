import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_OUTPUT_TOKENS_CEILING } from "@/lib/ai/config";
import { computeCostUsd, hashInput } from "@/lib/ai/cost";
import { callAi } from "@/lib/ai/gateway";
import type { AiCallInput, LedgerRow } from "@/lib/ai/types";

describe("callAi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns disabled without calling fetch when AI is disabled", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubEnv("AI_DISABLED", "true");
    const fetchFn = vi.fn();
    const rows: LedgerRow[] = [];

    const result = await callAi(baseInput(), {
      fetchFn: fetchFn as unknown as typeof fetch,
      writeLedger: async (row) => {
        rows.push(row);
      }
    });

    expect(result).toEqual({
      ok: false,
      error: "ai_disabled",
      status: "disabled",
      latencyMs: 0
    });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "disabled",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0
    });
  });

  it("parses successful content, usage, cost, and ledger metadata", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubEnv("AI_DISABLED", "false");
    const input = baseInput({ jsonMode: true, maxTokens: 256 });
    const rows: LedgerRow[] = [];
    const fetchFn = mockFetchJson({
      choices: [{ message: { content: "{\"ok\":true}" } }],
      usage: { prompt_tokens: 100, completion_tokens: 25 }
    });

    const result = await callAi(input, {
      fetchFn,
      writeLedger: async (row) => {
        rows.push(row);
      }
    });

    expect(result).toMatchObject({
      ok: true,
      content: "{\"ok\":true}",
      tokensIn: 100,
      tokensOut: 25,
      costUsd: computeCostUsd("llama-3.3-70b-versatile", 100, 25)
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "completed",
      inputHash: hashInput(input.messages),
      promptVersion: input.promptVersion,
      outputSchemaVersion: input.outputSchemaVersion,
      inputTokens: 100,
      outputTokens: 25
    });
  });

  it("records a failed ledger row for non-2xx responses", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const rows: LedgerRow[] = [];

    const result = await callAi(baseInput(), {
      fetchFn: vi.fn(async () => new Response("model_decommissioned", { status: 400 })) as unknown as typeof fetch,
      writeLedger: async (row) => {
        rows.push(row);
      }
    });

    expect(result).toMatchObject({ ok: false, error: "http_error", status: "failed" });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("failed");
    expect(rows[0].errorMessage).toContain("model_decommissioned");
  });

  it("records a failed ledger row when fetch throws", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const rows: LedgerRow[] = [];

    const result = await callAi(baseInput(), {
      fetchFn: vi.fn(async () => {
        throw new Error("offline");
      }) as unknown as typeof fetch,
      writeLedger: async (row) => {
        rows.push(row);
      }
    });

    expect(result).toMatchObject({ ok: false, error: "network_error", status: "failed" });
    expect(rows[0]).toMatchObject({ status: "failed" });
    expect(rows[0].errorMessage).toContain("offline");
  });

  it("treats missing content as an empty response", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const rows: LedgerRow[] = [];

    const result = await callAi(baseInput(), {
      fetchFn: mockFetchJson({
        choices: [{ message: {} }],
        usage: { prompt_tokens: 10, completion_tokens: 2 }
      }),
      writeLedger: async (row) => {
        rows.push(row);
      }
    });

    expect(result).toMatchObject({ ok: false, error: "empty_response", status: "failed" });
    expect(rows[0]).toMatchObject({
      status: "failed",
      inputTokens: 10,
      outputTokens: 2,
      costUsd: 0
    });
  });

  it("clamps max tokens above the configured ceiling", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    let requestBody: Record<string, unknown> | null = null;
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return jsonResponse({
        choices: [{ message: { content: "done" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 }
      });
    }) as unknown as typeof fetch;

    await callAi(baseInput({ maxTokens: MAX_OUTPUT_TOKENS_CEILING + 1000 }), {
      fetchFn,
      writeLedger: async () => {}
    });

    expect((requestBody as { max_tokens?: number } | null)?.max_tokens).toBe(MAX_OUTPUT_TOKENS_CEILING);
  });

  it("keeps the successful return value when ledger writing throws", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await callAi(baseInput(), {
      fetchFn: mockFetchJson({
        choices: [{ message: { content: "done" } }],
        usage: { prompt_tokens: 3, completion_tokens: 4 }
      }),
      writeLedger: async () => {
        throw new Error("ledger unavailable");
      }
    });

    expect(result).toMatchObject({ ok: true, content: "done" });
    expect(consoleSpy).toHaveBeenCalled();
  });
});

function baseInput(overrides: Partial<AiCallInput> = {}): AiCallInput {
  return {
    feature: "post_test_analysis",
    messages: [
      { role: "system", content: "Reply with JSON." },
      { role: "user", content: "Return ok." }
    ],
    promptVersion: "post_test_analysis@1.0.0",
    outputSchemaVersion: "1.0.0",
    ...overrides
  };
}

function mockFetchJson(body: unknown): typeof fetch {
  return vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
