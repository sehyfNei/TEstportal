"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  makeIntegerAnswer,
  makeMcqAnswer,
  normalizeSelectedAnswer,
  toggleMsqAnswer,
  type SelectedAnswer
} from "@/lib/test-session/answer-shape";

type PromptSnapshot = {
  type: string;
  text?: string;
  stem?: string;
  images?: string[];
  options?: string[];
  statements?: string[];
  assertion?: string;
  reason?: string;
  left?: string[];
  right?: string[];
  leftColumn?: string[];
  rightColumn?: string[];
  prompts?: string[];
  choices?: string[];
};

type QuestionRendererProps = {
  disabled?: boolean;
  onChange: (answer: SelectedAnswer) => void;
  promptSnapshot: unknown;
  value: SelectedAnswer;
  variant?: "classic" | "beta";
};

export function QuestionRenderer({
  disabled,
  onChange,
  promptSnapshot,
  value,
  variant = "classic"
}: QuestionRendererProps) {
  const prompt = toPromptSnapshot(promptSnapshot);
  const type = prompt.type;

  return (
    <div className={cn("grid gap-6", variant === "beta" && "text-slate-950")}>
      <QuestionPrompt prompt={prompt} />

      {type === "mcq" ? (
        <McqOptions disabled={disabled} onChange={onChange} options={prompt.options ?? []} value={value} variant={variant} />
      ) : null}

      {type === "msq" ? (
        <MsqOptions disabled={disabled} onChange={onChange} options={prompt.options ?? []} value={value} variant={variant} />
      ) : null}

      {type === "integer" ? <IntegerAnswer disabled={disabled} onChange={onChange} value={value} variant={variant} /> : null}

      {type === "statement" || type === "assertion" || type === "match" ? (
        <DeferredAnswerEntry type={type} />
      ) : null}

      {!["mcq", "msq", "integer", "statement", "assertion", "match"].includes(type) ? (
        <DeferredAnswerEntry type={type} />
      ) : null}
    </div>
  );
}

function QuestionPrompt({ prompt }: { prompt: PromptSnapshot }) {
  const title = prompt.text ?? prompt.stem ?? "Untitled question";
  const leftItems = prompt.left ?? prompt.leftColumn ?? prompt.prompts ?? [];
  const rightItems = prompt.right ?? prompt.rightColumn ?? prompt.choices ?? [];

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">{prompt.type.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-xl font-semibold leading-8">{title}</h1>
      </div>

      {prompt.images?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {prompt.images.map((src, index) => (
            <img
              alt={`Question image ${index + 1}`}
              className="max-h-72 w-full rounded-md border border-border object-contain"
              key={`${src}-${index}`}
              src={src}
            />
          ))}
        </div>
      ) : null}

      {prompt.statements?.length ? (
        <ol className="grid gap-2 text-sm leading-6 text-muted-foreground">
          {prompt.statements.map((statement, index) => (
            <li className="rounded-md border border-border bg-background p-3" key={`${statement}-${index}`}>
              {index + 1}. {statement}
            </li>
          ))}
        </ol>
      ) : null}

      {prompt.assertion || prompt.reason ? (
        <div className="grid gap-3 text-sm leading-6">
          {prompt.assertion ? (
            <p className="rounded-md border border-border bg-background p-3">
              <span className="font-semibold">Assertion:</span> {prompt.assertion}
            </p>
          ) : null}
          {prompt.reason ? (
            <p className="rounded-md border border-border bg-background p-3">
              <span className="font-semibold">Reason:</span> {prompt.reason}
            </p>
          ) : null}
        </div>
      ) : null}

      {leftItems.length || rightItems.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <MatchColumn label="Column A" values={leftItems} />
          <MatchColumn label="Column B" values={rightItems} />
        </div>
      ) : null}
    </div>
  );
}

