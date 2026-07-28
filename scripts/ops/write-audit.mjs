#!/usr/bin/env node
import { randomUUID } from "node:crypto";

import { createPgClient, readSecretFile, requireEnv } from "../db/lib.mjs";

const [action, outcome = "success", targetId = null] = process.argv.slice(2);
const allowedActions = new Set([
  "BACKUP_CREATED",
  "BACKUP_VERIFIED",
  "RESTORE_TEST_SUCCEEDED",
  "RESTORE_TEST_FAILED",
  "SECRET_ROTATION_STARTED",
  "SECRET_ROTATION_SUCCEEDED",
  "SECRET_ROTATION_FAILED",
]);

if (!allowedActions.has(action)) {
  throw new Error("Unsupported operational audit action.");
}

const password = await readSecretFile(requireEnv("POSTGRES_MIGRATION_PASSWORD_FILE"));
const client = await createPgClient({ password, user: requireEnv("POSTGRES_MIGRATION_USER") });

try {
  await client.query(
    `insert into admin_audit_events (
      id, action, outcome, target_type, target_id, metadata
    ) values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      randomUUID(),
      action,
      outcome,
      "operational-task",
      targetId,
      JSON.stringify({
        source: "local-ops-script",
      }),
    ],
  );
} finally {
  await client.end();
}
