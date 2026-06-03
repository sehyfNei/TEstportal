"use client";

import { useState, useTransition } from "react";
import { rateExplanationAction } from "@/app/test/actions";
import {
  REPORT_CATEGORY_LABELS,
  VALID_REPORT_CATEGORIES,
  type RatingScope,
  type RatingValue,
  type ReportCategory
} from "@/lib/ai/rating-helpers";
import { cn } from "@/lib/utils";

type ExplanationRatingProps = {
  scope: RatingScope;
  scopeKey: string;
  sessionResultId: string;
};

export function ExplanationRating({ scope, scopeKey, sessionResultId }: ExplanationRatingProps) {
  const [rating, setRating] = useState<RatingValue | null>(null);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(nextRating: RatingValue, nextCategory: ReportCategory | null) {
    const previousRating = rating;
    const previousCategory = category;

    setRating(nextRating);
    setCategory(nextCategory);
    setShowCategories(false);
    setError("");

    startTransition(async () => {
      const result = await rateExplanationAction({
        sessionResultId,
        scope,
        scopeKey,
        rating: nextRating,
        reportCategory: nextCategory
      });

      if (!result.ok) {
        setRating(previousRating);
        setCategory(previousCategory);
        setError(result.message);
      }
    });
  }

  function handleUp() {
    if (isPending || rating === "up") {
      return;
    }

    submit("up", null);
  }

  function handleDown() {
    if (isPending) {
      return;
    }

    setShowCategories((open) => !open);
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Was this helpful?</span>
        <button
          aria-label="Helpful"
          className={cn(
            "rounded-md border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-60",
            rating === "up"
              ? "border-emerald-300 text-emerald-700"
              : "border-border hover:border-primary hover:text-foreground"
          )}
          disabled={isPending}
          onClick={handleUp}
          type="button"
        >
          Helpful
        </button>
        <button
          aria-label="Report a problem"
          className={cn(
            "rounded-md border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-60",
            rating === "down"
              ? "border-amber-300 text-amber-700"
              : "border-border hover:border-primary hover:text-foreground"
          )}
          disabled={isPending}
          onClick={handleDown}
          type="button"
        >
          Report a problem
        </button>
        {rating === "up" ? <span className="text-emerald-700">Thanks for the feedback.</span> : null}
        {rating === "down" && category ? (
          <span className="text-amber-700">Reported: {REPORT_CATEGORY_LABELS[category]}</span>
        ) : null}
      </div>

      {showCategories ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {VALID_REPORT_CATEGORIES.map((value) => (
            <button
              className="rounded-md border border-border px-2 py-1 text-xs transition hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              key={value}
              onClick={() => submit("down", value)}
              type="button"
            >
              {REPORT_CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
