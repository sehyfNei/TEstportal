"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createScheduledItemAction,
  rescheduleScheduledItemAction,
  setScheduledItemStatusAction,
  type ScheduleActionState
} from "@/app/(app)/schedule/actions";
import {
  groupScheduledItems,
  resolveScheduleMode,
  startNowHref,
  type ScheduledItemStatus,
  type ScheduleModeId
} from "@/lib/schedule/schedule-service";

export type ScheduleExamOption = {
  id: string;
  name: string;
};

export type ScheduleTopicOption = {
  id: string;
  examId: string;
  name: string;
};

export type ScheduleViewItem = {
  id: string;
  examName: string;
  topicId: string | null;
  topicName: string | null;
  itemType: "test" | "retest";
  sessionType: string;
  scheduledFor: string;
  status: ScheduledItemStatus;
  notes: string | null;
};

const SCHEDULE_MODE_IDS: ScheduleModeId[] = ["diagnostic", "topic", "sectional", "mock", "retest"];

const initialState: ScheduleActionState = { ok: false, message: "" };

export function ScheduleView({
  exams,
  topics,
  items
}: {
  exams: ScheduleExamOption[];
  topics: ScheduleTopicOption[];
  items: ScheduleViewItem[];
}) {
  const grouped = groupScheduledItems(items, new Date());

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid content-start gap-6">
        <ScheduleSection
          emptyMessage="Nothing overdue. Stay on it."
          items={grouped.overdue}
          overdue
          title="Overdue"
        />
        <ScheduleSection
          emptyMessage="Nothing planned yet. Schedule your next test."
          items={grouped.upcoming}
          title="Upcoming"
        />
        <ScheduleSection emptyMessage="No completed or cancelled items yet." items={grouped.past} title="History" />
      </div>

      <CreateScheduleForm exams={exams} topics={topics} />
    </div>
  );
}

function ScheduleSection({
  title,
  items,
  emptyMessage,
  overdue = false
}: {
  title: string;
  items: ScheduleViewItem[];
  emptyMessage: string;
  overdue?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <ScheduleItemRow item={item} key={item.id} overdue={overdue} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}

function ScheduleItemRow({ item, overdue }: { item: ScheduleViewItem; overdue: boolean }) {
  const [statusState, statusAction, statusPending] = useActionState(setScheduledItemStatusAction, initialState);
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    rescheduleScheduledItemAction,
    initialState
  );
  const [showReschedule, setShowReschedule] = useState(false);

  const isPlanned = item.status === "planned";
  const when = new Date(item.scheduledFor);
  const modeTitle = resolveScheduleMode(item.sessionType === "concept_retest" ? "retest" : item.sessionType)?.title;
  const message = statusState.message || rescheduleState.message;

  return (
    <div className={`rounded-md border p-3 ${overdue ? "border-destructive/50 bg-destructive/5" : "border-border bg-background"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {modeTitle ?? item.sessionType}
            {item.topicName ? <span className="font-normal text-muted-foreground"> · {item.topicName}</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.examName} · {when.toLocaleString()}
            {!isPlanned ? ` · ${item.status}` : ""}
          </p>
          {item.notes ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.notes}</p> : null}
        </div>

        {isPlanned ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
              href={startNowHref(item)}
            >
              Start now
            </Link>
            <form action={statusAction}>
              <input name="itemId" type="hidden" value={item.id} />
              <input name="status" type="hidden" value="completed" />
              <ActionChip disabled={statusPending} label="Done" />
            </form>
            <button
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:border-primary/50"
              onClick={() => setShowReschedule((open) => !open)}
              type="button"
            >
              Reschedule
            </button>
            <form action={statusAction}>
              <input name="itemId" type="hidden" value={item.id} />
              <input name="status" type="hidden" value="cancelled" />
              <ActionChip disabled={statusPending} label="Cancel" />
            </form>
          </div>
        ) : null}
      </div>

      {isPlanned && showReschedule ? (
        <form action={rescheduleAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input name="itemId" type="hidden" value={item.id} />
          <input
            className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
            name="scheduledFor"
            required
            type="datetime-local"
          />
          <ActionChip disabled={reschedulePending} label="Save new time" />
        </form>
      ) : null}

      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function ActionChip({ label, disabled }: { label: string; disabled: boolean }) {
  return (
    <button
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type="submit"
    >
      {label}
    </button>
  );
}

function CreateScheduleForm({
  exams,
  topics
}: {
  exams: ScheduleExamOption[];
  topics: ScheduleTopicOption[];
}) {
  const [state, formAction, isPending] = useActionState(createScheduledItemAction, initialState);
  const [modeId, setModeId] = useState<ScheduleModeId>("diagnostic");
  const [examId, setExamId] = useState(exams.length === 1 ? exams[0].id : "");

  const mode = resolveScheduleMode(modeId);
  const examTopics = topics.filter((topic) => topic.examId === examId);

  return (
    <form
      action={formAction}
      className="grid content-start gap-4 self-start rounded-xl border border-border bg-card shadow-card p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">Schedule a test</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Pick a day and time; overdue items stay visible until you act on them.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        What
        <select
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          name="mode"
          onChange={(event) => setModeId(event.target.value as ScheduleModeId)}
          value={modeId}
        >
          {SCHEDULE_MODE_IDS.map((id) => (
            <option key={id} value={id}>
              {resolveScheduleMode(id)?.title ?? id}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Exam
        <select
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          disabled={isPending || !exams.length}
          name="examId"
          onChange={(event) => setExamId(event.target.value)}
          required
          value={examId}
        >
          <option value="">Select exam</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
      </label>

      {mode?.requiresTopic ? (
        <label className="grid gap-2 text-sm font-medium">
          Topic
          <select
            className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            disabled={isPending || !examId}
            name="topicId"
            required
          >
            <option value="">{examId ? "Select topic" : "Select exam first"}</option>
            {examTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        When
        <input
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          name="scheduledFor"
          required
          type="datetime-local"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Notes (optional)
        <input
          className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          maxLength={280}
          name="notes"
          placeholder="e.g. revise polity first"
          type="text"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !exams.length}
          type="submit"
        >
          {isPending ? "Scheduling..." : "Add to schedule"}
        </button>
        {state.message ? (
          <p className={`text-sm ${state.ok ? "text-primary" : "text-muted-foreground"}`}>{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
