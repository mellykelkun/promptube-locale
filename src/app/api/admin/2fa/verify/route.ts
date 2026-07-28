import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "@/server/auth/auth";
import { getOptionalAdminSession } from "@/server/auth/session";
import { auditActions } from "@/server/audit/audit-events";
import { writeAuditEvent } from "@/server/audit/audit-service";

export function GET(): Response {
  return NextResponse.json(
    { error: "Methode non autorisee." },
    {
      headers: {
        Allow: "POST",
      },
      status: 405,
    },
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const current = await getOptionalAdminSession();
  const body = await request.json().catch(() => null);

  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ error: "Verification impossible." }, { status: 400 });
  }

  const auth = await getAuth();
  const normalizedCode = body.code.trim();
  const endpoint = /^[0-9]{6}$/.test(normalizedCode)
    ? "/api/auth/two-factor/verify-totp"
    : "/api/auth/two-factor/verify-backup-code";
  const forwardedRequest = new Request(new URL(endpoint, request.url), {
    body: JSON.stringify({
      code: normalizedCode,
      trustDevice: false,
    }),
    headers: request.headers,
    method: "POST",
  });
  const response = await auth.handler(forwardedRequest);
  const responseBody = await response
    .clone()
    .json()
    .catch(() => null);
  const actorUserId = current?.admin.id ?? responseBody?.user?.id ?? null;

  if (!response.ok || current) {
    await writeAuditEvent({
      action: response.ok ? auditActions.totpEnabled : auditActions.totpVerificationFailed,
      actorUserId,
      outcome: response.ok ? "success" : "failure",
    });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Verification impossible." }, { status: response.status });
  }

  await writeAuditEvent({
    action: auditActions.sessionCreated,
    actorUserId,
    outcome: "success",
  });

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
