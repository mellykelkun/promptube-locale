#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  capture,
  captureBuffer,
  decryptEncryptedFile,
  encryptReadableToFile,
  getOperationsPaths,
  pipeBufferToDocker,
  projectDir,
  readBackupKey,
  sha256Buffer,
  run,
} from "./lib.mjs";

const projectName = "promptube_admin_restore_test";
const composeFile = path.join(projectDir, "compose.restore.yaml");
const paths = await getOperationsPaths();
const workDir = path.join(paths.restoreTestDir, `dr-${process.pid}-${Date.now()}`);
const secretsDir = path.join(workDir, "secrets");
const envFile = path.join(workDir, "restore.env");
const keyPath = path.join(secretsDir, "backup-encryption-key");

async function cleanup() {
  await run(
    "docker",
    [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      envFile,
      "--file",
      composeFile,
      "down",
    ],
    { stdio: "ignore" },
  ).catch(() => undefined);
  await rm(workDir, { force: true, recursive: true }).catch(() => undefined);
}

await mkdir(secretsDir, { mode: 0o700, recursive: true });
await writeFile(
  path.join(secretsDir, "postgres-password"),
  `${randomBytes(32).toString("hex")}\n`,
  {
    mode: 0o600,
  },
);
await writeFile(keyPath, `${randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
await writeFile(envFile, `RESTORE_TEST_SECRETS_DIR=${secretsDir}\n`, { mode: 0o600 });

try {
  await run("docker", [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "up",
    "-d",
    "--wait",
    "--wait-timeout",
    "120",
    "admin-restore-postgres",
  ]);

  await capture("docker", [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "exec",
    "-T",
    "admin-restore-postgres",
    "createdb",
    "-U",
    "postgres",
    "source_check",
  ]);
  await pipeBufferToDocker(
    Buffer.from(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(path.join(projectDir, "drizzle", "0000_init_admin_identity.sql")),
      ),
    ),
    [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      envFile,
      "--file",
      composeFile,
      "exec",
      "-T",
      "admin-restore-postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "source_check",
    ],
    "migration apply failed",
  );
  await capture("docker", [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "exec",
    "-T",
    "admin-restore-postgres",
    "psql",
    "-U",
    "postgres",
    "-d",
    "source_check",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `create schema if not exists drizzle;
     create table if not exists drizzle.__drizzle_migrations (
       id serial primary key,
       hash text not null,
       created_at bigint
     );
     insert into drizzle.__drizzle_migrations (hash, created_at)
       values ('0000_init_admin_identity', extract(epoch from now())::bigint);`,
  ]);
  await capture("docker", [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "exec",
    "-T",
    "admin-restore-postgres",
    "psql",
    "-U",
    "postgres",
    "-d",
    "source_check",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `insert into "user" ("id","name","email","emailVerified","role","twoFactorEnabled") values ('test-admin','Test Admin','ops-test@example.invalid',true,'admin',true);
     insert into "session" ("id","token","expiresAt","userId") values ('test-session','test-token',now() + interval '1 hour','test-admin');
     insert into "twoFactor" ("id","secret","backupCodes","userId") values ('test-2fa','test-secret','test-backup','test-admin');
     insert into admin_audit_events (id, action, outcome, actor_user_id, metadata) values ('test-audit','DR_TEST','success','test-admin','{}'::jsonb);`,
  ]);

  const dump = await captureBuffer("docker", [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "exec",
    "-T",
    "admin-restore-postgres",
    "pg_dump",
    "-Fc",
    "--no-owner",
    "--no-privileges",
    "-U",
    "postgres",
    "source_check",
  ]);
  const key = await readBackupKey(keyPath);
  const encryptedPath = path.join(workDir, "dr-test.pgdump.aes256gcm");
  const source = await import("node:stream").then(({ Readable }) => Readable.from(dump));
  await encryptReadableToFile(source, encryptedPath, key, { test: "disaster-recovery" });
  const encrypted = await import("node:fs/promises").then(({ readFile }) =>
    readFile(encryptedPath),
  );
  if (!sha256Buffer(encrypted)) {
    throw new Error("DR encrypted backup digest failed.");
  }
  const plain = await decryptEncryptedFile(encryptedPath, key);
  await capture("docker", [
    "compose",
    "--project-name",
    projectName,
    "--env-file",
    envFile,
    "--file",
    composeFile,
    "exec",
    "-T",
    "admin-restore-postgres",
    "createdb",
    "-U",
    "postgres",
    "restored_check",
  ]);
  await pipeBufferToDocker(
    plain,
    [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      envFile,
      "--file",
      composeFile,
      "exec",
      "-T",
      "admin-restore-postgres",
      "sh",
      "-ec",
      "cat >/tmp/dr.dump && pg_restore --no-owner --no-privileges -U postgres -d restored_check /tmp/dr.dump && rm /tmp/dr.dump",
    ],
    "DR restore failed",
  );
  const count = (
    await capture("docker", [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      envFile,
      "--file",
      composeFile,
      "exec",
      "-T",
      "admin-restore-postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "restored_check",
      "-Atqc",
      `select count(*) from "user" where id='test-admin'`,
    ])
  ).trim();
  if (count !== "1") {
    throw new Error("DR restored data check failed.");
  }
  console.log("Disaster recovery test succeeded with encrypted backup and isolated restore.");
} finally {
  await cleanup();
}
