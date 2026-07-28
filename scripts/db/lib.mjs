import { readFile, chmod, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

export const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function readSecretFile(secretPath) {
  const value = await readFile(secretPath, "utf8");
  const normalized = value.replace(/\r?\n$/, "");
  if (!normalized) {
    throw new Error("Required secret file is empty.");
  }
  return normalized;
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error("Unsafe SQL identifier.");
  }
  return `"${identifier}"`;
}

export function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export async function createPgClient({ password, user }) {
  const client = new pg.Client({
    connectionTimeoutMillis: 5_000,
    database: requireEnv("POSTGRES_DB"),
    host: requireEnv("POSTGRES_HOST"),
    password,
    port: Number(process.env.POSTGRES_PORT ?? "5432"),
    query_timeout: 10_000,
    user,
  });
  await client.connect();
  return client;
}

export async function ensureBackupDirectory() {
  const backupDir = path.join(projectDir, "backups");
  await mkdir(backupDir, { mode: 0o700, recursive: true });
  await chmod(backupDir, 0o700);
  return backupDir;
}

export async function writePrivateFile(filePath, data) {
  await writeFile(filePath, data, { mode: 0o600 });
  await chmod(filePath, 0o600);
}

export function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectDir,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}
