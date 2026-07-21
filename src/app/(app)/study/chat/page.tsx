import { redirect } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { loadChatHistory, type ChatDisplayMessage } from "@/lib/chat/chat-read";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Study Chat"
};

type SearchParams = {
  examId?: string | string[];
  sessionId?: string | string[];
  topicId?: string | string[];
  topic?: string | string[];
};

type Exam = {
  id: string;
  name: string;
};

type Topic = {
  id: string;
  name: string;
  examId: string;
};

type ChatPageData =
  | { configured: false }
  | {
      configured: true;
      exams: Exam[];
      topics: Topic[];
      initialExamId: string | null;
      initialTopicId: string | null;
      initialMessages: ChatDisplayMessage[];
      initialSessionId: string | null;
      topicHint: string | null;
    };

export default async function StudyChatPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const data = await loadChatPageData(params);

  if (!data.configured) {
    return (
      <section className="grid gap-6">
        <PageHeader />
        <Notice message="Supabase is not configured. Add environment variables to enable the study chat." />
      </section>
    );
  }

  return (
    <ChatView
      exams={data.exams}
      topics={data.topics}
      initialExamId={data.initialExamId}
      initialTopicId={data.initialTopicId}
      initialMessages={data.initialMessages}
      initialSessionId={data.initialSessionId}
      topicHint={data.topicHint}
    />
  );
}

async function loadChatPageData(params: SearchParams): Promise<ChatPageData> {
  if (!hasSupabaseConfig()) {
    return { configured: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?redirectTo=${encodeURIComponent(buildRedirectTarget(params))}`);
  }

  const examId = firstParam(params.examId);
  const sessionId = firstParam(params.sessionId);
  const topicId = firstParam(params.topicId);
  const topic = firstParam(params.topic);
  const [{ data: examRows }, { data: topicRows }] = await Promise.all([
    supabase.from("exams").select("id,name").eq("is_active", true).order("name"),
    supabase.from("topics").select("id,name,exam_id").order("name")
  ]);

  const exams = toExams(examRows);
  const topics = toTopics(topicRows);
  const initialMessages = sessionId ? await loadChatHistory(supabase, sessionId) : [];
  const initialExamId = examId && exams.some((exam) => exam.id === examId) ? examId : null;
  const initialTopicId =
    topicId && topics.some((candidate) => candidate.id === topicId && candidate.examId === initialExamId)
      ? topicId
      : null;

  return {
    configured: true,
    exams,
    topics,
    initialExamId,
    initialTopicId,
    initialMessages,
    initialSessionId: sessionId,
    topicHint: topic
  };
}

function firstParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function buildRedirectTarget(params: SearchParams): string {
  const search = new URLSearchParams();
  const examId = firstParam(params.examId);
  const sessionId = firstParam(params.sessionId);
  const topicId = firstParam(params.topicId);
  const topic = firstParam(params.topic);

  if (examId) search.set("examId", examId);
  if (sessionId) search.set("sessionId", sessionId);
  if (topicId) search.set("topicId", topicId);
  if (topic) search.set("topic", topic);

  const query = search.toString();
  return query ? `/study/chat?${query}` : "/study/chat";
}

function toExams(rows: unknown): Exam[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      name: typeof row.name === "string" ? row.name : ""
    }))
    .filter((exam) => exam.id && exam.name);
}

function toTopics(rows: unknown): Topic[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === "object"))
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : "",
      name: typeof row.name === "string" ? row.name : "",
      examId: typeof row.exam_id === "string" ? row.exam_id : ""
    }))
    .filter((topic) => topic.id && topic.name && topic.examId);
}

function PageHeader() {
  return (
    <div>
      <p className="text-sm font-medium text-primary">Study Chat</p>
      <h1 className="mt-2 text-3xl font-semibold">AI Study Companion</h1>
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground shadow-card">
      {message}
    </div>
  );
}
