export type ChatRole = "user" | "assistant" | "system";

export type ChatSession = {
  id: string;
  user_id: string;
  exam_id: string | null;
  title: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_session_id: string;
  role: ChatRole;
  content: string;
  token_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
