import {
  DEFAULT_GROQ_MODEL,
  DEFAULT_TEMPERATURE,
  GROQ_BASE_URL,
  MAX_OUTPUT_TOKENS_CEILING,
  isAiEnabled
} from "@/lib/ai/config";
import { computeCostUsd, hashInput } from "@/lib/ai/cost";
import type { AiCallInput, AiCallResult, LedgerRow, LedgerWriter } from "@/lib/ai/types";

type AiGatewayDeps = {
  fetchFn?: typeof fetch;
  writeLedger?: LedgerWriter;
};

export async function callAi(input: AiCallInput, deps: AiGatewayDeps = {}): Promise<AiCallResult> {
  const model = input.model ?? DEFAULT_GROQ_MODEL;
  const inputHash = hashInput(input.messages);
  const writeLedger = deps.writeLedger ?? defaultWriteLedger;

  if (!isAiEnabled()) {
    await safeWriteLedger(writeLedger, buildLedgerRow(input, model, inputHash, "disabled", 0, 0, 0, 0, "ai_disabled"));

    return {
      ok: false,
      error: "ai_disabled",
      status: "disabled",
      latencyMs: 0
    };
  }

  const fetchFn = deps.fetchFn ?? fetch;
  const startedAt = Date.now();

  try {
    const response = await fetchFn(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: resolveMaxTokens(input.maxTokens),
        ...(input.jsonMode ? { response_format: { type: "json_object" } } : {})
      })
    });
    const latencyMs = elapsedMs(startedAt);

    if (!response.ok) {
      const errorText = await safeReadText(response);
      await safeWriteLedger(
        writeLedger,
        buildLedgerRow(
          input,
          model,
          inputHash,
          "failed",
          0,
          0,
          0,
          latencyMs,
          `http_error:${response.status}:${errorText}`
        )
      );

      return {
        ok: false,
        error: "http_error",
        status: "failed",
        latencyMs
      };
    }

    const data = await safeReadJson(response);
    const content = getContent(data);
    const tokensIn = getUsageValue(data, "prompt_tokens");
    const tokensOut = getUsageValue(data, "completion_tokens");

    if (!content) {
      await safeWriteLedger(
        writeLedger,
        buildLedgerRow(input, model, inputHash, "failed", tokensIn, tokensOut, 0, latencyMs, "empty_response")
      );

      return {
        ok: false,
        error: "empty_response",
        status: "failed",
        latencyMs
      };
    }

    const costUsd = computeCostUsd(model, tokensIn, tokensOut);
    await safeWriteLedger(
      writeLedger,
      buildLedgerRow(input, model, inputHash, "completed", tokensIn, tokensOut, costUsd, latencyMs, null)
    );

    return {
      ok: true,
      content,
      model,
      tokensIn,
      tokensOut,
      costUsd,
      latencyMs
    };
  } catch (error) {
    const latencyMs = elapsedMs(startedAt);
    await safeWriteLedger(
      writeLedger,
      buildLedgerRow(
        input,
        model,
        inputHash,
        "failed",
        0,
        0,
        0,
        latencyMs,
        `network_error:${error instanceof Error ? error.message : String(error)}`
      )
    );

    return {
      ok: false,
      error: "network_error",
      status: "failed",
      latencyMs
    };
  }
}

function buildLedgerRow(
  input: AiCallInput,
  modelName: string,
  inputHash: string,
  status: LedgerRow["status"],
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  latencyMs: number | null,
  errorMessage: string | null
): LedgerRow {
  return {
    userId: input.userId ?? null,
    feature: input.feature,
    provider: "groq",
    modelName,
    promptVersion: input.promptVersion ?? null,
    inputHash,
    outputSchemaVersion: input.outputSchemaVersion ?? null,
    inputTokens,
    outputTokens,
    costUsd,
    latencyMs,
    status,
    errorMessage: truncateError(errorMessage),
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null
  };
}

async function safeWriteLedger(writeLedger: LedgerWriter, row: LedgerRow): Promise<void> {
  try {
    await writeLedger(row);
  } catch (error) {
    console.error("AI ledger write failed", error);
  }
}

async function defaultWriteLedger(row: LedgerRow): Promise<void> {
  // Uses the admin client, not the cookie-based request client: this table
  // is an internal cost log (its RLS insert policy only allows a row's own
  // owner or an admin session), and callAi is invoked from cron/background
  // job contexts with no user cookies at all — a request-scoped client would
  // silently fail RLS there. Discovered via TSP-173's live verification: the
  // learning-path generation job (cron-triggered) produced real AI output
  // but its cost never reached the ledger.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { error } = await supabase.from("llm_cost_ledger").insert({
    user_id: row.userId,
    feature: row.feature,
    provider: row.provider,
    model_name: row.modelName,
    prompt_version: row.promptVersion,
    input_hash: row.inputHash,
    output_schema_version: row.outputSchemaVersion,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    cost_usd: row.costUsd,
    latency_ms: row.latencyMs,
    status: row.status,
    error_message: row.errorMessage,
    related_entity_type: row.relatedEntityType,
    related_entity_id: row.relatedEntityId
  });

  if (error) {
    throw error;
  }
}

function resolveMaxTokens(maxTokens: number | undefined): number {
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
    return MAX_OUTPUT_TOKENS_CEILING;
  }

  return Math.min(MAX_OUTPUT_TOKENS_CEILING, Math.max(1, Math.floor(maxTokens)));
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getContent(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) {
    return "";
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}

function getUsageValue(value: unknown, key: "prompt_tokens" | "completion_tokens"): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const usage = (value as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") {
    return 0;
  }

  const rawValue = (usage as Record<string, unknown>)[key];
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
}

function truncateError(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.length > 1000 ? value.slice(0, 1000) : value;
}
