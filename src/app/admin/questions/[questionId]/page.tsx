import Link from "next/link";
import { notFound } from "next/navigation";
import {
  QuestionEditor,
  type QuestionEditorInitialValue,
  type QuestionSelectOption
} from "@/components/admin/question-editor";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type AdminQuestionDetail = {
  id: string;
  exam_id: string;
  topic_id: string;
  subtopic_id: string | null;
  type: string;
  difficulty: string;
  source: string;
  source_year: number | null;
  source_reference: string | null;
  is_contested: boolean;
  language: string;
  status: string;
  exposure_policy: string;
  quality_tier: string;
  usage_count: number;
  flag_count: number;
  created_at: string;
  updated_at: string;
  exams?: { name?: string | null; slug?: string | null } | null;
  topic?: { name?: string | null; slug?: string | null } | null;
  current_version?: {
    id?: string;
    version?: number | null;
    content?: unknown;
    explanation?: string | null;
    explanation_detail?: string | null;
    reviewer_notes?: string | null;
  } | null;
};

export default async function AdminQuestionDetailPage({
  params
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  const data = await loadAdminQuestionDetailData(questionId);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <Header />
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          Supabase is not configured yet. Add Supabase URL and anon key before managing questions.
        </div>
      </section>
    );
  }

  if (data.loadError) {
    return (
      <section className="grid gap-6">
        <Header />
        <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
          {data.loadError}
        </div>
      </section>
    );
  }

  if (!data.question) {
    notFound();
  }

  const initialValue = toInitialValue(data.question);

  return (
    <section className="grid gap-8">
      <Header />

      <div className="rounded-xl border border-border bg-card shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              {data.question.exams?.name ?? "Unknown exam"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {getQuestionText(data.question.current_version?.content)}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.question.topic?.name ?? "Unknown topic"} / version{" "}
              {data.question.current_version?.version ?? 0}
            </p>
          </div>
          <Link className="text-sm font-medium text-primary" href="/admin/questions">
            Back to questions
          </Link>
        </div>
        <dl className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-4">
          <Meta label="Status" value={data.question.status} />
          <Meta label="Type" value={data.question.type} />
          <Meta label="Difficulty" value={data.question.difficulty} />
          <Meta label="Flags" value={String(data.question.flag_count)} />
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card p-5">
        <h2 className="text-xl font-semibold">Edit question</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Saving creates a new immutable version and points the question at that version.
        </p>
        <div className="mt-5">
          <QuestionEditor
            mode="edit"
            exams={data.exams}
            initialValue={initialValue}
            topics={data.topics}
          />
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Question Bank</p>
      <h1 className="mt-2 text-3xl font-semibold">Question detail</h1>
    </div>
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

async function loadAdminQuestionDetailData(questionId: string) {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      exams: [],
      topics: [],
      question: null
    };
  }

  const supabase = await createClient();

  const [examsResult, topicsResult, questionResult] = await Promise.all([
    supabase.from("exams").select("id,name,slug").order("name"),
    supabase.from("topics").select("id,name,slug").order("name"),
    supabase
      .from("questions")
      .select(
        "id,exam_id,topic_id,subtopic_id,type,difficulty,source,source_year,source_reference,is_contested,language,status,exposure_policy,quality_tier,usage_count,flag_count,created_at,updated_at,exams(name,slug),topic:topics!questions_topic_id_fkey(name,slug),current_version:question_versions!questions_current_version_fk(id,version,content,explanation,explanation_detail,reviewer_notes)"
      )
      .eq("id", questionId)
      .maybeSingle()
  ]);

  const loadError = examsResult.error?.message ?? topicsResult.error?.message ?? questionResult.error?.message ?? null;

  return {
    configured: true,
    loadError,
    exams: toOptions(examsResult.data),
    topics: toOptions(topicsResult.data),
    question: questionResult.data as AdminQuestionDetail | null
  };
}

function toInitialValue(question: AdminQuestionDetail): QuestionEditorInitialValue {
  return {
    questionId: question.id,
    examId: question.exam_id,
    topicId: question.topic_id,
    subtopicId: question.subtopic_id,
    type: question.type,
    difficulty: question.difficulty,
    source: question.source,
    sourceYear: question.source_year,
    sourceReference: question.source_reference,
    isContested: question.is_contested,
    language: question.language,
    status: question.status,
    exposurePolicy: question.exposure_policy,
    qualityTier: question.quality_tier,
    content: question.current_version?.content,
    explanation: question.current_version?.explanation,
    explanationDetail: question.current_version?.explanation_detail,
    reviewerNotes: question.current_version?.reviewer_notes
  };
}

function getQuestionText(content: unknown) {
  if (!content || typeof content !== "object") {
    return "Untitled question";
  }

  const text = (content as Record<string, unknown>).text;
  return typeof text === "string" && text ? text : "Untitled question";
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
