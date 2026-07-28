#!/usr/bin/env node
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";

import { createPgClient, readSecretFile, requireEnv } from "./lib.mjs";
import { hash } from "@node-rs/argon2";

const password = await readSecretFile(requireEnv("POSTGRES_APP_PASSWORD_FILE"));
const client = await createPgClient({ password, user: requireEnv("POSTGRES_USER") });
const rl = createInterface({ input, output });

function validatePassword(value) {
  if (value.length < 14 || value.length > 128) {
    throw new Error("Password must be between 14 and 128 characters.");
  }
}

async function readPassword(prompt) {
  output.write(prompt);
  input.setRawMode?.(true);
  let value = "";
  for await (const chunk of input) {
    const char = chunk.toString("utf8");
    if (char === "\n" || char === "\r" || char === "\u0004") {
      output.write("\n");
      input.setRawMode?.(false);
      return value;
    }
    if (char === "\u0003") {
      process.exit(130);
    }
    if (char === "\u007f") {
      value = value.slice(0, -1);
      continue;
    }
    value += char;
  }
  return value;
}

try {
  const admins = await client.query("select 1 from \"user\" where role = 'admin' limit 1");
  if (admins.rowCount > 0) {
    throw new Error("An administrator already exists; bootstrap refused.");
  }

  const email = (await rl.question("Email administrateur: ")).trim().toLowerCase();
  const name = (await rl.question("Nom: ")).trim();
  const firstPassword = await readPassword("Mot de passe: ");
  const secondPassword = await readPassword("Confirmation: ");

  if (firstPassword !== secondPassword) {
    throw new Error("Password confirmation does not match.");
  }
  validatePassword(firstPassword);

  const now = new Date();
  const userId = randomUUID();
  const accountId = randomUUID();
  const auditId = randomUUID();
  const passwordHash = await hash(firstPassword, {
    algorithm: 2,
    memoryCost: 64 * 1024,
    parallelism: 1,
    timeCost: 3,
  });

  await client.query("begin");
  await client.query(
    `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, banned, "twoFactorEnabled")
     values ($1, $2, $3, true, $4, $4, 'admin', false, false)`,
    [userId, name, email, now],
  );
  await client.query(
    `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     values ($1, $2, 'credential', $3, $4, $5, $5)`,
    [accountId, userId, userId, passwordHash, now],
  );
  await client.query(
    `insert into admin_audit_events (id, actor_user_id, action, outcome, target_type, target_id, metadata, created_at)
     values ($1, $2, 'ADMIN_BOOTSTRAPPED', 'success', 'user', $2, '{}'::jsonb, $3)`,
    [auditId, userId, now],
  );
  await client.query("commit");
  console.log("First local administrator created. No session was created.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  rl.close();
  await client.end();
}
