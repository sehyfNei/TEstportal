// Semantic duplicate detection (TSP-032) — pure helpers.
//
// A question is embedded from its canonicalized text (stem + sorted options),
// so re-ordered options or whitespace/case differences still collide. The
// similarity search itself runs in Postgres (pgvector cosine); this module
// owns canonicalization, hashing, HF response validation, and thresholds.

export const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

/** Cosine similarity at or above which a row gets a duplicate warning. */
export const DUPLICATE_WARN_THRESHOLD = 0.88;

/** Max rows checked per click — mirrors the enrichment batch cap. */
export const MAX_DUPLICATE_CHECK_ROWS = 30;

/** Max questions indexed per click of the index action. */
export const EMBEDDING_INDEX_BATCH = 40;

export type DuplicateMatch = {
  questionId: string;
  similarity: number;
  stem: string;
  status: string;
};

export type RowDuplicates = {
  rowIndex: number;
  matches: DuplicateMatch[];
};

type EmbeddableContent = {
  text?: unknown;
  options?: unknown;
};

/**
 * Canonical text a question is embedded from: lowercased stem plus its options
 * sorted alphabetically, whitespace collapsed. Sorting makes option order
 * irrelevant, which is the most common form of near-duplicate.
 */
export function canonicalizeQuestionText(content: EmbeddableContent): string {
  const stem = typeof content.text === "string" ? content.text : "";
  const options = Array.isArray(content.options)
    ? content.options.filter((option): option is string => typeof option === "string")
    : [];

  const parts = [stem, ...[...options].sort((a, b) => a.localeCompare(b))];
  return parts
    .join(" | ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** FNV-1a 32-bit hash (hex) — cheap, dependency-free change detection. */
export function contentHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export type EmbeddingParseResult =
  | { ok: true; vectors: number[][] }
  | { ok: false; message: string };

/**
 * Validate a HuggingFace feature-extraction response: exactly one
 * EMBEDDING_DIM-length vector of finite numbers per input text.
 */
export function parseEmbeddingResponse(raw: unknown, expectedCount: number): EmbeddingParseResult {
  if (!Array.isArray(raw)) {
    return { ok: false, message: "Embedding response was not an array." };
  }

  if (raw.length !== expectedCount) {
    return {
      ok: false,
      message: `Expected ${expectedCount} embedding${expectedCount === 1 ? "" : "s"}, got ${raw.length}.`
    };
  }

  const vectors: number[][] = [];
  for (const entry of raw) {
    if (
      !Array.isArray(entry) ||
      entry.length !== EMBEDDING_DIM ||
      entry.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ) {
      return { ok: false, message: `Each embedding must be ${EMBEDDING_DIM} finite numbers.` };
    }
    vectors.push(entry as number[]);
  }

  return { ok: true, vectors };
}

/** pgvector literal for a query parameter, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/** Normalize raw RPC rows into DuplicateMatch[], dropping malformed entries. */
export function toDuplicateMatches(rows: unknown): DuplicateMatch[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const record = row as Record<string, unknown>;
      const questionId = typeof record.question_id === "string" ? record.question_id : "";
      const similarity = Number(record.similarity);

      return questionId && Number.isFinite(similarity)
        ? {
            questionId,
            similarity: Math.round(similarity * 1000) / 1000,
            stem: typeof record.stem === "string" ? record.stem : "",
            status: typeof record.status === "string" ? record.status : "unknown"
          }
        : null;
    })
    .filter((match): match is DuplicateMatch => Boolean(match));
}
