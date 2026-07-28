import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

import { getAuth } from "@/server/auth/auth";
import { requireAdminSession } from "@/server/auth/session";
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
  const current = await requireAdminSession();
  const body = await request.json().catch(() => null);

  if (!body || typeof body.password !== "string") {
    return NextResponse.json({ error: "Verification impossible." }, { status: 400 });
  }

  const auth = await getAuth();
  const result = await auth.api.enableTwoFactor({
    body: {
      issuer: "Promptube Admin",
      password: body.password,
    },
    headers: await headers(),
  });

  await writeAuditEvent({
    action: auditActions.totpSetupStarted,
    actorUserId: current.admin.id,
    outcome: "success",
  });

  const qrCodeDataUrl = await QRCode.toDataURL(result.totpURI, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 4,
  });

  return NextResponse.json({
    backupCodes: result.backupCodes,
    qrCodeDataUrl,
    totpURI: result.totpURI,
  });
}
