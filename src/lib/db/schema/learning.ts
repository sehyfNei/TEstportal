import { relations, sql } from "drizzle-orm";
import { check, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "@/lib/db/schema/auth";
import { concepts, exams, topics } from "@/lib/db/schema/exam";

export const MASTERY_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;

export const masteryRecords = pgTable(
  "mastery_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "cascade" }),
    masteryScore: numeric("mastery_score").default("0").notNull(),
    confidenceLevel: text("confidence_level").default("low").notNull(),
    baselineScore: numeric("baseline_score"),
    stabilityFactor: numeric("stability_factor").default("1.0").notNull(),
    questionsAttempted: integer("questions_attempted").default(0).notNull(),
    questionsCorrect: integer("questions_correct").default(0).notNull(),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    check("mastery_score_range", sql`${table.masteryScore} >= 0 and ${table.masteryScore} <= 100`),
    check("confidence_level_check", sql`${table.confidenceLevel} in ('low', 'medium', 'high')`),
    check(
      "baseline_score_range",
      sql`${table.baselineScore} is null or (${table.baselineScore} >= 0 and ${table.baselineScore} <= 100)`
    ),
    check("stability_factor_range", sql`${table.stabilityFactor} >= 1.0 and ${table.stabilityFactor} <= 2.0`),
    check("questions_attempted_nonnegative", sql`${table.questionsAttempted} >= 0`),
    check("questions_correct_nonnegative", sql`${table.questionsCorrect} >= 0`),
    check("questions_correct_lte_attempted", sql`${table.questionsCorrect} <= ${table.questionsAttempted}`),
    check(
      "topic_xor_concept",
      sql`(${table.topicId} is not null and ${table.conceptId} is null) or (${table.topicId} is null and ${table.conceptId} is not null)`
    ),
    uniqueIndex("mastery_records_user_exam_topic_unique")
      .on(table.userId, table.examId, table.topicId)
      .where(sql`${table.topicId} is not null`),
    uniqueIndex("mastery_records_user_exam_concept_unique")
      .on(table.userId, table.examId, table.conceptId)
      .where(sql`${table.conceptId} is not null`),
    index("mastery_user_exam").on(table.userId, table.examId),
    index("mastery_topic_query")
      .on(table.examId, table.topicId)
      .where(sql`${table.topicId} is not null`),
    index("mastery_concept_query")
      .on(table.examId, table.conceptId)
      .where(sql`${table.conceptId} is not null`),
    index("mastery_last_tested")
      .on(table.lastTestedAt)
      .where(sql`${table.lastTestedAt} is not null`)
  ]
);

export const masteryRecordsRelations = relations(masteryRecords, ({ one }) => ({
  user: one(authUsers, {
    fields: [masteryRecords.userId],
    references: [authUsers.id]
  }),
  exam: one(exams, {
    fields: [masteryRecords.examId],
    references: [exams.id]
  }),
  topic: one(topics, {
    fields: [masteryRecords.topicId],
    references: [topics.id]
  }),
  concept: one(concepts, {
    fields: [masteryRecords.conceptId],
    references: [concepts.id]
  })
}));

export type MasteryRecord = typeof masteryRecords.$inferSelect;
export type InsertMasteryRecord = typeof masteryRecords.$inferInsert;
