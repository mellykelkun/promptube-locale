#!/usr/bin/env node
import { stat } from "node:fs/promises";
import path from "node:path";

import { pathExists, projectDir } from "./lib.mjs";

const inventory = [
  [
    "better-auth-secret",
    "Better Auth cookie/session signing; rotate with controlled downtime and session revocation.",
  ],
  [
    "postgres-app-password",
    "Next.js runtime PostgreSQL role; rotate role and file atomically, then restart app.",
  ],
  [
    "postgres-migration-password",
    "Migration role; rotate role and file, then validate db:status/db:migrate.",
  ],
  [
    "postgres-backup-password",
    "Read-only backup role; rotate role and file, then validate backup:create/verify.",
  ],
  [
    "redis-password",
    "Redis authentication; rotate the file atomically, recreate Redis with the volume preserved, then validate rate limiting.",
  ],
  [
    "backup-encryption-key",
    "PostgreSQL backup encryption; old key must remain available for old backups.",
  ],
];

for (const [name, impact] of inventory) {
  const filePath = path.join(projectDir, "secrets", name);
  if (!(await pathExists(filePath))) {
    console.log(`${name}: missing — ${impact}`);
    continue;
  }
  const entry = await stat(filePath);
  const mode = (entry.mode & 0o777).toString(8);
  console.log(`${name}: present mode=${mode} — ${impact}`);
}
