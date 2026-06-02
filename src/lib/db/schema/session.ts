import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid
} from "drizzle-orm/pg-core";
import { authUsers } from "@/lib/db/schema/auth";
import { exams } from "@/lib/db/schema/exam";
import { questionVersions, questions } from "@/lib/db/schema/question";

export const TEST_TEMPLATE_TYPES = [
  "diagnostic",
  "topic",
  "concept_retest",
  "sectional",
  "mock",
  "benchmark",
  "custom"
] as const;
export const TEST_TEMPLATE_SELECTION_MODES = [
  "fixed",
  "random_weighted",
  "adaptive_practice",
  "fsrs_retest",
  "custom"
] as const;
export const TEST_SESSION_STATUSES = [
  "created",
  "scheduled",
  "in_progress",
  "submitted",
  "scored",
  "analyzing",
  "analyzed",
  "abandoned",
  "expired"
] as const;
export const SESSION_ANSWER_CONFIDENCE = ["sure", "unsure", "guessed"] as const;

export const testTemplates = pgTable("test_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  selectionMode: text("selection_mode").notNull(),
  config: jsonb("config").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => authUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const testSessions = pgTable(
  "test_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id").references(() => testTemplates.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id),
    type: text("type").notNull(),
    status: text("status").default("created").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    tabSwitchCount: integer("tab_switch_count").default(0).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("test_sessions_user_status").on(table.userId, table.status),
    index("test_sessions_exam_type").on(table.examId, table.type)
  ]
);

export const sessionQuestions = pgTable(
  "session_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    questionVersionId: uuid("question_version_id").references(() => questionVersions.id),
    promptSnapshot: jsonb("prompt_snapshot").notNull(),
    sequence: integer("sequence").notNull(),
    sectionSlug: text("section_slug"),
    selectedByReason: text("selected_by_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("session_questions_session_sequence_unique").on(table.sessionId, table.sequence),
    unique("session_questions_session_question_unique").on(table.sessionId, table.questionId)
  ]
);

export const sessionAnswers = pgTable(
  "session_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    selectedAnswer: jsonb("selected_answer"),
    confidence: text("confidence"),
    markedReview: boolean("marked_review").default(false).notNull(),
    isCorrect: boolean("is_correct"),
    marksAwarded: numeric("marks_awarded"),
    timeSpentSec: integer("time_spent_sec").default(0).notNull(),
    timeToFirstAnswerMs: integer("time_to_first_answer_ms"),
    revisitCount: integer("revisit_count").default(0).notNull(),
    metadata: jsonb("metadata"),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    lastSavedAt: timestamp("last_saved_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("session_answers_session").on(table.sessionId),
    unique("session_answers_session_question_unique").on(table.sessionId, table.questionId)
  ]
);

export const sessionResults = pgTable(
  "session_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => testSessions.id, { onDelete: "cascade" })
      .unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id),
    score: numeric("score").notNull(),
    maxScore: numeric("max_score").notNull(),
    accuracy: numeric("accuracy").notNull(),
    attempted: integer("attempted").notNull(),
    correct: integer("correct").notNull(),
    incorrect: integer("incorrect").notNull(),
    skipped: integer("skipped").notNull(),
    durationSec: integer("duration_sec").notNull(),
    topicScores: jsonb("topic_scores").notNull(),
    difficultyScores: jsonb("difficulty_scores"),
    sourceScores: jsonb("source_scores"),
    conceptScores: jsonb("concept_scores"),
    strategyMetrics: jsonb("strategy_metrics"),
    readinessDelta: jsonb("readiness_delta"),
    percentile: numeric("percentile"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("session_results_user_exam").on(table.userId, table.examId, table.createdAt)]
);

export const testTemplatesRelations = relations(testTemplates, ({ one, many }) => ({
  exam: one(exams, {
    fields: [testTemplates.examId],
    references: [exams.id]
  }),
  creator: one(authUsers, {
    fields: [testTemplates.createdBy],
    references: [authUsers.id]
  }),
  sessions: many(testSessions)
}));

export const testSessionsRelations = relations(testSessions, ({ one, many }) => ({
  template: one(testTemplates, {
    fields: [testSessions.templateId],
    references: [testTemplates.id]
  }),
  user: one(authUsers, {
    fields: [testSessions.userId],
    references: [authUsers.id]
  }),
  exam: one(exams, {
    fields: [testSessions.examId],
    references: [exams.id]
  }),
  questions: many(sessionQuestions),
  answers: many(sessionAnswers),
  result: one(sessionResults)
}));

export const sessionQuestionsRelations = relations(sessionQuestions, ({ one }) => ({
  session: one(testSessions, {
    fields: [sessionQuestions.sessionId],
    references: [testSessions.id]
  }),
  question: one(questions, {
    fields: [sessionQuestions.questionId],
    references: [questions.id]
  }),
  version: one(questionVersions, {
    fields: [sessionQuestions.questionVersionId],
    references: [questionVersions.id]
  })
}));

export const sessionAnswersRelations = relations(sessionAnswers, ({ one }) => ({
  session: one(testSessions, {
    fields: [sessionAnswers.sessionId],
    references: [testSessions.id]
  }),
  question: one(questions, {
    fields: [sessionAnswers.questionId],
    references: [questions.id]
  }),
  user: one(authUsers, {
    fields: [sessionAnswers.userId],
    references: [authUsers.id]
  })
}));

export const sessionResultsRelations = relations(sessionResults, ({ one }) => ({
  session: one(testSessions, {
    fields: [sessionResults.sessionId],
    references: [testSessions.id]
  }),
  user: one(authUsers, {
    fields: [sessionResults.userId],
    references: [authUsers.id]
  }),
  exam: one(exams, {
    fields: [sessionResults.examId],
    references: [exams.id]
  })
}));
