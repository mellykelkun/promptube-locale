import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getOptionalAdminSession } from "@/server/auth/session";
import { auditActions } from "@/server/audit/audit-events";
import { writeAuditEvent } from "@/server/audit/audit-service";
import { serverEnvironment } from "@/server/config/environment";
import { getDatabase } from "@/server/database/client";
import { session } from "@/server/database/schema";

export async function POST(): Promise<Response> {
  const current = await getOptionalAdminSession();

  const response = NextResponse.redirect(new URL("/login", serverEnvironment.authBaseUrl), {
    status: 303,
  });

  if (current) {
    const now = new Date();
    const db = await getDatabase();

    await db
      .update(session)
      .set({
        expiresAt: now,
        revokedAt: now,
        updatedAt: now,
      })
      .where(eq(session.id, current.sessionId));

    await writeAuditEvent({
      action: auditActions.sessionRevoked,
      actorUserId: current.admin.id,
      outcome: "success",
    });
    await writeAuditEvent({
      action: auditActions.logoutSucceeded,
      actorUserId: current.admin.id,
      outcome: "success",
    });
  }

  expireAuthCookies(response);
  return response;
}

function expireAuthCookies(response: NextResponse): void {
  const secure = !["local", "test"].includes(serverEnvironment.environment);
  const cookieNames = [
    "promptube-admin.session_token",
    "promptube-admin.session_data",
    "promptube-admin.two_factor",
    "__Secure-promptube-admin.session_token",
    "__Secure-promptube-admin.session_data",
    "__Secure-promptube-admin.two_factor",
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "strict",
      secure,
    });
  }
}
