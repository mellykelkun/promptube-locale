import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getAuth } from "@/server/auth/auth";
import { auditActions } from "@/server/audit/audit-events";
import { writeAuditEvent } from "@/server/audit/audit-service";
import { getDatabase } from "@/server/database/client";
import { session, user } from "@/server/database/schema";

export type CurrentAdmin = {
  email: string;
  id: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
};

type AdminSession = {
  admin: CurrentAdmin;
  sessionId: string;
};

const idleTimeoutMs = 30 * 60 * 1000;
const absoluteTimeoutMs = 8 * 60 * 60 * 1000;

export const getOptionalAdminSession = cache(async (): Promise<AdminSession | null> => {
  const auth = await getAuth();
  const sessionResult = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResult?.session?.id || !sessionResult.user?.id) {
    return null;
  }

  const db = await getDatabase();
  const rows = await db
    .select({
      banned: user.banned,
      createdAt: session.createdAt,
      email: user.email,
      expiresAt: session.expiresAt,
      id: user.id,
      name: user.name,
      revokedAt: session.revokedAt,
      role: user.role,
      sessionId: session.id,
      twoFactorEnabled: user.twoFactorEnabled,
      updatedAt: session.updatedAt,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.id, sessionResult.session.id))
    .limit(1);

  const row = rows[0];

  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (Date.now() - row.updatedAt.getTime() > idleTimeoutMs) {
    return null;
  }

  if (Date.now() - row.createdAt.getTime() > absoluteTimeoutMs) {
    return null;
  }

  if (row.banned || row.role !== "admin") {
    await writeAuditEvent({
      action: auditActions.authorizationDenied,
      actorUserId: row.id,
      outcome: "failure",
      targetType: "admin-route",
    });
    return null;
  }

  return {
    admin: {
      email: row.email,
      id: row.id,
      name: row.name,
      role: row.role ?? "user",
      twoFactorEnabled: row.twoFactorEnabled ?? false,
    },
    sessionId: row.sessionId,
  };
});

export async function requireAdminSession(): Promise<AdminSession> {
  const current = await getOptionalAdminSession();

  if (!current) {
    redirect("/login");
  }

  return current;
}

export async function requireCompletedTwoFactor(): Promise<AdminSession> {
  const current = await requireAdminSession();

  if (!current.admin.twoFactorEnabled) {
    await writeAuditEvent({
      action: auditActions.authorizationDenied,
      actorUserId: current.admin.id,
      outcome: "failure",
      targetType: "two-factor-required",
    });
    redirect("/setup-2fa");
  }

  return current;
}
