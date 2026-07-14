"use client";

import { useActionState, useMemo, useState } from "react";
import {
  importManifestAction,
  type ManifestImportActionState
} from "@/app/admin/manifests/actions";
import {
  buildManifestFromForm,
  emptyManifestBuilderValue,
  NEGATIVE_MARKING_CHOICES,
  slugify,
  type ManifestBuilderTopic,
  type ManifestBuilderValue
} from "@/lib/exam/manifest-builder";

const initialImportState: ManifestImportActionState = {
  ok: false,
  message: ""
};

const fieldClass =
  "h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary";

export function ManifestBuilder() {
  const [value, setValue] = useState<ManifestBuilderValue>(emptyManifestBuilderValue);
  const [topics, setTopics] = useState<ManifestBuilderTopic[]>([
    { name: "", weightPercent: "" },
    { name: "", weightPercent: "" }
  ]);
  const [importState, importAction, isImportPending] = useActionState(
    importManifestAction,
    initialImportState
  );

  const build = useMemo(() => buildManifestFromForm(value, topics), [topics, value]);
  const slug = slugify(value.examName);

  function setField<K extends keyof ManifestBuilderValue>(key: K, next: string) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  function setTopic(index: number, key: keyof ManifestBuilderTopic, next: string) {
    setTopics((current) =>
      current.map((topic, i) => (i === index ? { ...topic, [key]: next } : topic))
    );
  }

  return (
    <form action={importAction} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-5 rounded-xl border border-border bg-card shadow-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Exam name
            <input
              className={fieldClass}
              placeholder="e.g. UPSC Prelims General Studies"
              value={value.examName}
              onChange={(event) => setField("examName", event.target.value)}
            />
            {slug ? (
              <span className="text-xs font-normal text-muted-foreground">
                Web address name: {slug} (created automatically)
              </span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Short description (optional)
            <input
              className={fieldClass}
              placeholder="One line students will see about this exam"
              value={value.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Test duration (minutes)
            <input
              className={fieldClass}
              inputMode="numeric"
              value={value.durationMinutes}
              onChange={(event) => setField("durationMinutes", event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Questions in a full test
            <input
              className={fieldClass}
              inputMode="numeric"
              value={value.totalQuestions}
              onChange={(event) => setField("totalQuestions", event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Marks for a correct answer
            <input
              className={fieldClass}
              inputMode="decimal"
              value={value.marksPerCorrect}
              onChange={(event) => setField("marksPerCorrect", event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Wrong answer penalty
            <select
              className={fieldClass}
              value={value.negativeMarkingFraction}
              onChange={(event) => setField("negativeMarkingFraction", event.target.value)}
            >
              {NEGATIVE_MARKING_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">
            Topics{" "}
            <span className="font-normal text-muted-foreground">
              (the subjects questions belong to; weight % is optional)
            </span>
          </p>
          <div className="grid gap-2">
            {topics.map((topic, index) => (
              <div className="flex items-center gap-2" key={index}>
                <input
                  className={`${fieldClass} min-w-0 flex-1`}
                  placeholder={`Topic ${index + 1}, e.g. ${index === 0 ? "Polity" : "History"}`}
                  value={topic.name}
                  onChange={(event) => setTopic(index, "name", event.target.value)}
                />
                <input
                  aria-label={`Weight percent for topic ${index + 1}`}
                  className={`${fieldClass} w-24`}
                  inputMode="decimal"
                  placeholder="Weight %"
                  value={topic.weightPercent}
                  onChange={(event) => setTopic(index, "weightPercent", event.target.value)}
                />
                <button
                  aria-label={`Remove topic ${index + 1}`}
                  className="h-11 shrink-0 rounded-md border border-border px-3 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={topics.length <= 1}
                  type="button"
                  onClick={() => setTopics((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            className="h-9 w-fit rounded-md border border-border px-3 text-sm font-semibold text-primary transition hover:border-primary"
            type="button"
            onClick={() => setTopics((current) => [...current, { name: "", weightPercent: "" }])}
          >
            Add topic
          </button>
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-card shadow-card p-5">
        <h2 className="text-lg font-semibold">Check and create</h2>

        {build.ok ? (
          <div className="mt-4 grid gap-3 text-sm">
            <input name="manifest" type="hidden" value={build.json} />
            <p className="rounded-md border border-border bg-muted px-3 py-2 font-medium text-primary">
              Everything looks good.
            </p>
            <dl className="grid gap-2 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>Exam</dt>
                <dd className="text-right text-foreground">{build.plan.summary.examName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Topics</dt>
                <dd className="text-right text-foreground">{build.plan.summary.topicCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Duration</dt>
                <dd className="text-right text-foreground">
                  {build.plan.summary.durationMinutes} min
                </dd>
              </div>
            </dl>
            <button
              className="mt-2 h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isImportPending}
              type="submit"
            >
              {isImportPending ? "Creating exam..." : "Create exam"}
            </button>
            <p className="text-xs leading-5 text-muted-foreground">
              Creating an exam that already exists updates its topics and marking rules; older
              versions are kept for history.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
            {build.message}
          </p>
        )}

        {importState.message ? (
          <div
            className={`mt-4 rounded-md border px-3 py-2 text-sm leading-6 ${
              importState.ok
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <p className="font-medium">{importState.message}</p>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
