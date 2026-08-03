"use client";

import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/test-session/answer-shape";

type ConfidenceControlProps = {
  disabled?: boolean;
  onChange: (value: Confidence | null) => void;
  value: Confidence | null;
  variant?: "classic" | "beta";
};

const options: { label: string; value: Confidence }[] = [
  { label: "Sure", value: "sure" },
  { label: "Unsure", value: "unsure" },
  { label: "Guessed", value: "guessed" }
];

export function ConfidenceControl({
  disabled,
  onChange,
  value,
  variant = "classic"
}: ConfidenceControlProps) {
  const beta = variant === "beta";

  return (
    <div className="grid gap-2">
      <p className={cn("text-sm font-medium", beta && "text-slate-200")}>How confident are you?</p>
      <div className={cn("flex flex-wrap gap-2", beta ? "grid grid-cols-3" : "w-fit")}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              className={cn(
                "h-9 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                beta && "border-slate-700 text-slate-300 hover:border-emerald-400 hover:text-white",
                active && beta
                  ? "border-emerald-400 bg-emerald-500 text-slate-950"
                  : active
                  ? "border-primary bg-primary text-primary-foreground"
                  : !beta && "border-border text-muted-foreground hover:border-primary hover:text-foreground"
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
