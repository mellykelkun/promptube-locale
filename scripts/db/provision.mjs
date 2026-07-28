#!/usr/bin/env node
import {
  createPgClient,
  quoteIdentifier,
  quoteLiteral,
  readSecretFile,
  requireEnv,
} from "./lib.mjs";

const bootstrapPassword = await readSecretFile(requireEnv("POSTGRES_BOOTSTRAP_PASSWORD_FILE"));
const appPassword = await readSecretFile(requireEnv("POSTGRES_APP_PASSWORD_FILE"));
const migrationPassword = await readSecretFile(requireEnv("POSTGRES_MIGRATION_PASSWORD_FILE"));
const backupPassword = await readSecretFile(requireEnv("POSTGRES_BACKUP_PASSWORD_FILE"));

const bootstrapUser = requireEnv("POSTGRES_BOOTSTRAP_USER");
const appUser = requireEnv("POSTGRES_APP_USER");
const migrationUser = requireEnv("POSTGRES_MIGRATION_USER");
const backupUser = requireEnv("POSTGRES_BACKUP_USER");

const client = await createPgClient({ password: bootstrapPassword, user: bootstrapUser });

async function ensureLoginRole(roleName, password) {
  const role = await client.query("select 1 from pg_roles where rolname = $1", [roleName]);
  if (role.rowCount === 0) {
    await client.query(
      `create role ${quoteIdentifier(roleName)} login password ${quoteLiteral(password)}`,
    );
  } else {
    await client.query(
      `alter role ${quoteIdentifier(roleName)} login password ${quoteLiteral(password)}`,
    );
  }

  await client.query(
    `alter role ${quoteIdentifier(roleName)} nosuperuser nocreatedb nocreaterole noinherit`,
  );
}

try {
  await client.query("begin");
  await ensureLoginRole(migrationUser, migrationPassword);
  await ensureLoginRole(appUser, appPassword);
  await ensureLoginRole(backupUser, backupPassword);
  await client.query(
    `grant connect on database ${quoteIdentifier(requireEnv("POSTGRES_DB"))} to ${quoteIdentifier(migrationUser)}`,
  );
  await client.query(
    `grant connect on database ${quoteIdentifier(requireEnv("POSTGRES_DB"))} to ${quoteIdentifier(appUser)}`,
  );
  await client.query(
    `grant connect on database ${quoteIdentifier(requireEnv("POSTGRES_DB"))} to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `grant create on database ${quoteIdentifier(requireEnv("POSTGRES_DB"))} to ${quoteIdentifier(migrationUser)}`,
  );
  await client.query(
    `create schema if not exists drizzle authorization ${quoteIdentifier(migrationUser)}`,
  );
  await client.query(`alter schema public owner to ${quoteIdentifier(migrationUser)}`);
  await client.query(`grant usage on schema public to ${quoteIdentifier(appUser)}`);
  await client.query(`grant usage on schema public to ${quoteIdentifier(backupUser)}`);
  await client.query(`grant usage on schema drizzle to ${quoteIdentifier(migrationUser)}`);
  await client.query(`grant usage on schema drizzle to ${quoteIdentifier(backupUser)}`);
  await client.query(
    `alter default privileges for role ${quoteIdentifier(migrationUser)} in schema public grant select, insert, update, delete on tables to ${quoteIdentifier(appUser)}`,
  );
  await client.query(
    `alter default privileges for role ${quoteIdentifier(migrationUser)} in schema public grant usage, select, update on sequences to ${quoteIdentifier(appUser)}`,
  );
  await client.query(
    `alter default privileges for role ${quoteIdentifier(migrationUser)} in schema public grant select on tables to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `alter default privileges for role ${quoteIdentifier(migrationUser)} in schema public grant select on sequences to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `alter default privileges for role ${quoteIdentifier(migrationUser)} in schema drizzle grant select on tables to ${quoteIdentifier(backupUser)}`,
  );
  await client.query(
    `alter default privileges for role ${quoteIdentifier(migrationUser)} in schema drizzle grant select on sequences to ${quoteIdentifier(backupUser)}`,
  );
  await client.query("commit");
  console.log("PostgreSQL admin roles provisioned.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
