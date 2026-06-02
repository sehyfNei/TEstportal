import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn
} from "drizzle-orm/pg-core";
import { authUsers } from "@/lib/db/schema/auth";

export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const examManifests = pgTable("exam_manifests", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  manifest: jsonb("manifest").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  importedBy: uuid("imported_by").references(() => authUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => topics.id),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull(),
  weightPercent: numeric("weight_percent"),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const conceptClusters = pgTable("concept_clusters", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const concepts = pgTable("concepts", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  clusterId: uuid("cluster_id").references(() => conceptClusters.id),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const historicalCutoffs = pgTable("historical_cutoffs", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  category: text("category").default("general").notNull(),
  cutoffScore: numeric("cutoff_score").notNull(),
  maxScore: numeric("max_score").notNull(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const examsRelations = relations(exams, ({ many }) => ({
  manifests: many(examManifests),
  topics: many(topics),
  conceptClusters: many(conceptClusters),
  concepts: many(concepts),
  historicalCutoffs: many(historicalCutoffs)
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  exam: one(exams, {
    fields: [topics.examId],
    references: [exams.id]
  }),
  parent: one(topics, {
    fields: [topics.parentId],
    references: [topics.id],
    relationName: "topic_parent"
  }),
  children: many(topics, {
    relationName: "topic_parent"
  }),
  concepts: many(concepts)
}));

