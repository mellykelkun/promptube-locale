#!/usr/bin/env node
import { createPgClient, readSecretFile, requireEnv } from "./lib.mjs";

const password = await readSecretFile(requireEnv("POSTGRES_MIGRATION_PASSWORD_FILE"));
const client = await createPgClient({ password, user: requireEnv("POSTGRES_MIGRATION_USER") });

try {
  const result = await client.query(
    "select id, hash, created_at from drizzle.__drizzle_migrations order by created_at asc",
  );
  console.log(`Applied migrations: ${result.rowCount}`);
  for (const row of result.rows) {
    const createdAt =
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
    console.log(`${row.id} ${row.hash} ${createdAt}`);
  }
} finally {
  await client.end();
}
