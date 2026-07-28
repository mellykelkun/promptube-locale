#!/usr/bin/env node
import { randomUUID } from "node:crypto";

import { createPgClient, readSecretFile, requireEnv } from "./lib.mjs";

if (
  process.env.APP_ENV !== "test" &&
  process.env.ADMIN_REVOKE_ALL_SESSIONS_CONFIRM !== "revoke-all-admin-sessions"
) {
  throw new Error(
    "Refusing to revoke sessions without explicit confirmation. Set ADMIN_REVOKE_ALL_SESSIONS_CONFIRM=revoke-all-admin-sessions.",
  );
}

const password = await readSecretFile(requireEnv("POSTGRES_APP_PASSWORD_FILE"));
const client = await createPgClient({ password, user: requireEnv("POSTGRES_USER") });

try {
  await client.query("begin");
  const revoked = await client.query(
    `
      update "session"
      set "revokedAt" = coalesce("revokedAt", now()),
          "expiresAt" = least("expiresAt", now()),
          "updatedAt" = now()
      where "revokedAt" is null
    `,
  );
  await client.query(
    `
      insert into admin_audit_events (
        id,
        action,
        outcome,
        target_type,
        metadata
      )
      values ($1, 'ADMIN_SESSIONS_REVOKED_ALL', 'success', 'admin_sessions', $2::jsonb)
    `,
    [randomUUID(), JSON.stringify({ revokedSessions: revoked.rowCount ?? 0 })],
  );
  await client.query("commit");
  console.log("All local admin sessions were revoked.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
