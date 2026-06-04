"use client";

import { useState, useTransition } from "react";
import { flagQuestionAction } from "@/app/test/actions";
import {
  FLAG_REASONS,
  FLAG_REASON_LABELS,
  type FlagReason
} from "@/lib/question-bank/flag-reasons";
import { cn } from "@/lib/utils";

type ReportQuestionProps = {
  questionId: string;
};

export function ReportQuestion({ questionId }: ReportQuestionProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FlagReason | null>(null);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (status === "success") {
      return;
    }
    setOpen((prev) => !prev);
  }

  function handleSelectReason(reason: FlagReason) {
    setSelectedReason(reason);
  }

  function handleSubmit() {
    if (!selectedReason || isPending) {
      return;
    }

    startTransition(async () => {
      const result = await flagQuestionAction({
        questionId,
        reason: selectedReason,
        details: details.trim() || null
      });

      if (result.ok) {
        setStatus("success");
        setMessage(result.message);
        setOpen(false);
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {status === "success" ? (
          <span className="text-amber-700">{message}</span>
        ) : (
          <button
            aria-expanded={open}
            aria-label="Report this question"
            className={cn(
              "rounded-md border px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-60",
              open
                ? "border-amber-300 text-amber-700"
                : "border-border hover:border-primary hover:text-foreground"
            )}
            disabled={isPending}
            onClick={handleToggle}
            type="button"
          >
            Report this question
          </button>
        )}
      </div>

      {open && status !== "success" ? (
        <div className="mt-2 grid gap-2">
          <p className="text-xs text-muted-foreground">Select a reason:</p>
          <div className="flex flex-wrap gap-2">
            {FLAG_REASONS.map((reason) => (
              <button
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-60",
                  selectedReason === reason
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-border hover:border-primary hover:text-foreground"
                )}
                disabled={isPending}
                key={reason}
                onClick={() => handleSelectReason(reason)}
                type="button"
              >
                {FLAG_REASON_LABELS[reason]}
              </button>
            ))}
          </div>

          {selectedReason ? (
            <div className="grid gap-2">
              <textarea
                className="min-h-[60px] w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                maxLength={500}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Optional: add details (max 500 chars)"
                value={details}
              />
              <button
                className="self-start rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={handleSubmit}
                type="button"
              >
                {isPending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          ) : null}

          {status === "error" ? (
            <p className="text-xs text-red-700">{message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
