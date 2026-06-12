"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  QUESTION_DIFFICULTIES,
  QUESTION_EXPOSURE_POLICIES,
  QUESTION_QUALITY_TIERS,
  QUESTION_SOURCES,
  QUESTION_STATUSES
} from "@/lib/db/schema/question";
import type { QuestionSelectOption } from "@/components/admin/question-editor";

export type AdminQuestionFilterValues = {
  difficulty: string;
  examId: string;
  exposurePolicy: string;
  q: string;
  qualityTier: string;
  source: string;
  status: string;
  topicId: string;
};

type AdminQuestionFiltersProps = {
  exams: QuestionSelectOption[];
  filters: AdminQuestionFilterValues;
  topics: QuestionSelectOption[];
  total: number;
};

export function AdminQuestionFilters({
  exams,
  filters,
  topics,
  total
}: AdminQuestionFiltersProps) {
  const searchParams = useSearchParams();
  const hasActiveFilters = [
    "q",
    "examId",
    "topicId",
    "status",
    "difficulty",
    "qualityTier",
    "exposurePolicy",
    "source"
  ].some((key) => Boolean(searchParams.get(key)));

  return (
    <form className="grid gap-4 rounded-xl border border-border bg-card shadow-card p-4" method="GET">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Search and filters</h2>
        <span className="text-sm text-muted-foreground">{total} questions</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium md:col-span-2">
          Search text
          <input
            className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            defaultValue={filters.q}
            name="q"
            placeholder="Question text or stem"
            type="search"
          />
        </label>

        <SelectField label="Exam" name="examId" options={exams} value={filters.examId} />
        <SelectField label="Topic" name="topicId" options={topics} value={filters.topicId} />
        <EnumField label="Status" name="status" options={QUESTION_STATUSES} value={filters.status} />
        <EnumField
          label="Difficulty"
          name="difficulty"
          options={QUESTION_DIFFICULTIES}
          value={filters.difficulty}
        />
        <EnumField label="Source" name="source" options={QUESTION_SOURCES} value={filters.source} />
        <EnumField
          label="Quality"
          name="qualityTier"
          options={QUESTION_QUALITY_TIERS}
          value={filters.qualityTier}
        />
        <EnumField
          label="Exposure"
          name="exposurePolicy"
          options={QUESTION_EXPOSURE_POLICIES}
          value={filters.exposurePolicy}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          type="submit"
        >
          Search
        </button>
        {hasActiveFilters ? (
          <Link className="text-sm font-medium text-primary" href="/admin/questions">
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  options,
  value
}: {
  label: string;
  name: string;
  options: QuestionSelectOption[];
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        defaultValue={value}
        name={name}
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
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
        className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        defaultValue={value}
        name={name}
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
