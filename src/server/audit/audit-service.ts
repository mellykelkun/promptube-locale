import "server-only";

import { randomUUID } from "node:crypto";

import { desc } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import { adminAuditEvents } from "@/server/database/schema";
import { redactLogContext } from "@/server/security/redact-log-context";

import type { AuditAction, AuditOutcome } from "./audit-events";

type WriteAuditEventInput = {
  action: AuditAction;
  actorUserId?: null | string;
  correlationId?: null | string;
  metadata?: Record<string, unknown>;
  outcome: AuditOutcome;
  targetId?: null | string;
  targetType?: null | string;
};

export async function writeAuditEvent(input: WriteAuditEventInput): Promise<void> {
  const db = await getDatabase();

  await db.insert(adminAuditEvents).values({
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    correlationId: input.correlationId ?? null,
    id: randomUUID(),
    metadata: redactLogContext(input.metadata ?? {}),
    outcome: input.outcome,
    targetId: input.targetId ?? null,
    targetType: input.targetType ?? null,
  });
}

export async function listRecentAuditEvents(limit = 50) {
  const db = await getDatabase();

  return db
    .select({
      action: adminAuditEvents.action,
      actorUserId: adminAuditEvents.actorUserId,
      correlationId: adminAuditEvents.correlationId,
      createdAt: adminAuditEvents.createdAt,
      id: adminAuditEvents.id,
      outcome: adminAuditEvents.outcome,
      targetType: adminAuditEvents.targetType,
    })
    .from(adminAuditEvents)
    .orderBy(desc(adminAuditEvents.createdAt))
    .limit(limit);
}
