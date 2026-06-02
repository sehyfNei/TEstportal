import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey()
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  targetExams: text("target_exams").array().default(sql`'{}'::text[]`).notNull(),
  prepStartDate: date("prep_start_date"),
  dailyStudyMinutes: integer("daily_study_minutes"),
  preferredTestDays: text("preferred_test_days").array().default(sql`'{}'::text[]`).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  streakFreezes: integer("streak_freezes").default(0).notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const userConsents = pgTable("user_consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(),
  granted: boolean("granted").notNull(),
  version: text("version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

