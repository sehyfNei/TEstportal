import type { NextRequest } from "next/server";
import { DEFAULT_GROQ_MODEL } from "@/lib/ai/config";
import { streamChatCompletion } from "@/lib/ai/stream";
import type { AiMessage } from "@/lib/ai/types";
import {
  buildSystemMessage,
  checkDailyUsageCap,
  estimateTokenCount,
  getOrCreateSession,
  getRecentMessages,
  insertMessage,
  loadSessionContextSnapshot,
  validateChatRequestBody,
  writeChatCostLedger
} from "@/lib/chat/chat-service";
import { assembleContext, type ContextPayload } from "@/lib/chat/context-injector";
import { assembleTopicContext, buildPersonaSystemMessage, loadActivePersona } from "@/lib/chat/persona-context";
import { isFeatureEnabled } from "@/lib/flags";
import { getAiConsent } from "@/lib/profile/profile-service";
import { CHAT_RATE_LIMIT, checkRateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EMPTY_CONTEXT: ContextPayload = {
  examName: null,
  readinessScore: 0,
  readinessConfidence: "low",
  weakTopics: [],
  recentMistakes: [],
  improvementPlanHeadline: null,
  hasData: false
};

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isFeatureEnabled(supabase, "chat_enabled"))) {
      return Response.json(
        { error: "Chat is temporarily disabled. Please try again later." },
        { status: 503 }
      );
    }

    const validation = validateChatRequestBody(await request.json().catch(() => null));
    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { sessionId, examId, topicId, message } = validation;
    const rateLimit = await checkRateLimit(supabase, CHAT_RATE_LIMIT, user.id);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Too many requests. Please wait a few minutes and try again." },
        { status: 429 }
      );
    }

    const cap = await checkDailyUsageCap(user.id);
    if (!cap.allowed) {
      return Response.json(
        { error: "daily_limit", reason: cap.reason ?? "usage_cap_exceeded" },
        { status: 429 }
      );
    }

    const hasConsent = await getAiConsent(supabase, user.id);
    if (!hasConsent) {
      return Response.json({ error: "no_consent" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const contextPayload = await resolveContextPayload(
      supabase,
      adminSupabase,
      user.id,
      examId,
      sessionId
    );

    const activeSessionId = await getOrCreateSession(
      adminSupabase,
      user.id,
      examId,
      sessionId,
      message,
      contextPayload,
      topicId
    );

    await insertMessage(adminSupabase, activeSessionId, "user", message, estimateTokenCount(message));

    const systemMessage = await resolveSystemMessage(supabase, user.id, topicId, contextPayload);
    const history = await getRecentMessages(adminSupabase, activeSessionId);
    const groqMessages = ensureCurrentUserMessage([systemMessage, ...history], message);
    const streamStartedAt = Date.now();
    const streamResult = await streamChatCompletion(groqMessages, DEFAULT_GROQ_MODEL);

    if (!streamResult.ok) {
      await safeWriteChatCostLedger(adminSupabase, {
        userId: user.id,
        sessionId: activeSessionId,
        messages: groqMessages,
        model: DEFAULT_GROQ_MODEL,
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: elapsedMs(streamStartedAt),
        status: streamResult.error === "ai_disabled" ? "disabled" : "failed",
        errorMessage: streamResult.error
      });

      return Response.json({ error: streamResult.error }, { status: 503 });
    }

    let collected = "";
    const passthrough = new TransformStream<string, string>({
      transform(chunk, controller) {
        collected += chunk;
        controller.enqueue(chunk);
      },
      async flush() {
        const usage = await streamResult.getUsage();
        const tokensOut = usage.tokensOut || estimateTokenCount(collected);

        await safeInsertAssistantMessage(adminSupabase, activeSessionId, collected, tokensOut);
        await safeWriteChatCostLedger(adminSupabase, {
          userId: user.id,
          sessionId: activeSessionId,
          messages: groqMessages,
          model: DEFAULT_GROQ_MODEL,
          tokensIn: usage.tokensIn,
          tokensOut,
          latencyMs: elapsedMs(streamStartedAt)
        });
      }
    });

    return new Response(streamResult.stream.pipeThrough(passthrough), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Session-Id": activeSessionId
      }
    });
  } catch (error) {
    console.error("[study/chat] request failed", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function ensureCurrentUserMessage(messages: AiMessage[], message: string): AiMessage[] {
  const last = messages[messages.length - 1];
  if (last?.role === "user" && last.content === message) {
    return messages;
  }

  return [...messages, { role: "user", content: message }];
}

// TSP-191: a topic with an active expert persona routes to that persona's
// voice + topic-scoped mastery/mistake context instead of the generic
// exam-wide tutor prompt. No topic, or a topic with no active persona,
// falls through to the original exam-wide behavior unchanged.
async function resolveSystemMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  topicId: string | null,
  contextPayload: ContextPayload
): Promise<AiMessage> {
  if (!topicId) {
    return buildSystemMessage(contextPayload);
  }

  try {
    const persona = await loadActivePersona(supabase, topicId);
    if (!persona) {
      return buildSystemMessage(contextPayload);
    }

    const topicContext = await assembleTopicContext(supabase, userId, topicId);
    return buildPersonaSystemMessage(persona, topicContext);
  } catch (error) {
    console.error("[study/chat] persona resolution failed", error);
    return buildSystemMessage(contextPayload);
  }
}

async function resolveContextPayload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  adminSupabase: ReturnType<typeof createAdminClient>,
  userId: string,
  examId: string | null,
  sessionId: string | null
): Promise<ContextPayload> {
  if (examId) {
    return assembleContext(supabase, userId, examId).catch((error: unknown) => {
      console.error("[study/chat] context assembly failed", error);
      return EMPTY_CONTEXT;
    });
  }

  const sessionContext = await loadSessionContextSnapshot(adminSupabase, userId, sessionId).catch(
    (error: unknown) => {
      console.error("[study/chat] session context load failed", error);
      return null;
    }
  );

  return sessionContext ?? EMPTY_CONTEXT;
}

async function safeInsertAssistantMessage(
  adminSupabase: Parameters<typeof insertMessage>[0],
  sessionId: string,
  content: string,
  tokenCount: number
): Promise<void> {
  try {
    await insertMessage(adminSupabase, sessionId, "assistant", content, tokenCount, {
      model: DEFAULT_GROQ_MODEL
    });
  } catch (error) {
    console.error("[study/chat] assistant message insert failed", error);
  }
}

async function safeWriteChatCostLedger(
  adminSupabase: Parameters<typeof writeChatCostLedger>[0],
  input: Parameters<typeof writeChatCostLedger>[1]
): Promise<void> {
  try {
    await writeChatCostLedger(adminSupabase, input);
  } catch (error) {
    console.error("[study/chat] cost ledger write failed", error);
  }
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
