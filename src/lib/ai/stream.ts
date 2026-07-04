import {
  DEFAULT_GROQ_MODEL,
  GROQ_BASE_URL,
  MAX_OUTPUT_TOKENS_CEILING,
  isAiEnabled
} from "@/lib/ai/config";
import type { AiMessage } from "@/lib/ai/types";

const CHAT_MAX_OUTPUT_TOKENS = 1024;
const CHAT_TEMPERATURE = 0.7;

export type ChatStreamUsage = {
  tokensIn: number;
  tokensOut: number;
};

export type StreamChatResult =
  | {
      ok: true;
      stream: ReadableStream<string>;
      getUsage: () => Promise<ChatStreamUsage>;
    }
  | { ok: false; error: "ai_disabled" | "http_error" | "network_error" };

export async function streamChatCompletion(
  messages: AiMessage[],
  model = DEFAULT_GROQ_MODEL
): Promise<StreamChatResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "ai_disabled" };
  }

  let response: Response;
  try {
    response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
        temperature: CHAT_TEMPERATURE,
        max_tokens: Math.min(CHAT_MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS_CEILING)
      })
    });
  } catch {
    return { ok: false, error: "network_error" };
  }

  if (!response.ok || !response.body) {
    return { ok: false, error: "http_error" };
  }

  let emittedText = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let usageResolved = false;
  let resolveUsage!: (usage: ChatStreamUsage) => void;
  const usagePromise = new Promise<ChatStreamUsage>((resolve) => {
    resolveUsage = resolve;
  });

  const finishUsage = () => {
    if (usageResolved) {
      return;
    }

    usageResolved = true;
    resolveUsage({
      tokensIn: tokensIn || estimateTokens(messages.map((message) => message.content).join("\n")),
      tokensOut: tokensOut || estimateTokens(emittedText)
    });
  };

  const stream = new ReadableStream<string>({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          buffer = processBufferedEvents(buffer, controller, (chunk) => {
            emittedText += chunk;
          }, (usage) => {
            tokensIn = usage.tokensIn;
            tokensOut = usage.tokensOut;
          }, finishUsage);

          if (usageResolved) {
            return;
          }
        }

        if (buffer.trim()) {
          processBufferedEvents(
            `${buffer}\n`,
            controller,
            (chunk) => {
              emittedText += chunk;
            },
            (usage) => {
              tokensIn = usage.tokensIn;
              tokensOut = usage.tokensOut;
            },
            finishUsage
          );

          if (usageResolved) {
            return;
          }
        }

        finishUsage();
        controller.close();
      } catch (error) {
        finishUsage();
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      finishUsage();
    }
  });

  return { ok: true, stream, getUsage: () => usagePromise };
}

function processBufferedEvents(
  buffer: string,
  controller: ReadableStreamDefaultController<string>,
  appendText: (chunk: string) => void,
  updateUsage: (usage: ChatStreamUsage) => void,
  finishUsage: () => void
): string {
  const lines = buffer.split("\n");
  const remainder = lines.pop() ?? "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("data:")) {
      continue;
    }

    const data = line.slice("data:".length).trim();
    if (data === "[DONE]") {
      finishUsage();
      controller.close();
      return "";
    }

    const parsed = parseStreamChunk(data);
    if (!parsed) {
      continue;
    }

    const chunk = readDeltaContent(parsed);
    if (chunk) {
      appendText(chunk);
      controller.enqueue(chunk);
    }

    const usage = readUsage(parsed);
    if (usage) {
      updateUsage(usage);
    }
  }

  return remainder;
}

function parseStreamChunk(data: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readDeltaContent(value: Record<string, unknown>): string {
  const choices = value.choices;
  if (!Array.isArray(choices)) {
    return "";
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const delta = (firstChoice as { delta?: unknown }).delta;
  if (!delta || typeof delta !== "object") {
    return "";
  }

  const content = (delta as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}

function readUsage(value: Record<string, unknown>): ChatStreamUsage | null {
  const usage = readUsageObject(value.usage) ?? readUsageObject(readNestedUsage(value.x_groq));
  if (!usage) {
    return null;
  }

  return {
    tokensIn: toNonNegativeInteger(usage.prompt_tokens),
    tokensOut: toNonNegativeInteger(usage.completion_tokens)
  };
}

function readNestedUsage(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return null;
  }

  return (value as { usage?: unknown }).usage ?? null;
}

function readUsageObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toNonNegativeInteger(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function estimateTokens(text: string): number {
  return text.trim() ? Math.ceil(text.length / 4) : 0;
}
