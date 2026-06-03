import { createHash } from "node:crypto";
import type { AiMessage } from "@/lib/ai/types";

export const GROQ_PRICING: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  "llama-3.3-70b-versatile": { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  "llama-3.1-8b-instant": { inputPerMillion: 0.05, outputPerMillion: 0.08 }
};

const FALLBACK_PRICING = { inputPerMillion: 0.59, outputPerMillion: 0.79 };

export function computeCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = GROQ_PRICING[model] ?? FALLBACK_PRICING;
  const inputCost =
    (Math.max(0, tokensIn) / 1_000_000) * pricing.inputPerMillion;
  const outputCost =
    (Math.max(0, tokensOut) / 1_000_000) * pricing.outputPerMillion;
  const cost = inputCost + outputCost;

  return Number.isFinite(cost) ? Number(cost.toFixed(6)) : 0;
}

export function hashInput(messages: AiMessage[]): string {
  const canonical = JSON.stringify(
    messages.map((message) => ({
      role: message.role,
      content: message.content
    }))
  );

  return createHash("sha256").update(canonical).digest("hex");
}
