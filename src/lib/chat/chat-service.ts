import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCostUsd, hashInput } from "@/lib/ai/cost";
import { DEFAULT_GROQ_MODEL } from "@/lib/ai/config";
import type { AiMessage } from "@/lib/ai/types";
import type { ChatRole } from "@/lib/chat/types";
import type { ContextPayload } from "@/lib/chat/context-injector";

export const CHAT_HISTORY_LIMIT = 10;
export const CHAT_PROMPT_VERSION = "chat@1.0.0";
// Keep in sync with the composer maxLength in chat-view.tsx (client bundle
// must not import this server module).
export const MAX_CHAT_MESSAGE_CHARS = 4000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ChatRequestValidation =
  | { ok: true; sessionId: string | null; examId: string | null; message: string }
  | { ok: false; error: "empty_message" | "message_too_long" | "invalid_id" };

export type UsageCapResult = {
  allowed: boolean;
  reason?: string;
};

export type ChatUsageLedgerInput = {
  userId: string;
  sessionId: string;
  messages: AiMessage[];
  model?: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  status?: "completed" | "failed" | "disabled";
  errorMessage?: string | null;
};

type ChatSessionIdRow = {
  id: string;
};

type ChatSessionContextRow = {
  context: unknown;
};

type ChatMessageRow = {
  role: ChatRole | null;
  content: string | null;
};

export async function checkDailyUsageCap(_userId: string): Promise<UsageCapResult> {
  // TODO Standing Decision #4: replace this stub with the founder-approved per-user/day cap.
  return { allowed: true };
}

export function validateChatRequestBody(body: unknown): ChatRequestValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "empty_message" };
  }

  const record = body as { sessionId?: unknown; examId?: unknown; message?: unknown };
  const message = typeof record.message === "string" ? record.message.trim() : "";
  if (!message) {
    return { ok: false, error: "empty_message" };
  }
  if (message.length > MAX_CHAT_MESSAGE_CHARS) {
    return { ok: false, error: "message_too_long" };
  }

  const sessionId = readOptionalUuid(record.sessionId);
  const examId = readOptionalUuid(record.examId);
  if (!sessionId.ok || !examId.ok) {
    return { ok: false, error: "invalid_id" };
  }

  return { ok: true, sessionId: sessionId.id, examId: examId.id, message };
}

function readOptionalUuid(value: unknown): { ok: true; id: string | null } | { ok: false } {
  // Non-strings (absent, null, wrong JSON type) degrade to "not provided";
  // only a present-but-malformed string id is rejected.
  if (typeof value !== "string") {
    return { ok: true, id: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, id: null };
  }

  return UUID_PATTERN.test(trimmed) ? { ok: true, id: trimmed } : { ok: false };
}

export function buildSystemMessage(payload: ContextPayload): AiMessage {
  const lines: string[] = [];

  lines.push(
    payload.examName
      ? `You are a personalised AI study tutor for ${payload.examName}.`
      : "You are a personalised AI study tutor for competitive exam preparation."
  );

  if (!payload.hasData) {
    lines.push("");
    lines.push(
      "The student is new; no learning data is available yet. Introduce yourself briefly and ask what topic they want to work on."
    );
    return { role: "system", content: lines.join("\n") };
  }

  lines.push("");
  lines.push(
    `Student readiness: ${payload.readinessScore}/100 (${payload.readinessConfidence} confidence).`
  );

  if (payload.weakTopics.length > 0) {
    lines.push(
      `Weak topics: ${payload.weakTopics
        .map(
          (topic) =>
            `${topic.topicName} (mastery ${Math.round(topic.masteryScore)}%, weight ${Math.round(
              topic.weightPercent
            )}%)`
        )
        .join("; ")}.`
    );
  }

  if (payload.recentMistakes.length > 0) {
    lines.push(
      `Recent unresolved mistakes: ${payload.recentMistakes
        .map((mistake) =>
          mistake.topicName ? `${mistake.mistakeType} in ${mistake.topicName}` : mistake.mistakeType
        )
        .join("; ")}.`
    );
  }

  if (payload.improvementPlanHeadline) {
    lines.push(`Current study plan: ${payload.improvementPlanHeadline}.`);
  }

  lines.push("");
  lines.push(
    "Use this context to give concise, accurate, actionable study guidance. Focus on weak areas, explain step by step when useful, and frame feedback constructively without exposing internal implementation details."
  );

  return { role: "system", content: lines.join("\n") };
}

