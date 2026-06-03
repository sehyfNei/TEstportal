export function hasGroqConfig(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/** Hard kill-switch primitive; per-provider budget controls land in TSP-142. */
export function isAiEnabled(): boolean {
  return hasGroqConfig() && process.env.AI_DISABLED !== "true";
}

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_TEMPERATURE = 0.2;

/** Minimal per-call cost rail before the full TSP-142 cap system exists. */
export const MAX_OUTPUT_TOKENS_CEILING = 4096;
