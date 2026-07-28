#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { createPgClient, projectDir, quoteIdentifier, readSecretFile, requireEnv } from "./lib.mjs";

const migrationPassword = await readSecretFile(requireEnv("POSTGRES_MIGRATION_PASSWORD_FILE"));
const migrationUser = requireEnv("POSTGRES_MIGRATION_USER");
const appUser = requireEnv("POSTGRES_APP_USER");
const backupUser = requireEnv("POSTGRES_BACKUP_USER");
const migrationsDirectory = path.join(projectDir, "drizzle");
const initialMigrationFile = "0000_init_admin_identity.sql";
const initialMigrationTables = [
  "account",
  "admin_audit_events",
  "session",
  "twoFactor",
  "user",
  "verification",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const client = await createPgClient({ password: migrationPassword, user: migrationUser });

async function hasMaterializedInitialMigration() {
  const existingMigrations = await client.query(
    "select 1 from drizzle.__drizzle_migrations limit 1",
  );
  if (existingMigrations.rowCount === 0) {
    return false;
  }

  const result = await client.query(
    `
      select count(*)::int as table_count
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [initialMigrationTables],
  );

  return result.rows[0]?.table_count === initialMigrationTables.length;
}

try {
  await client.query("begin");
  await client.query("create schema if not exists drizzle");
  await client.query(`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => /^[0-9].*\.sql$/.test(file))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sql = await readFile(path.join(migrationsDirectory, migrationFile), "utf8");
    const hash = sha256(sql);
    const existing = await client.query(
      "select 1 from drizzle.__drizzle_migrations where hash = $1 limit 1",
      [hash],
    );

    if (existing.rowCount > 0) {
      continue;
    }

    if (migrationFile === initialMigrationFile && (await hasMaterializedInitialMigration())) {
      continue;
    }

    await client.query(sql);
    await client.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)",
      [hash, Date.now()],
    );
  }

  await client.query(`grant usage on schema public to ${quoteIdentifier(appUser)}`);
  await client.query(
    `grant select, insert, update, delete on all tables in schema public to ${quoteIdentifier(appUser)}`,
  );
  await client.query(
    `grant usage, select, update on all sequences in schema public to ${quoteIdentifier(appUser)}`,
  );
  await client.query(`grant usage on schema public to ${quoteIdentifier(backupUser)}`);
  await client.query(`grant usage on schema drizzle to ${quoteIdentifier(backupUser)}`);
  await client.query(
    `grant select on all tables in schema public to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `grant select on all sequences in schema public to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `grant select on all tables in schema drizzle to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `grant select on all sequences in schema drizzle to ${quoteIdentifier(backupUser)}`,
  );
  await client.query("commit");
  console.log("Database migrations applied and runtime grants refreshed.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