export async function getOrCreateSession(
  adminSupabase: SupabaseClient,
  userId: string,
  examId: string | null,
  sessionId: string | null,
  firstMessagePreview: string,
  contextSnapshot: ContextPayload
): Promise<string> {
  if (sessionId) {
    const { data, error } = await adminSupabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load chat session: ${error.message}`);
    }

    if ((data as ChatSessionIdRow | null)?.id) {
      return (data as ChatSessionIdRow).id;
    }
  }

  const { data, error } = await adminSupabase
    .from("chat_sessions")
    .insert({
      user_id: userId,
      exam_id: examId,
      title: buildSessionTitle(firstMessagePreview),
      context: contextSnapshot
    })
    .select("id")
    .single();

  if (error || !(data as ChatSessionIdRow | null)?.id) {
    throw new Error(`Failed to create chat session: ${error?.message ?? "missing id"}`);
  }

  return (data as ChatSessionIdRow).id;
}

export async function loadSessionContextSnapshot(
  adminSupabase: SupabaseClient,
  userId: string,
  sessionId: string | null
): Promise<ContextPayload | null> {
  if (!sessionId) {
    return null;
  }

  const { data, error } = await adminSupabase
    .from("chat_sessions")
    .select("context")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load chat session context: ${error.message}`);
  }

  return readContextPayload((data as ChatSessionContextRow | null)?.context);
}

export async function insertMessage(
  adminSupabase: SupabaseClient,
  sessionId: string,
  role: ChatRole,
  content: string,
  tokenCount: number | null = null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await adminSupabase.from("chat_messages").insert({
    chat_session_id: sessionId,
    role,
    content,
    token_count: tokenCount,
    metadata
  });

  if (error) {
    throw new Error(`Failed to insert chat message: ${error.message}`);
  }
}

export async function getRecentMessages(
  adminSupabase: SupabaseClient,
  sessionId: string
): Promise<AiMessage[]> {
  const { data, error } = await adminSupabase
    .from("chat_messages")
    .select("role,content")
    .eq("chat_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(CHAT_HISTORY_LIMIT);

  if (error) {
    throw new Error(`Failed to load chat history: ${error.message}`);
  }

  return ((data ?? []) as ChatMessageRow[])
    .reverse()
    .filter((message): message is { role: AiMessage["role"]; content: string } =>
      isAiRole(message.role) && typeof message.content === "string" && message.content.trim().length > 0
    )
    .map((message) => ({ role: message.role, content: message.content }));
}

export async function writeChatCostLedger(
  adminSupabase: SupabaseClient,
  input: ChatUsageLedgerInput
): Promise<void> {
  const model = input.model ?? DEFAULT_GROQ_MODEL;
  const inputTokens = Math.max(0, Math.floor(input.tokensIn));
  const outputTokens = Math.max(0, Math.floor(input.tokensOut));
  const { error } = await adminSupabase.from("llm_cost_ledger").insert({
    user_id: input.userId,
    feature: "chat",
    provider: "groq",
    model_name: model,
    prompt_version: CHAT_PROMPT_VERSION,
    input_hash: hashInput(input.messages),
    output_schema_version: null,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: computeCostUsd(model, inputTokens, outputTokens),
    latency_ms: Math.max(0, Math.floor(input.latencyMs)),
    status: input.status ?? "completed",
    error_message: truncateError(input.errorMessage ?? null),
    related_entity_type: "chat_session",
    related_entity_id: input.sessionId
  });

  if (error) {
    throw new Error(`Failed to write chat cost ledger: ${error.message}`);
  }
}

export function estimateTokenCount(text: string): number {
  return text.trim() ? Math.ceil(text.length / 4) : 0;
}

function buildSessionTitle(message: string): string {
  return message.replace(/\s+/g, " ").trim().slice(0, 60) || "Study chat";
}

function isAiRole(value: unknown): value is AiMessage["role"] {
  return value === "system" || value === "user" || value === "assistant";
}

function truncateError(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.length > 1000 ? value.slice(0, 1000) : value;
}

function readContextPayload(value: unknown): ContextPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const payload = value as Partial<ContextPayload>;
  const confidence = payload.readinessConfidence;
  if (confidence !== "low" && confidence !== "medium" && confidence !== "high") {
    return null;
  }

  return {
    examName: typeof payload.examName === "string" ? payload.examName : null,
    readinessScore: toFiniteNumber(payload.readinessScore),
    readinessConfidence: confidence,
    weakTopics: Array.isArray(payload.weakTopics) ? payload.weakTopics : [],
    recentMistakes: Array.isArray(payload.recentMistakes) ? payload.recentMistakes : [],
    improvementPlanHeadline:
      typeof payload.improvementPlanHeadline === "string" ? payload.improvementPlanHeadline : null,
    hasData: payload.hasData === true
  };
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
