export type AiProvider = "groq";
export type AiFeature =
  | "post_test_analysis"
  | "improvement_plan"
  | "question_generation"
  | "question_enrichment";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCallInput = {
  feature: AiFeature;
  model?: string;
  messages: AiMessage[];
  promptVersion: string;
  outputSchemaVersion: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  userId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type AiCallSuccess = {
  ok: true;
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
};

export type AiCallFailure = {
  ok: false;
  error: "ai_disabled" | "http_error" | "network_error" | "empty_response";
  status: "failed" | "disabled";
  latencyMs: number;
};

export type AiCallResult = AiCallSuccess | AiCallFailure;

export type LedgerWriter = (row: LedgerRow) => Promise<void>;

export type LedgerRow = {
  userId: string | null;
  feature: string;
  provider: AiProvider;
  modelName: string;
  promptVersion: string | null;
  inputHash: string | null;
  outputSchemaVersion: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number | null;
  status: "completed" | "failed" | "disabled";
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
};
