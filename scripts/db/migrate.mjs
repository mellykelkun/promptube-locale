#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { createPgClient, projectDir, quoteIdentifier, readSecretFile, requireEnv } from "./lib.mjs";

const migrationPassword = await readSecretFile(requireEnv("POSTGRES_MIGRATION_PASSWORD_FILE"));
const migrationUser = requireEnv("POSTGRES_MIGRATION_USER");
const appUser = requireEnv("POSTGRES_APP_USER");
const migrationsDirectory = path.join(projectDir, "drizzle");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const client = await createPgClient({ password: migrationPassword, user: migrationUser });

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
  await client.query("commit");
  console.log("Database migrations applied and runtime grants refreshed.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
