"use client";

import { useActionState, useState } from "react";
import {
  createQuestionAction,
  retireQuestionAction,
  setExposurePolicyAction,
  setQualityTierAction,
  updateQuestionAction
} from "@/app/admin/questions/actions";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_EXPOSURE_POLICIES,
  QUESTION_QUALITY_TIERS,
  QUESTION_SOURCES,
  QUESTION_STATUSES,
  QUESTION_TYPES
} from "@/lib/db/schema/question";
import {
  defaultQuestionContent,
  initialAdminQuestionActionState
} from "@/lib/question-bank/admin-question-schema";

export type QuestionSelectOption = {
  id: string;
  label: string;
};

export type QuestionEditorInitialValue = {
  questionId?: string;
  examId?: string;
  topicId?: string;
  subtopicId?: string | null;
  type?: string;
  difficulty?: string;
  source?: string;
  sourceYear?: number | null;
  sourceReference?: string | null;
  isContested?: boolean;
  language?: string;
  status?: string;
  exposurePolicy?: string;
  qualityTier?: string;
  content?: unknown;
  explanation?: string | null;
  explanationDetail?: string | null;
  reviewerNotes?: string | null;
};

type QuestionEditorProps = {
  mode: "create" | "edit";
  exams: QuestionSelectOption[];
  topics: QuestionSelectOption[];
  initialValue?: QuestionEditorInitialValue;
};

