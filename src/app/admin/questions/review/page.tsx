import Link from "next/link";
import {
  QuestionStatusControls,
  type QuestionStatusCommand
} from "@/components/admin/question-status-controls";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { QuestionStatus } from "@/lib/question-bank/question-lifecycle";

const REVIEW_STATUSES = ["validated", "reviewed", "approved", "flagged"] as const;

type ReviewQuestionRow = {
  id: string;
  status: QuestionStatus;
  type: string;
  difficulty: string;
  source: string;
  quality_tier: string;
  flag_count: number;
  created_at: string;
  exams?: { name?: string | null; slug?: string | null } | null;
  topic?: { name?: string | null; slug?: string | null } | null;
  current_version?: {
    content?: { text?: string } | null;
    reviewer_notes?: string | null;
    version?: number | null;
  } | null;
};

type StatusEventRow = {
  id: string;
  question_id: string;
  from_status: string;
  to_status: string;
  note: string | null;
  created_at: string;
};

export default async function AdminQuestionReviewPage() {
  const data = await loadReviewData();

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Question Bank</p>
          <h1 className="mt-2 text-3xl font-semibold">Review queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review validated, approved, and flagged questions before they enter or return to the
            live test pool.
          </p>
        </div>
        <Link
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-primary"
          href="/admin/questions"
        >
          All questions
        </Link>
      </div>

      {!data.configured ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          Supabase is not configured yet. Add Supabase URL and anon key before reviewing questions.
        </div>
      ) : null}

      {data.configured && data.loadError ? (
        <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
          {data.loadError}
        </div>
      ) : null}

      {data.configured && !data.loadError ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.questions.length} loaded</span>
            {REVIEW_STATUSES.map((status) => (
              <span className="rounded-full bg-muted px-3 py-1" key={status}>
                {status.replaceAll("_", " ")}: {countByStatus(data.questions, status)}
              </span>
            ))}
          </div>

          {data.questions.length ? (
            <div className="grid gap-4">
              {data.questions.map((question) => (
                <ReviewQuestionCard
                  events={data.eventsByQuestion.get(question.id) ?? []}
                  key={question.id}
                  question={question}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              No questions are waiting for review.
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ReviewQuestionCard({
  events,
  question
}: {
  events: StatusEventRow[];
  question: ReviewQuestionRow;
}) {
  const text = question.current_version?.content?.text ?? "Untitled question";
  const commands = getReviewCommands(question.status);

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {question.exams?.name ?? "Unknown exam"} / {question.topic?.name ?? "Unknown topic"}
              </p>
              <h2 className="mt-2 text-base font-semibold leading-6">{text}</h2>
            </div>
            <StatusPill status={question.status} />
          </div>

          <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-5">
            <Meta label="Type" value={question.type} />
            <Meta label="Difficulty" value={question.difficulty} />
            <Meta label="Source" value={question.source} />
            <Meta label="Quality" value={question.quality_tier} />
            <Meta label="Flags" value={String(question.flag_count)} />
          </dl>

          {question.current_version?.reviewer_notes ? (
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm leading-6 text-muted-foreground">
              {question.current_version.reviewer_notes}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="text-sm font-medium text-primary" href={`/admin/questions/${question.id}`}>
              Edit question
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <QuestionStatusControls commands={commands} questionId={question.id} />
          <StatusHistory events={events} />
        </div>
      </div>
    </article>
  );
}

function StatusHistory({ events }: { events: StatusEventRow[] }) {
  return (
    <div className="rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold">Status history</h3>
      {events.length ? (
        <ol className="mt-3 grid gap-3 text-xs text-muted-foreground">
          {events.slice(0, 4).map((event) => (
            <li key={event.id}>
              <p className="font-medium text-foreground">
                {event.from_status.replaceAll("_", " ")} -> {event.to_status.replaceAll("_", " ")}
              </p>
              <p className="mt-1">{formatDate(event.created_at)}</p>
              {event.note ? <p className="mt-1">{event.note}</p> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">No status events recorded yet.</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: QuestionStatus }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
      {status.replaceAll("_", " ")}
    </span>
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

async function loadReviewData() {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      questions: [],
      eventsByQuestion: new Map<string, StatusEventRow[]>()
    };
  }

  const supabase = await createClient();
  const questionsResult = await supabase
    .from("questions")
    .select(
      "id,status,type,difficulty,source,quality_tier,flag_count,created_at,exams(name,slug),topic:topics!questions_topic_id_fkey(name,slug),current_version:question_versions!questions_current_version_fk(version,content,reviewer_notes)"
    )
    .in("status", Array.from(REVIEW_STATUSES))
    .order("created_at", { ascending: false })
    .limit(50);

  if (questionsResult.error) {
    return {
      configured: true,
      loadError: questionsResult.error.message,
      questions: [],
      eventsByQuestion: new Map<string, StatusEventRow[]>()
    };
  }

  const questions = (questionsResult.data ?? []) as ReviewQuestionRow[];
  const questionIds = questions.map((question) => question.id);
  const eventsByQuestion = new Map<string, StatusEventRow[]>();

  if (questionIds.length) {
    const eventsResult = await supabase
      .from("question_status_events")
      .select("id,question_id,from_status,to_status,note,created_at")
      .in("question_id", questionIds)
      .order("created_at", { ascending: false });

    if (eventsResult.error) {
      return {
        configured: true,
        loadError: eventsResult.error.message,
        questions: [],
        eventsByQuestion
      };
    }

    for (const event of (eventsResult.data ?? []) as StatusEventRow[]) {
      const existing = eventsByQuestion.get(event.question_id) ?? [];
      existing.push(event);
      eventsByQuestion.set(event.question_id, existing);
    }
  }

  return {
    configured: true,
    loadError: null,
    questions,
    eventsByQuestion
  };
}

function getReviewCommands(status: QuestionStatus): QuestionStatusCommand[] {
  if (status === "flagged") {
    return [
      { label: "Restore live", note: "Restored from flagged review.", tone: "primary", toStatus: "live" },
      { label: "Send to draft", note: "Rejected from flagged review.", toStatus: "draft" },
      { label: "Retire", note: "Retired from flagged review.", tone: "danger", toStatus: "retired" }
    ];
  }

  if (status === "approved") {
    return [
      { label: "Publish", note: "Published from approved review.", tone: "primary", toStatus: "live" },
      { label: "Send to draft", note: "Returned to draft from approved review.", toStatus: "draft" },
      { label: "Retire", note: "Retired from approved review.", tone: "danger", toStatus: "retired" }
    ];
  }

  return [
    { label: "Approve", note: "Approved from review queue.", tone: "primary", toStatus: "approved" },
    { label: "Publish", note: "Published directly from review queue.", toStatus: "live" },
    { label: "Reject", note: "Rejected to draft from review queue.", toStatus: "draft" },
    { label: "Retire", note: "Retired from review queue.", tone: "danger", toStatus: "retired" }
  ];
}

function countByStatus(questions: ReviewQuestionRow[], status: QuestionStatus) {
  return questions.filter((question) => question.status === status).length;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
