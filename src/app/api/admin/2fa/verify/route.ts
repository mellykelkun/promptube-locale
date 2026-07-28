import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/server/auth/auth";
import { getOptionalAdminSession } from "@/server/auth/session";
import { auditActions } from "@/server/audit/audit-events";
import { writeAuditEvent } from "@/server/audit/audit-service";

export async function POST(request: NextRequest): Promise<Response> {
  const current = await getOptionalAdminSession();
  const body = await request.json().catch(() => null);

  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ error: "Verification impossible." }, { status: 400 });
  }

  const auth = await getAuth();
  const forwardedRequest = new Request(new URL("/api/auth/two-factor/verify-totp", request.url), {
    body: JSON.stringify({
      code: body.code,
      trustDevice: false,
    }),
    headers: request.headers,
    method: "POST",
  });
  const response = await auth.handler(forwardedRequest);

  await writeAuditEvent({
    action: response.ok ? auditActions.totpEnabled : auditActions.totpVerificationFailed,
    actorUserId: current?.admin.id,
    outcome: response.ok ? "success" : "failure",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Verification impossible." }, { status: response.status });
  }

  const sanitizedResponse = NextResponse.json({ ok: true });
  copySetCookieHeaders(response, sanitizedResponse);

  return sanitizedResponse;
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