export function QuestionEditor({ mode, exams, topics, initialValue }: QuestionEditorProps) {
  const action = mode === "create" ? createQuestionAction : updateQuestionAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialAdminQuestionActionState
  );
  const [retireState, retireAction, isRetiring] = useActionState(
    retireQuestionAction,
    initialAdminQuestionActionState
  );
  const [qualityState, qualityAction, isSavingQuality] = useActionState(
    setQualityTierAction,
    initialAdminQuestionActionState
  );
  const [exposureState, exposureAction, isSavingExposure] = useActionState(
    setExposurePolicyAction,
    initialAdminQuestionActionState
  );
  const [qualityTier, setQualityTier] = useState(initialValue?.qualityTier ?? "bronze");
  const [exposurePolicy, setExposurePolicy] = useState(initialValue?.exposurePolicy ?? "practice");
  const questionId = initialValue?.questionId ?? "";

  const content = initialValue?.content
    ? JSON.stringify(initialValue.content, null, 2)
    : defaultQuestionContent();

  return (
    <div className="grid gap-5">
      <form action={formAction} className="grid gap-5">
        <input name="questionId" type="hidden" value={initialValue?.questionId ?? ""} />

        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Exam"
            name="examId"
            options={exams}
            required
            value={initialValue?.examId}
          />
          <SelectField
            label="Topic"
            name="topicId"
            options={topics}
            required
            value={initialValue?.topicId}
          />
          <SelectField
            label="Subtopic"
            name="subtopicId"
            options={topics}
            value={initialValue?.subtopicId ?? undefined}
          />
          <EnumField
            label="Question type"
            name="type"
            options={QUESTION_TYPES}
            value={initialValue?.type ?? "mcq"}
          />
          <EnumField
            label="Difficulty"
            name="difficulty"
            options={QUESTION_DIFFICULTIES}
            value={initialValue?.difficulty ?? "medium"}
          />
          <EnumField
            label="Source"
            name="source"
            options={QUESTION_SOURCES}
            value={initialValue?.source ?? "manual"}
          />
          {mode === "create" ? (
            <EnumField
              label="Status"
              name="status"
              options={QUESTION_STATUSES}
              value={initialValue?.status ?? "draft"}
            />
          ) : (
            <input name="status" type="hidden" value={initialValue?.status ?? "draft"} />
          )}
          {mode === "create" ? (
            <EnumField
              label="Exposure policy"
              name="exposurePolicy"
              options={QUESTION_EXPOSURE_POLICIES}
              value={exposurePolicy}
            />
          ) : (
            <input name="exposurePolicy" type="hidden" value={exposurePolicy} />
          )}
          {mode === "create" ? (
            <EnumField
              label="Quality tier"
              name="qualityTier"
              options={QUESTION_QUALITY_TIERS}
              value={qualityTier}
            />
          ) : (
            <input name="qualityTier" type="hidden" value={qualityTier} />
          )}
          <TextField label="Language" name="language" value={initialValue?.language ?? "en"} />
          <TextField
            label="Source year"
            name="sourceYear"
            type="number"
            value={initialValue?.sourceYear?.toString() ?? ""}
          />
          <TextField
            label="Source reference"
            name="sourceReference"
            value={initialValue?.sourceReference ?? ""}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            className="h-4 w-4 rounded border-border"
            defaultChecked={initialValue?.isContested ?? false}
            name="isContested"
            type="checkbox"
          />
          Contested source/key
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Version content JSON
          <textarea
            className="min-h-[320px] rounded-md border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
            defaultValue={content}
            name="content"
            spellCheck={false}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Explanation
          <textarea
            className="min-h-24 rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            defaultValue={initialValue?.explanation ?? ""}
            name="explanation"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Explanation detail
          <textarea
            className="min-h-28 rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            defaultValue={initialValue?.explanationDetail ?? ""}
            name="explanationDetail"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Reviewer notes
          <textarea
            className="min-h-20 rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            defaultValue={initialValue?.reviewerNotes ?? ""}
            name="reviewerNotes"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving..." : mode === "create" ? "Create question" : "Save new version"}
          </button>
          {state.message ? <ActionMessage ok={state.ok} text={state.message} /> : null}
        </div>
      </form>

      {mode === "edit" && questionId ? (
        <div className="grid gap-5 border-t border-border pt-5 md:grid-cols-2">
          <form action={qualityAction} className="grid gap-3">
            <input name="questionId" type="hidden" value={questionId} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold">Quality tier</span>
              <QualityTierBadge tier={qualityTier} />
            </div>
            <ControlledEnumField
              label="Tier"
              name="tier"
              onChange={setQualityTier}
              options={QUESTION_QUALITY_TIERS}
              value={qualityTier}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingQuality}
                type="submit"
              >
                {isSavingQuality ? "Saving..." : "Save tier"}
              </button>
              {qualityState.message ? (
                <ActionMessage ok={qualityState.ok} text={qualityState.message} />
              ) : null}
            </div>
          </form>

          <form action={exposureAction} className="grid gap-3">
            <input name="questionId" type="hidden" value={questionId} />
            <ControlledEnumField
              label="Exposure policy"
              name="policy"
              onChange={setExposurePolicy}
              options={QUESTION_EXPOSURE_POLICIES}
              value={exposurePolicy}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingExposure}
                type="submit"
              >
                {isSavingExposure ? "Saving..." : "Save policy"}
              </button>
              {exposureState.message ? (
                <ActionMessage ok={exposureState.ok} text={exposureState.message} />
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {mode === "edit" && questionId ? (
        <form action={retireAction} className="border-t border-border pt-5">
          <input name="questionId" type="hidden" value={questionId} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRetiring || initialValue.status === "retired"}
              type="submit"
            >
              {isRetiring ? "Retiring..." : "Retire question"}
            </button>
            {retireState.message ? (
              <ActionMessage ok={retireState.ok} text={retireState.message} />
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

function QualityTierBadge({ tier }: { tier: string }) {
  const className =
    {
      bronze: "bg-orange-500/10 text-orange-700 ring-orange-500/30",
      gold: "bg-yellow-500/10 text-yellow-700 ring-yellow-500/30",
      quarantine: "bg-red-500/10 text-red-700 ring-red-500/30",
      silver: "bg-slate-500/10 text-slate-700 ring-slate-500/30"
    }[tier] ?? "bg-muted text-muted-foreground ring-border";

  return (
    <span className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${className}`}>
      {tier.replaceAll("_", " ")}
    </span>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
  value
}: {
  label: string;
  name: string;
  options: QuestionSelectOption[];
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        defaultValue={value ?? ""}
        name={name}
        required={required}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ControlledEnumField<T extends readonly string[]>({
  label,
  name,
  onChange,
  options,
  value
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: T;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function EnumField<T extends readonly string[]>({
  label,
  name,
  options,
  value
}: {
  label: string;
  name: string;
  options: T;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        defaultValue={value}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  name,
  type = "text",
  value
}: {
  label: string;
  name: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        defaultValue={value}
        name={name}
        type={type}
      />
    </label>
  );
}

function ActionMessage({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        ok ? "border-primary/30 bg-primary/10 text-foreground" : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {text}
    </p>
  );
}
