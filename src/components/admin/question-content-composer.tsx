"use client";

import { useMemo, useState } from "react";
import {
  buildComposerContent,
  COMPOSER_MAX_OPTIONS,
  composerValueFromContent,
  emptyComposerValue,
  isComposerType,
  isSingleAnswerType,
  OPTION_LABELS,
  validateComposerValue,
  type ComposerValue
} from "@/lib/question-bank/question-content-form";
import { defaultQuestionContent } from "@/lib/question-bank/admin-question-schema";

type EditorMode = "form" | "json";

type QuestionContentComposerProps = {
  type: string;
  initialContent?: unknown;
};

/**
 * Structured editor for question version content. Renders the composed JSON
 * into the `content` form field, so the server actions keep their existing
 * contract. Content the form cannot represent falls back to the JSON editor.
 */
export function QuestionContentComposer({ type, initialContent }: QuestionContentComposerProps) {
  const initial = useMemo(() => {
    if (initialContent === undefined || initialContent === null) {
      return {
        mode: "form" as EditorMode,
        value: emptyComposerValue(),
        raw: defaultQuestionContent(),
        reason: ""
      };
    }

    const raw = JSON.stringify(initialContent, null, 2);
    const mapped = composerValueFromContent(initialContent, type);

    return mapped.ok
      ? { mode: "form" as EditorMode, value: mapped.value, raw, reason: "" }
      : { mode: "json" as EditorMode, value: emptyComposerValue(), raw, reason: mapped.reason };
    // Initial content is only read on mount; afterwards the composer owns state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [mode, setMode] = useState<EditorMode>(initial.mode);
  const [value, setValue] = useState<ComposerValue>(initial.value);
  const [raw, setRaw] = useState(initial.raw);
  const [switchNotice, setSwitchNotice] = useState(initial.reason);

  const typeSupportsForm = isComposerType(type);
  const effectiveMode: EditorMode = typeSupportsForm ? mode : "json";
  const singleAnswer = isSingleAnswerType(type);
  const composedContent = buildComposerContent(value, type);
  const hint = validateComposerValue(value, type);

  function switchToJson() {
    setRaw(JSON.stringify(composedContent, null, 2));
    setMode("json");
    setSwitchNotice("");
  }

  function switchToForm() {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      setSwitchNotice("The JSON is invalid, so it cannot be opened in the simple form.");
      return;
    }

    const mapped = composerValueFromContent(parsed, type);

    if (!mapped.ok) {
      setSwitchNotice(mapped.reason);
      return;
    }

    setValue(mapped.value);
    setMode("form");
    setSwitchNotice("");
  }

  function setOption(index: number, nextText: string) {
    setValue((current) => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? nextText : option))
    }));
  }

  function addOption() {
    setValue((current) =>
      current.options.length >= COMPOSER_MAX_OPTIONS
        ? current
        : { ...current, options: [...current.options, ""] }
    );
  }

  function removeOption(index: number) {
    setValue((current) => ({
      ...current,
      options: current.options.filter((_, i) => i !== index),
      correctOptions: current.correctOptions
        .filter((correct) => correct !== index)
        .map((correct) => (correct > index ? correct - 1 : correct))
    }));
  }

  function toggleCorrect(index: number) {
    setValue((current) => {
      if (singleAnswer) {
        return { ...current, correctOptions: [index] };
      }

      const isTicked = current.correctOptions.includes(index);

      return {
        ...current,
        correctOptions: isTicked
          ? current.correctOptions.filter((correct) => correct !== index)
          : [...current.correctOptions, index]
      };
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold">Question content</span>
        {typeSupportsForm ? (
          <button
            className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground"
            type="button"
            onClick={effectiveMode === "form" ? switchToJson : switchToForm}
          >
            {effectiveMode === "form" ? "Edit as JSON (advanced)" : "Back to simple form"}
          </button>
        ) : null}
      </div>

      {switchNotice ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {switchNotice}
        </p>
      ) : null}

      {effectiveMode === "form" ? (
        <div className="grid gap-4 rounded-xl border border-border bg-background p-4">
          <input name="content" type="hidden" value={JSON.stringify(composedContent)} />

          <label className="grid gap-2 text-sm font-medium">
            Question text
            <textarea
              className="min-h-24 rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
              placeholder="Type the full question here."
              value={value.text}
              onChange={(event) =>
                setValue((current) => ({ ...current, text: event.target.value }))
              }
            />
          </label>

          {type === "integer" ? (
            <label className="grid gap-2 text-sm font-medium">
              Correct numeric answer
              <input
                className="h-11 max-w-56 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                inputMode="numeric"
                placeholder="e.g. 42"
                value={value.correctInteger}
                onChange={(event) =>
                  setValue((current) => ({ ...current, correctInteger: event.target.value }))
                }
              />
            </label>
          ) : (
            <div className="grid gap-2">
              <p className="text-sm font-medium">
                Options{" "}
                <span className="font-normal text-muted-foreground">
                  ({singleAnswer ? "tick the one correct option" : "tick every correct option"})
                </span>
              </p>
              <div className="grid gap-2">
                {value.options.map((option, index) => (
                  <div className="flex items-center gap-2" key={index}>
                    <input
                      aria-label={`Option ${OPTION_LABELS[index] ?? index + 1} is correct`}
                      checked={value.correctOptions.includes(index)}
                      className="h-4 w-4 shrink-0 rounded border-border"
                      type={singleAnswer ? "radio" : "checkbox"}
                      onChange={() => toggleCorrect(index)}
                    />
                    <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground">
                      {OPTION_LABELS[index] ?? index + 1}
                    </span>
                    <input
                      className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                      placeholder={`Option ${OPTION_LABELS[index] ?? index + 1}`}
                      value={option}
                      onChange={(event) => setOption(index, event.target.value)}
                    />
                    <button
                      aria-label={`Remove option ${OPTION_LABELS[index] ?? index + 1}`}
                      className="h-10 shrink-0 rounded-md border border-border px-3 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={value.options.length <= 2}
                      type="button"
                      onClick={() => removeOption(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="h-9 w-fit rounded-md border border-border px-3 text-sm font-semibold text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={value.options.length >= COMPOSER_MAX_OPTIONS}
                type="button"
                onClick={addOption}
              >
                Add option
              </button>
            </div>
          )}

          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : (
        <label className="grid gap-2 text-sm font-medium">
          Version content JSON
          <textarea
            className="min-h-[320px] rounded-md border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
            name="content"
            spellCheck={false}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
          />
        </label>
      )}
    </div>
  );
}
