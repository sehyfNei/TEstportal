import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatDisplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type RawMessageRow = {
  id: string | null;
  role: string | null;
  content: string | null;
};

export async function loadChatHistory(
  supabase: SupabaseClient,
  sessionId: string
): Promise<ChatDisplayMessage[]> {
  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return [];
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,role,content")
    .eq("chat_session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return [];
  }

  return toDisplayMessages((data ?? []) as RawMessageRow[]).reverse();
}

function toDisplayMessages(rows: RawMessageRow[]): ChatDisplayMessage[] {
  return rows
    .filter(
      (row): row is { id: string; role: "user" | "assistant"; content: string } =>
        typeof row.id === "string" &&
        (row.role === "user" || row.role === "assistant") &&
        typeof row.content === "string" &&
        row.content.trim().length > 0
    )
    .map((row) => ({ id: row.id, role: row.role, content: row.content }));
}
