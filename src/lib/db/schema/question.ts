import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector
} from "drizzle-orm/pg-core";
import { authUsers } from "@/lib/db/schema/auth";
import { concepts, exams, topics } from "@/lib/db/schema/exam";

export const QUESTION_TYPES = ["mcq", "msq", "integer", "statement", "assertion", "match"] as const;
export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const QUESTION_SOURCES = ["pyq", "ai_generated", "manual", "vision_ingested"] as const;
export const QUESTION_STATUSES = [
  "draft",
  "validated",
  "reviewed",
  "approved",
  "live",
  "flagged",
  "retired"
] as const;
export const QUESTION_EXPOSURE_POLICIES = [
  "practice",
  "diagnostic_reserved",
  "benchmark_reserved",
  "hidden"
] as const;
export const QUESTION_QUALITY_TIERS = ["gold", "silver", "bronze", "quarantine"] as const;
export const QUESTION_FLAG_REASONS = [
  "incorrect_answer",
  "ambiguous",
  "wrong_topic",
  "outdated",
  "low_quality",
  "other"
] as const;
export const QUESTION_FLAG_STATUSES = ["open", "reviewing", "resolved", "rejected"] as const;

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id),
  subtopicId: uuid("subtopic_id").references(() => topics.id),
  type: text("type").notNull(),
  difficulty: text("difficulty").notNull(),
  source: text("source").notNull(),
  sourceYear: integer("source_year"),
  sourceReference: text("source_reference"),
  isContested: boolean("is_contested").default(false).notNull(),
  language: text("language").default("en").notNull(),
  status: text("status").default("draft").notNull(),
  exposurePolicy: text("exposure_policy").default("practice").notNull(),
  currentVersionId: uuid("current_version_id"),
  qualityTier: text("quality_tier").default("bronze").notNull(),
  qualityScore: numeric("quality_score"),
  usageCount: integer("usage_count").default(0).notNull(),
  flagCount: integer("flag_count").default(0).notNull(),
  avgAccuracy: numeric("avg_accuracy"),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdBy: uuid("created_by").references(() => authUsers.id),
  approvedBy: uuid("approved_by").references(() => authUsers.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  lastAuditedAt: timestamp("last_audited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const questionVersions = pgTable("question_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: jsonb("content").notNull(),
  explanation: text("explanation"),
  explanationDetail: text("explanation_detail"),
  reviewerNotes: text("reviewer_notes"),
  changedBy: uuid("changed_by").references(() => authUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const questionConcepts = pgTable(
  "question_concepts",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    relevance: numeric("relevance").default("1.0").notNull()
  },
  (table) => [primaryKey({ columns: [table.questionId, table.conceptId] })]
);

export const questionFlags = pgTable("question_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => authUsers.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").default("open").notNull(),
  resolvedBy: uuid("resolved_by").references(() => authUsers.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const questionStats = pgTable("question_stats", {
  questionId: uuid("question_id")
    .primaryKey()
    .references(() => questions.id, { onDelete: "cascade" }),
  totalAttempts: integer("total_attempts").default(0).notNull(),
  correctAttempts: integer("correct_attempts").default(0).notNull(),
  difficultyIndex: numeric("difficulty_index"),
  discrimination: numeric("discrimination"),
  pointBiserial: numeric("point_biserial"),
  avgTimeSec: numeric("avg_time_sec"),
  stddevTimeSec: numeric("stddev_time_sec"),
  distractorDist: jsonb("distractor_dist").default(sql`'{}'::jsonb`).notNull(),
  flagCount: integer("flag_count").default(0).notNull(),
  qualityTier: text("quality_tier").default("bronze").notNull(),
  lastCalibrated: timestamp("last_calibrated", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const questionStatusEvents = pgTable("question_status_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  actor: uuid("actor").references(() => authUsers.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id]
  }),
  topic: one(topics, {
    fields: [questions.topicId],
    references: [topics.id],
    relationName: "question_topic"
  }),
  subtopic: one(topics, {
    fields: [questions.subtopicId],
    references: [topics.id],
    relationName: "question_subtopic"
  }),
  currentVersion: one(questionVersions, {
    fields: [questions.currentVersionId],
    references: [questionVersions.id]
  }),
  versions: many(questionVersions),
  concepts: many(questionConcepts),
  flags: many(questionFlags),
  statusEvents: many(questionStatusEvents),
  stats: one(questionStats)
}));

export const questionVersionsRelations = relations(questionVersions, ({ one }) => ({
  question: one(questions, {
    fields: [questionVersions.questionId],
    references: [questions.id]
  })
}));

export const questionConceptsRelations = relations(questionConcepts, ({ one }) => ({
  question: one(questions, {
    fields: [questionConcepts.questionId],
    references: [questions.id]
  }),
  concept: one(concepts, {
    fields: [questionConcepts.conceptId],
    references: [concepts.id]
  })
}));

export const questionFlagsRelations = relations(questionFlags, ({ one }) => ({
  question: one(questions, {
    fields: [questionFlags.questionId],
    references: [questions.id]
  })
}));

export const questionStatusEventsRelations = relations(questionStatusEvents, ({ one }) => ({
  question: one(questions, {
    fields: [questionStatusEvents.questionId],
    references: [questions.id]
  }),
  actorUser: one(authUsers, {
    fields: [questionStatusEvents.actor],
    references: [authUsers.id]
  })
}));
