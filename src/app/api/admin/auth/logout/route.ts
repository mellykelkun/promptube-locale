import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/server/auth/auth";
import { getOptionalAdminSession } from "@/server/auth/session";
import { auditActions } from "@/server/audit/audit-events";
import { writeAuditEvent } from "@/server/audit/audit-service";
import { serverEnvironment } from "@/server/config/environment";

export async function POST(request: NextRequest): Promise<Response> {
  const current = await getOptionalAdminSession();
  const auth = await getAuth();

  const authResponse = await auth.handler(
    new Request(new URL("/api/auth/sign-out", request.url), {
      headers: request.headers,
      method: "POST",
    }),
  );

  if (!authResponse.ok) {
    return NextResponse.json({ error: "Déconnexion impossible." }, { status: authResponse.status });
  }

  const response = NextResponse.redirect(new URL("/login", serverEnvironment.authBaseUrl), {
    status: 303,
  });

  if (current) {
    await writeAuditEvent({
      action: auditActions.logoutSucceeded,
      actorUserId: current.admin.id,
      outcome: "success",
    });
  }

  copySetCookieHeaders(authResponse, response);
  return response;
}

function copySetCookieHeaders(source: Response, target: NextResponse): void {
  const headersWithSetCookie = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithSetCookie.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      target.headers.append("set-cookie", cookie);
    }
    return;
  }

  const cookie = source.headers.get("set-cookie");
  if (cookie) {
    target.headers.append("set-cookie", cookie);
  }
}
