import { index, pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { authUsers } from "@/lib/db/schema/auth";

export const userEvents = pgTable(
  "user_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("user_events_user_time").on(table.userId, table.occurredAt),
    index("user_events_type_time").on(table.eventType, table.occurredAt)
  ]
);

export type UserEvent = typeof userEvents.$inferSelect;
export type InsertUserEvent = typeof userEvents.$inferInsert;
