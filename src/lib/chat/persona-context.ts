import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiMessage } from "@/lib/ai/types";

export type ActivePersona = {
  id: string;
  name: string;
  systemPrompt: string;
};

export type TopicContextPayload = {
  topicName: string | null;
  masteryScore: number | null;
  recentMistakeTypes: string[];
};

type PersonaRow = {
  id: string;
  name: string;
  system_prompt: string;
};

type TopicRow = {
  name: string | null;
};

type MasteryRow = {
  mastery_score: number | string | null;
};

type MistakeRow = {
  mistake_type: string | null;
};

// TSP-191: reads through the caller's own authenticated client, relying on
// expert_personas_read_active (TSP-190) — a student can see an active
// persona without any service-role bypass. At most one row can ever match
// (expert_personas_one_active_per_topic), so .maybeSingle() is safe.
export async function loadActivePersona(
  supabase: SupabaseClient,
  topicId: string
): Promise<ActivePersona | null> {
  const { data, error } = await supabase
    .from("expert_personas")
    .select("id,name,system_prompt")
    .eq("topic_id", topicId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as PersonaRow;
  return { id: row.id, name: row.name, systemPrompt: row.system_prompt };
}

// Topic-scoped counterpart to context-injector.ts's assembleContext (which is
// exam-wide) — TSP-191 asks for "that student's mastery/mistake context for
// the subject", not the whole exam's weak-topic list.
export async function assembleTopicContext(
  supabase: SupabaseClient,
  userId: string,
  topicId: string
): Promise<TopicContextPayload> {
  const [topicResult, masteryResult, mistakesResult] = await Promise.allSettled([
    supabase.from("topics").select("name").eq("id", topicId).maybeSingle(),
    supabase
      .from("mastery_records")
      .select("mastery_score")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .maybeSingle(),
    supabase
      .from("mistake_items")
      .select("mistake_type")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .eq("status", "unresolved")
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  const topicRow =
    topicResult.status === "fulfilled" && !topicResult.value.error
      ? (topicResult.value.data as TopicRow | null)
      : null;
  const masteryRow =
    masteryResult.status === "fulfilled" && !masteryResult.value.error
      ? (masteryResult.value.data as MasteryRow | null)
      : null;
  const mistakeRows =
    mistakesResult.status === "fulfilled" && !mistakesResult.value.error
      ? ((mistakesResult.value.data ?? []) as MistakeRow[])
      : [];

  return {
    topicName: topicRow?.name ?? null,
    masteryScore: masteryRow ? toNumber(masteryRow.mastery_score) : null,
    recentMistakeTypes: mistakeRows
      .map((row) => row.mistake_type)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  };
}

export function buildPersonaSystemMessage(
  persona: ActivePersona,
  topicContext: TopicContextPayload
): AiMessage {
  const lines: string[] = [persona.systemPrompt.trim()];

  lines.push("");
  lines.push(
    topicContext.topicName
      ? `You are tutoring this student specifically on: ${topicContext.topicName}.`
      : "You are tutoring this student on your assigned subject."
  );

  if (topicContext.masteryScore !== null) {
    lines.push(`Their mastery in this subject is currently ${Math.round(topicContext.masteryScore)}%.`);
  }

  if (topicContext.recentMistakeTypes.length > 0) {
    lines.push(`Recent unresolved mistake types in this subject: ${topicContext.recentMistakeTypes.join(", ")}.`);
  }

  lines.push("");
  lines.push(
    "Use this to tailor your teaching: reinforce weak areas, recommend practice where useful, and explain concepts on the fly without exposing internal implementation details."
  );

  return { role: "system", content: lines.join("\n") };
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "string" ? Number(value) : (value ?? 0);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
}
