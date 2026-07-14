import Link from "next/link";
import {
  AdminQuestionFilters,
  type AdminQuestionFilterValues
} from "@/components/admin/admin-question-filters";
import { QuestionEditor, type QuestionSelectOption } from "@/components/admin/question-editor";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

type AdminQuestionRow = {
  id: string;
  type: string;
  difficulty: string;
  source: string;
  status: string;
  quality_tier: string;
  exposure_policy?: string;
  language: string;
  created_at: string;
  question_text?: string;
  exams?: { name?: string | null; slug?: string | null } | null;
  topic?: { name?: string | null; slug?: string | null } | null;
  current_version?: { content?: { text?: string } | null; version?: number | null } | null;
};

type AdminQuestionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AdminQuestionSearchResult = {
  questions?: unknown[];
  total?: number | string;
};

export default async function AdminQuestionsPage({ searchParams }: AdminQuestionsPageProps) {
  const filters = parseFilters(searchParams ? await searchParams : {});
  const data = await loadAdminQuestionPageData(filters);

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-medium text-primary">Question Bank</p>
        <h1 className="mt-2 text-3xl font-semibold">Admin question CRUD</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Create individual questions, keep answer-bearing content in version history, and retire
          questions without deleting operational history.
        </p>
      </div>

      {!data.configured ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          Supabase is not configured yet. Add Supabase URL and anon key before managing questions.
        </div>
      ) : null}

      {data.configured && data.loadError ? (
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          {data.loadError}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Questions</h2>
            <div className="flex items-center gap-3">
              <Link
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
                href="/admin/questions/review"
              >
                Review queue
              </Link>
              <Link
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
                href="/admin/questions/import"
              >
                Bulk import
              </Link>
              <Link
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
                href="/admin/questions/backfill"
              >
                AI explanations
              </Link>
              <span className="text-sm text-muted-foreground">
                {data.total} question{data.total === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <AdminQuestionFilters
            exams={data.exams}
            filters={filters}
            topics={data.topics}
            total={data.total}
          />

          {data.questions.length ? (
            <div className="grid gap-3">
              {data.questions.map((question) => (
                <QuestionListItem key={question.id} question={question} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
              No questions found.
            </div>
          )}

          <PaginationControls filters={filters} page={filters.page} total={data.total} />
        </div>

        <aside className="rounded-xl border border-border bg-card shadow-card p-5">
          <h2 className="text-xl font-semibold">Create question</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Saving creates the question metadata and version 1 content together.
          </p>
          <div className="mt-5">
            <QuestionEditor mode="create" exams={data.exams} topics={data.topics} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function QuestionListItem({ question }: { question: AdminQuestionRow }) {
  const text = question.question_text ?? question.current_version?.content?.text ?? "Untitled question";

  return (
    <article className="rounded-xl border border-border bg-card shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{text}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {question.exams?.name ?? "Unknown exam"} / {question.topic?.name ?? "Unknown topic"}
          </p>
        </div>
        <Link
          className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
          href={`/admin/questions/${question.id}`}
        >
          View/edit
        </Link>
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <Meta label="Status" value={question.status} />
        <Meta label="Type" value={question.type} />
        <Meta label="Difficulty" value={question.difficulty} />
        <Meta label="Source" value={question.source} />
        <Meta label="Quality" value={question.quality_tier} />
        <Meta label="Exposure" value={question.exposure_policy ?? "practice"} />
        <Meta label="Version" value={String(question.current_version?.version ?? 0)} />
      </dl>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value.replaceAll("_", " ")}</dd>
    </div>
  );
}

function PaginationControls({
  filters,
  page,
  total
}: {
  filters: AdminQuestionFilterValues & { page: number };
  page: number;
  total: number;
}) {
  const hasPrevious = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  if (!hasPrevious && !hasNext) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card shadow-card p-4 text-sm">
      <span className="text-muted-foreground">
        Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
      </span>
      <div className="flex items-center gap-3">
        {hasPrevious ? (
          <Link
            className="rounded-md border border-border px-3 py-2 font-medium text-primary"
            href={buildPageHref(filters, page - 1)}
          >
            Previous
          </Link>
        ) : null}
        {hasNext ? (
          <Link
            className="rounded-md border border-border px-3 py-2 font-medium text-primary"
            href={buildPageHref(filters, page + 1)}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

async function loadAdminQuestionPageData(filters: AdminQuestionFilterValues & { page: number }) {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      exams: [],
      topics: [],
      questions: [],
      total: 0
    };
  }

  const supabase = await createClient();
  const offset = (filters.page - 1) * PAGE_SIZE;
  const hasActiveFilters = hasFilters(filters);

  const [examsResult, topicsResult, questionsResult] = await Promise.all([
    supabase.from("exams").select("id,name,slug").order("name"),
    supabase.from("topics").select("id,name,slug").order("name"),
    hasActiveFilters
      ? supabase.rpc("search_admin_questions", {
          p_query: nullableFilter(filters.q),
          p_exam_id: nullableFilter(filters.examId),
          p_topic_id: nullableFilter(filters.topicId),
          p_status: nullableFilter(filters.status),
          p_difficulty: nullableFilter(filters.difficulty),
          p_quality_tier: nullableFilter(filters.qualityTier),
          p_exposure_policy: nullableFilter(filters.exposurePolicy),
          p_source: nullableFilter(filters.source),
          p_limit: PAGE_SIZE,
          p_offset: offset
        })
      : supabase
          .from("questions")
          .select(
            "id,type,difficulty,source,status,quality_tier,exposure_policy,language,created_at,exams(name,slug),topic:topics!questions_topic_id_fkey(name,slug),current_version:question_versions!questions_current_version_fk(version,content)",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)
  ]);

  const loadError = examsResult.error?.message ?? topicsResult.error?.message ?? questionsResult.error?.message ?? null;
  const searchResult = hasActiveFilters ? toSearchResult(questionsResult.data) : null;

  return {
    configured: true,
    loadError,
    exams: toOptions(examsResult.data),
    topics: toOptions(topicsResult.data),
    questions: loadError
      ? []
      : hasActiveFilters
        ? ((searchResult?.questions ?? []) as AdminQuestionRow[])
        : ((questionsResult.data ?? []) as AdminQuestionRow[]),
    total: loadError
      ? 0
      : hasActiveFilters
        ? (searchResult?.total ?? 0)
        : (questionsResult.count ?? (questionsResult.data?.length ?? 0))
  };
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>
): AdminQuestionFilterValues & { page: number } {
  const page = Math.max(1, numberParam(searchParams.page, 1));

  return {
    difficulty: stringParam(searchParams.difficulty),
    examId: stringParam(searchParams.examId),
    exposurePolicy: stringParam(searchParams.exposurePolicy),
    page,
    q: stringParam(searchParams.q),
    qualityTier: stringParam(searchParams.qualityTier),
    source: stringParam(searchParams.source),
    status: stringParam(searchParams.status),
    topicId: stringParam(searchParams.topicId)
  };
}

function stringParam(value: string | string[] | undefined) {
  const current = Array.isArray(value) ? value[0] : value;
  return typeof current === "string" ? current.trim() : "";
}

function numberParam(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(stringParam(value));
  return Number.isInteger(parsed) ? parsed : fallback;
}

function hasFilters(filters: AdminQuestionFilterValues) {
  return Boolean(
    filters.q ||
      filters.examId ||
      filters.topicId ||
      filters.status ||
      filters.difficulty ||
      filters.qualityTier ||
      filters.exposurePolicy ||
      filters.source
  );
}

function nullableFilter(value: string) {
  return value ? value : null;
}

function toSearchResult(value: unknown): { questions: unknown[]; total: number } {
  const record = value && typeof value === "object" ? (value as AdminQuestionSearchResult) : {};
  const total = typeof record.total === "number" ? record.total : Number(record.total ?? 0);

  return {
    questions: Array.isArray(record.questions) ? record.questions : [],
    total: Number.isFinite(total) ? total : 0
  };
}

function buildPageHref(filters: AdminQuestionFilterValues, page: number) {
  const params = new URLSearchParams();

  appendParam(params, "q", filters.q);
  appendParam(params, "examId", filters.examId);
  appendParam(params, "topicId", filters.topicId);
  appendParam(params, "status", filters.status);
  appendParam(params, "difficulty", filters.difficulty);
  appendParam(params, "qualityTier", filters.qualityTier);
  appendParam(params, "exposurePolicy", filters.exposurePolicy);
  appendParam(params, "source", filters.source);

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/admin/questions?${query}` : "/admin/questions";
}

function appendParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  }
}

function toOptions(rows: unknown): QuestionSelectOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const name = typeof record.name === "string" ? record.name : "Untitled";
      const slug = typeof record.slug === "string" ? record.slug : "";

      return id
        ? {
            id,
            label: slug ? `${name} (${slug})` : name
          }
        : null;
    })
    .filter((option): option is QuestionSelectOption => Boolean(option));
}
