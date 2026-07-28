import { NextRequest, NextResponse } from "next/server";

import { normalizeAdminEmail } from "@/server/auth/email";
import { getAuth } from "@/server/auth/auth";
import { auditActions } from "@/server/audit/audit-events";
import { writeAuditEvent } from "@/server/audit/audit-service";

const genericLoginError = "identifiants invalides ou connexion impossible";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: genericLoginError }, { status: 400 });
  }

  const auth = await getAuth();
  const email = normalizeAdminEmail(body.email);
  const forwardedRequest = new Request(new URL("/api/auth/sign-in/email", request.url), {
    body: JSON.stringify({
      email,
      password: body.password,
    }),
    headers: request.headers,
    method: "POST",
  });

  const response = await auth.handler(forwardedRequest);
  const responseBody = await response
    .clone()
    .json()
    .catch(() => null);

  if (!response.ok) {
    await writeAuditEvent({
      action: response.status === 429 ? auditActions.loginRateLimited : auditActions.loginFailed,
      metadata: { emailHash: await hashEmailForAudit(email) },
      outcome: "failure",
    });

    return NextResponse.json({ error: genericLoginError }, { status: response.status });
  }

  await writeAuditEvent({
    action: auditActions.loginSucceeded,
    metadata: { requiresTwoFactor: Boolean(responseBody?.twoFactorRedirect) },
    outcome: "success",
  });

  const sanitizedResponse = NextResponse.json({
    ok: true,
    twoFactorRedirect: Boolean(responseBody?.twoFactorRedirect),
  });
  copySetCookieHeaders(response, sanitizedResponse);

  return sanitizedResponse;
}

async function hashEmailForAudit(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function copySetCookieHeaders(source: Response, target: NextResponse): void {
  const headersWithSetCookie = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const getSetCookie = headersWithSetCookie.getSetCookie?.() ?? [];

  if (getSetCookie.length > 0) {
    for (const cookie of getSetCookie) {
      target.headers.append("set-cookie", cookie);
    }
    return;
  }

  const cookie = source.headers.get("set-cookie");
  if (cookie) {
    target.headers.append("set-cookie", cookie);
  }
}
