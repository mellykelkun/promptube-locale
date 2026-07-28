import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const adminAuditEvents = pgTable(
  "admin_audit_events",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    correlationId: text("correlation_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_events_created_at_idx").on(table.createdAt),
    index("admin_audit_events_actor_user_id_idx").on(table.actorUserId),
    index("admin_audit_events_action_idx").on(table.action),
  ],
);
