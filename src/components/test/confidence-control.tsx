"use client";

import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/test-session/answer-shape";

type ConfidenceControlProps = {
  disabled?: boolean;
  onChange: (value: Confidence | null) => void;
  value: Confidence | null;
};

const options: { label: string; value: Confidence }[] = [
  { label: "Sure", value: "sure" },
  { label: "Unsure", value: "unsure" },
  { label: "Guessed", value: "guessed" }
];

export function ConfidenceControl({ disabled, onChange, value }: ConfidenceControlProps) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Confidence</p>
      <div className="inline-flex w-fit flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              className={cn(
                "h-9 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
              )}
              disabled={disabled}
              key={option.value}
              onClick={() => onChange(active ? null : option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
