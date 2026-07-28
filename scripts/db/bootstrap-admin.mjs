#!/usr/bin/env node
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";

import { createPgClient, readSecretFile, requireEnv } from "./lib.mjs";
import { hash } from "@node-rs/argon2";

const password = await readSecretFile(requireEnv("POSTGRES_APP_PASSWORD_FILE"));
const client = await createPgClient({ password, user: requireEnv("POSTGRES_USER") });

function validatePassword(value) {
  if (value.length < 14 || value.length > 128) {
    throw new Error("Password must be between 14 and 128 characters.");
  }
}

async function readLine(prompt) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

async function readPassword(prompt) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Interactive password input requires a TTY.");
  }

  output.write(prompt);

  return await new Promise((resolve, reject) => {
    let value = "";
    let settled = false;

    function cleanup() {
      input.off("data", onData);
      input.off("error", onError);
      output.write("\n");
      input.setRawMode(false);
      input.pause();
    }

    function settle(callback) {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      callback();
    }

    function onError(error) {
      settle(() => reject(error));
    }

    function onData(chunk) {
      for (const char of chunk.toString("utf8")) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          settle(() => resolve(value));
          return;
        }

        if (char === "\u0003") {
          settle(() => reject(new Error("Interrupted.")));
          return;
        }

        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }

        value += char;
      }
    }

    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
    input.once("error", onError);
  });
}

async function readBootstrapInput() {
  if (process.env.ADMIN_BOOTSTRAP_PASSWORD_FILE) {
    if (process.env.APP_ENV !== "test") {
      throw new Error("Non-interactive admin bootstrap is restricted to APP_ENV=test.");
    }

    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim();
    const secretPassword = await readSecretFile(process.env.ADMIN_BOOTSTRAP_PASSWORD_FILE);

    if (!email || !name) {
      throw new Error("Missing non-interactive bootstrap identity.");
    }

    return {
      email,
      name,
      password: secretPassword,
    };
  }

  const email = (await readLine("Email administrateur: ")).trim().toLowerCase();
  const name = (await readLine("Nom: ")).trim();
  const firstPassword = await readPassword("Mot de passe: ");
  const secondPassword = await readPassword("Confirmation: ");

  if (firstPassword !== secondPassword) {
    throw new Error("Password confirmation does not match.");
  }

  return {
    email,
    name,
    password: firstPassword,
  };
}

try {
  const admins = await client.query("select 1 from \"user\" where role = 'admin' limit 1");
  if (admins.rowCount > 0) {
    throw new Error("An administrator already exists; bootstrap refused.");
  }

  const bootstrapInput = await readBootstrapInput();
  validatePassword(bootstrapInput.password);

  const now = new Date();
  const userId = randomUUID();
  const accountId = randomUUID();
  const auditId = randomUUID();
  const passwordHash = await hash(bootstrapInput.password, {
    algorithm: 2,
    memoryCost: 64 * 1024,
    parallelism: 1,
    timeCost: 3,
  });

  await client.query("begin");
  await client.query(
    `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, banned, "twoFactorEnabled")
     values ($1, $2, $3, true, $4, $4, 'admin', false, false)`,
    [userId, bootstrapInput.name, bootstrapInput.email, now],
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
  await client.end();
}