function McqOptions({
  disabled,
  onChange,
  options,
  value,
  variant
}: {
  disabled?: boolean;
  onChange: (answer: SelectedAnswer) => void;
  options: string[];
  value: SelectedAnswer;
  variant: "classic" | "beta";
}) {
  const groupId = useId();
  const normalized = normalizeSelectedAnswer("mcq", value);
  const selectedIndex = normalized && "options" in normalized ? normalized.options[0] : undefined;

  if (!options.length) {
    return <MissingOptions />;
  }

  return (
    <fieldset className="grid gap-3" disabled={disabled}>
      <legend className="sr-only">Choose one answer</legend>
      {options.map((option, index) => (
        <label
          className={cn(
            "flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm leading-6 transition",
            variant === "beta"
              ? "border-slate-300 bg-white hover:border-emerald-600 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
              : "border-border bg-background hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/10"
          )}
          key={`${option}-${index}`}
        >
          <input
            checked={selectedIndex === index}
            className={cn("mt-1 h-4 w-4", variant === "beta" ? "border-slate-400 text-emerald-600 focus:ring-emerald-600" : "border-border text-primary focus:ring-primary")}
            name={groupId}
            onChange={() => onChange(makeMcqAnswer(index))}
            type="radio"
          />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

function MsqOptions({
  disabled,
  onChange,
  options,
  value,
  variant
}: {
  disabled?: boolean;
  onChange: (answer: SelectedAnswer) => void;
  options: string[];
  value: SelectedAnswer;
  variant: "classic" | "beta";
}) {
  const normalized = normalizeSelectedAnswer("msq", value);
  const selected = normalized && "options" in normalized ? normalized.options : [];

  if (!options.length) {
    return <MissingOptions />;
  }

  return (
    <fieldset className="grid gap-3" disabled={disabled}>
      <legend className="sr-only">Choose all correct answers</legend>
      {options.map((option, index) => (
        <label
          className={cn(
            "flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm leading-6 transition",
            variant === "beta"
              ? "border-slate-300 bg-white hover:border-emerald-600 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
              : "border-border bg-background hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/10"
          )}
          key={`${option}-${index}`}
        >
          <input
            checked={selected.includes(index)}
            className={cn("mt-1 h-4 w-4 rounded", variant === "beta" ? "border-slate-400 text-emerald-600 focus:ring-emerald-600" : "border-border text-primary focus:ring-primary")}
            onChange={() => onChange(toggleMsqAnswer(value, index))}
            type="checkbox"
          />
          <span>{option}</span>
        </label>
      ))}
    </fieldset>
  );
}

function IntegerAnswer({
  disabled,
  onChange,
  value,
  variant
}: {
  disabled?: boolean;
  onChange: (answer: SelectedAnswer) => void;
  value: SelectedAnswer;
  variant: "classic" | "beta";
}) {
  const normalized = normalizeSelectedAnswer("integer", value);
  const displayValue = normalized && "integer" in normalized ? String(normalized.integer) : "";

  return (
    <label className="grid gap-2 text-sm font-medium">
      Answer
      <input
        className={cn(
          "h-12 rounded-md border bg-background px-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-60",
          variant === "beta" ? "border-slate-300 focus:border-emerald-600" : "border-border focus:border-primary"
        )}
        disabled={disabled}
        inputMode="decimal"
        onChange={(event) => onChange(makeIntegerAnswer(event.target.value))}
        placeholder="Enter a number"
        type="number"
        value={displayValue}
      />
    </label>
  );
}

function MatchColumn({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <ol className="mt-3 grid gap-2 text-sm leading-6">
        {values.map((value, index) => (
          <li key={`${value}-${index}`}>
            {index + 1}. {value}
          </li>
        ))}
      </ol>
    </div>
  );
}

function MissingOptions() {
  return (
    <div className="rounded-md border border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
      This question is missing selectable options.
    </div>
  );
}

function DeferredAnswerEntry({ type }: { type: string }) {
  return (
    <div className="rounded-md border border-border bg-muted p-3 text-sm leading-6 text-muted-foreground">
      Answer entry for {type.replaceAll("_", " ")} questions is coming soon.
    </div>
  );
}

function toPromptSnapshot(value: unknown): PromptSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { type: "unknown" };
  }

  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" && record.type ? record.type : "unknown";

  return {
    type,
    text: stringField(record, "text"),
    stem: stringField(record, "stem"),
    images: stringArrayField(record, "images"),
    options: stringArrayField(record, "options"),
    statements: stringArrayField(record, "statements"),
    assertion: stringField(record, "assertion"),
    reason: stringField(record, "reason"),
    left: stringArrayField(record, "left"),
    right: stringArrayField(record, "right"),
    leftColumn: stringArrayField(record, "leftColumn"),
    rightColumn: stringArrayField(record, "rightColumn"),
    prompts: stringArrayField(record, "prompts"),
    choices: stringArrayField(record, "choices")
  };
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function stringArrayField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}
