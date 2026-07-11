import {
  ScheduleView,
  type ScheduleExamOption,
  type ScheduleTopicOption,
  type ScheduleViewItem
} from "@/components/schedule/schedule-view";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function SchedulePage() {
  const data = await loadSchedulePageData();

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Schedule</p>
        <h1 className="mt-2 text-3xl font-semibold">Your study schedule</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Plan tests and retests against your target date. Overdue items stay on top until you take them,
          reschedule, or cancel.
        </p>
      </div>

      {!data.configured ? (
        <StatusPanel message="Supabase is not configured yet. Add Supabase URL and anon key before scheduling." />
      ) : null}

      {data.loadError ? <StatusPanel message={data.loadError} /> : null}

      {data.configured && !data.loadError ? (
        <ScheduleView exams={data.exams} items={data.items} topics={data.topics} />
      ) : null}
    </section>
  );
}

function StatusPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 text-sm leading-6 text-muted-foreground">
      {message}
    </div>
  );
}

async function loadSchedulePageData() {
  if (!hasSupabaseConfig()) {
    return {
      configured: false,
      loadError: null,
      exams: [] as ScheduleExamOption[],
      topics: [] as ScheduleTopicOption[],
      items: [] as ScheduleViewItem[]
    };
  }

  const supabase = await createClient();
  const [examsResult, topicsResult, itemsResult] = await Promise.all([
    supabase.from("exams").select("id,name").eq("is_active", true).order("name"),
    supabase.from("topics").select("id,exam_id,name,level,order_index").eq("level", 1).order("order_index"),
    supabase
      .from("scheduled_items")
      .select("id,exam_id,topic_id,item_type,session_type,scheduled_for,status,notes")
      .order("scheduled_for")
      .limit(200)
  ]);

  const exams = toExamOptions(examsResult.data);
  const topics = toTopicOptions(topicsResult.data);

  return {
    configured: true,
    loadError: examsResult.error?.message ?? topicsResult.error?.message ?? itemsResult.error?.message ?? null,
    exams,
    topics,
    items: toViewItems(itemsResult.data, exams, topics)
  };
}

function toExamOptions(rows: unknown): ScheduleExamOption[] {
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
      const name = typeof record.name === "string" ? record.name : "";

      return id && name ? { id, name } : null;
    })
    .filter((row): row is ScheduleExamOption => Boolean(row));
}

function toTopicOptions(rows: unknown): ScheduleTopicOption[] {
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
      const examId = typeof record.exam_id === "string" ? record.exam_id : "";
      const name = typeof record.name === "string" ? record.name : "";

      return id && examId && name ? { examId, id, name } : null;
    })
    .filter((row): row is ScheduleTopicOption => Boolean(row));
}

function toViewItems(
  rows: unknown,
  exams: ScheduleExamOption[],
  topics: ScheduleTopicOption[]
): ScheduleViewItem[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const examNames = new Map(exams.map((exam) => [exam.id, exam.name]));
  const topicNames = new Map(topics.map((topic) => [topic.id, topic.name]));

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const record = row as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const examId = typeof record.exam_id === "string" ? record.exam_id : "";
      const topicId = typeof record.topic_id === "string" ? record.topic_id : null;
      const itemType = record.item_type === "retest" ? "retest" : "test";
      const sessionType = typeof record.session_type === "string" ? record.session_type : "";
      const scheduledFor = typeof record.scheduled_for === "string" ? record.scheduled_for : "";
      const status =
        record.status === "completed" || record.status === "cancelled" ? record.status : "planned";
      const notes = typeof record.notes === "string" ? record.notes : null;

      if (!id || !sessionType || !scheduledFor) {
        return null;
      }

      return {
        id,
        examName: examNames.get(examId) ?? "Exam",
        topicId,
        topicName: topicId ? (topicNames.get(topicId) ?? null) : null,
        itemType,
        sessionType,
        scheduledFor,
        status,
        notes
      } satisfies ScheduleViewItem;
    })
    .filter((row): row is ScheduleViewItem => Boolean(row));
}
