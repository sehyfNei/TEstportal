// HuggingFace sentence-embedding client (TSP-032).
//
// Thin server-side wrapper over the HF Inference API feature-extraction
// pipeline. Deliberately separate from the Groq gateway: embeddings are a
// different provider with a different billing model, and this endpoint is
// free-tier friendly for our batch sizes (<= 40 short texts per call).

import { EMBEDDING_MODEL, parseEmbeddingResponse } from "@/lib/question-bank/duplicate-check";

const HF_ENDPOINT = `https://api-inference.huggingface.co/pipeline/feature-extraction/${EMBEDDING_MODEL}`;
const HF_TIMEOUT_MS = 30_000;

export type EmbedTextsResult =
  | { ok: true; vectors: number[][] }
  | { ok: false; message: string };

export function hasEmbeddingConfig(): boolean {
  return Boolean(process.env.HUGGINGFACE_API_KEY);
}

export async function embedTexts(texts: string[]): Promise<EmbedTextsResult> {
  if (texts.length === 0) {
    return { ok: true, vectors: [] };
  }

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Duplicate check is not configured (HUGGINGFACE_API_KEY missing)." };
  }

  let response: Response;
  try {
    response = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      signal: AbortSignal.timeout(HF_TIMEOUT_MS)
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "network error";
    return { ok: false, message: `Embedding request failed: ${reason}` };
  }

  if (!response.ok) {
    return { ok: false, message: `Embedding service returned ${response.status}.` };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return { ok: false, message: "Embedding service returned non-JSON." };
  }

  const parsed = parseEmbeddingResponse(raw, texts.length);
  return parsed.ok ? { ok: true, vectors: parsed.vectors } : { ok: false, message: parsed.message };
}
