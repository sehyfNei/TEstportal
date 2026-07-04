"use client";

import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { ChatDisplayMessage } from "@/lib/chat/chat-read";
import { parseMarkdown } from "@/lib/chat/markdown";
import { cn } from "@/lib/utils";

type Exam = {
  id: string;
  name: string;
};

type DisplayMessage = ChatDisplayMessage & {
  streaming?: boolean;
};

type ChatViewProps = {
  exams: Exam[];
  initialMessages: ChatDisplayMessage[];
  initialExamId: string | null;
  initialSessionId: string | null;
  topicHint: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  daily_limit: "Daily chat limit reached. Try again tomorrow.",
  ai_unavailable: "AI is currently unavailable. Please try again later.",
  unauthenticated: "Session expired. Please sign in again.",
  request_failed: "Something went wrong. Please try again.",
  network_error: "Network error. Check your connection and try again.",
  no_stream: "AI response could not be streamed. Please try again."
};

export function ChatView({
  exams,
  initialExamId,
  initialMessages,
  initialSessionId,
  topicHint
}: ChatViewProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages);
  const [examId, setExamId] = useState<string | null>(initialExamId);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [input, setInput] = useState(
    topicHint && initialMessages.length === 0 ? `Help me understand ${topicHint}` : ""
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentExam = useMemo(
    () => exams.find((exam) => exam.id === examId) ?? null,
    [examId, exams]
  );
  const needsExam = !sessionId && exams.length > 0 && !examId;
  const hasNoExams = !sessionId && exams.length === 0;
  const canSend = Boolean(input.trim()) && !isStreaming && !needsExam && !hasNoExams;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !canSend) {
      return;
    }

    setInput("");
    setErrorKey(null);

    const userMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: DisplayMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true
    };

    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/study/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, message: text, sessionId })
      });

      if (!response.ok) {
        setErrorKey(resolveErrorKey(response.status));
        setMessages((previous) => previous.filter((message) => message.id !== assistantId));
        return;
      }

      const returnedSessionId = response.headers.get("X-Session-Id");
      if (returnedSessionId && !sessionId) {
        setSessionId(returnedSessionId);
        persistSessionInUrl(returnedSessionId, examId);
      }

      if (!response.body) {
        setErrorKey("no_stream");
        setMessages((previous) => previous.filter((message) => message.id !== assistantId));
        return;
      }

      await readStreamingResponse(response.body, assistantId);
    } catch {
      setErrorKey("network_error");
      setMessages((previous) => previous.filter((message) => message.id !== assistantId));
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }

  async function readStreamingResponse(body: ReadableStream<Uint8Array>, assistantId: string) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        accumulated += decoder.decode(value, { stream: true });
        updateAssistantMessage(assistantId, accumulated, true);
      }

      const tail = decoder.decode();
      if (tail) {
        accumulated += tail;
      }

      updateAssistantMessage(assistantId, accumulated, false);
    } finally {
      reader.releaseLock();
    }
  }

  function updateAssistantMessage(assistantId: string, content: string, streaming: boolean) {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === assistantId ? { ...message, content, streaming } : message
      )
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
  }

  function handleExamChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextExamId = event.target.value || null;
    setExamId(nextExamId);
    setErrorKey(null);
    persistExamInUrl(nextExamId);
  }

  return (
    <section className="flex h-[calc(100vh-8rem)] min-h-[620px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div>
          <p className="text-sm font-medium text-primary">Study Chat</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {currentExam ? currentExam.name : "AI Study Companion"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ask for help on weak topics, mistakes, or what to revise next.
          </p>
        </div>

        {exams.length > 0 ? (
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Exam
            <select
              className="h-10 min-w-56 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStreaming || Boolean(sessionId)}
              value={examId ?? ""}
              onChange={handleExamChange}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-card">
        {messages.length === 0 ? (
          <EmptyState currentExam={currentExam} hasNoExams={hasNoExams} needsExam={needsExam} />
        ) : null}

        <ul className="grid gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>

      {errorKey ? <ErrorBanner errorKey={errorKey} onDismiss={() => setErrorKey(null)} /> : null}

      <div className="mt-3 flex items-end gap-3">
        <textarea
          ref={textareaRef}
          className="min-h-12 flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isStreaming || hasNoExams}
          placeholder={placeholderText({ hasNoExams, needsExam })}
          rows={1}
          style={{ maxHeight: 200 }}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button
          className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSend}
          type="button"
          onClick={() => void handleSend()}
        >
          {isStreaming ? "Sending..." : "Send"}
        </button>
      </div>
    </section>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  if (message.role === "user") {
    return (
      <li className="flex justify-end">
        <div className="max-w-[75%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground">
          {message.content}
        </div>
      </li>
    );
  }

  if (message.streaming) {
    return (
      <li className="flex justify-start">
        <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-border bg-background px-4 py-2.5 text-sm leading-6 text-foreground">
          <span className="whitespace-pre-wrap">{message.content}</span>
          <span className="ml-0.5 animate-pulse text-primary">▋</span>
        </div>
      </li>
    );
  }

  const html = DOMPurify.sanitize(parseMarkdown(message.content));

  return (
    <li className="flex justify-start">
      <div
        className={cn(
          "max-w-[85%] rounded-xl rounded-tl-sm border border-border bg-background px-4 py-2.5 text-sm leading-6 text-foreground",
          "[&_p]:m-0 [&_p+_p]:mt-3 [&_strong]:font-semibold [&_em]:italic",
          "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs"
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </li>
  );
}

function EmptyState({
  currentExam,
  hasNoExams,
  needsExam
}: {
  currentExam: Exam | null;
  hasNoExams: boolean;
  needsExam: boolean;
}) {
  if (hasNoExams) {
    return (
      <p className="py-12 text-center text-sm leading-6 text-muted-foreground">
        No active exams are available yet. Import an exam manifest from the admin panel to start
        personalised chat.
      </p>
    );
  }

  if (needsExam) {
    return (
      <p className="py-12 text-center text-sm leading-6 text-muted-foreground">
        Select an exam above to start a personalised study session.
      </p>
    );
  }

  return (
    <p className="py-12 text-center text-sm leading-6 text-muted-foreground">
      {currentExam
        ? `Ask me anything about ${currentExam.name}. I will use your study data to tailor the answer.`
        : "Ask me anything about your preparation."}
    </p>
  );
}

function ErrorBanner({
  errorKey,
  onDismiss
}: {
  errorKey: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
      <span>{ERROR_MESSAGES[errorKey] ?? "An error occurred."}</span>
      <button className="shrink-0 text-xs font-medium underline" type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

function resolveErrorKey(status: number): string {
  if (status === 429) return "daily_limit";
  if (status === 503) return "ai_unavailable";
  if (status === 401) return "unauthenticated";
  return "request_failed";
}

function placeholderText({
  hasNoExams,
  needsExam
}: {
  hasNoExams: boolean;
  needsExam: boolean;
}): string {
  if (hasNoExams) {
    return "No active exams are available yet.";
  }

  if (needsExam) {
    return "Select an exam above to get personalised help.";
  }

  return "Ask anything. Enter sends, Shift+Enter adds a new line.";
}

function persistSessionInUrl(sessionId: string, examId: string | null) {
  const url = new URL(window.location.href);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.delete("topic");
  if (examId) {
    url.searchParams.set("examId", examId);
  }
  window.history.replaceState(null, "", url.toString());
}

function persistExamInUrl(examId: string | null) {
  const url = new URL(window.location.href);
  if (examId) {
    url.searchParams.set("examId", examId);
  } else {
    url.searchParams.delete("examId");
  }
  window.history.replaceState(null, "", url.toString());
}
