"use client";

import { useState, useTransition } from "react";
import {
  indexQuestionEmbeddingsAction,
  type IndexEmbeddingsResult
} from "@/app/admin/questions/import/actions";

/**
 * Duplicate-detection index (TSP-032). One click embeds a batch of questions
 * that are missing or have stale embeddings; repeat until caught up.
 */
export function EmbeddingIndexCard() {
  const [result, setResult] = useState<IndexEmbeddingsResult | null>(null);
  const [isIndexing, startTransition] = useTransition();

  function handleIndex() {
    startTransition(() => {
      void indexQuestionEmbeddingsAction().then(setResult);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Duplicate-detection index</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            The duplicate check in the wizard compares new rows against indexed questions. Run this
            after adding or editing questions so the whole bank is covered. Each click indexes up to
            40 questions.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition hover:border-primary disabled:opacity-60"
          disabled={isIndexing}
          type="button"
          onClick={handleIndex}
        >
          {isIndexing ? "Indexing..." : "Index questions"}
        </button>
      </div>
      {result ? (
        <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>
      ) : null}
    </div>
  );
}
