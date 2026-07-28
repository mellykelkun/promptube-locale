#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  capture,
  decryptEncryptedFile,
  getOperationsPaths,
  listBackupManifests,
  pipeBufferToDocker,
  projectDir,
  readBackupKey,
  run,
  verifyManifestMac,
} from "./lib.mjs";

const projectName = "promptube_admin_restore_test";
const composeFile = path.join(projectDir, "compose.restore.yaml");
const requestedId = process.argv[2];
const key = await readBackupKey();
const paths = await getOperationsPaths();
const manifests = await listBackupManifests(paths.manifestDir);
const selected = requestedId
  ? manifests.find((entry) => entry.manifest.backupId === requestedId)
  : manifests.at(-1);

if (!selected) {
  throw new Error("No backup manifest found for restore test.");
}

verifyManifestMac(selected.manifest, key);
const encryptedPath = path.resolve(projectDir, selected.manifest.encryptedFile);
const plainArchive = await decryptEncryptedFile(encryptedPath, key);

const workDir = path.join(paths.restoreTestDir, `restore-${process.pid}-${Date.now()}`);
const secretsDir = path.join(workDir, "secrets");
const envFile = path.join(workDir, "restore.env");

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
const postgresPassword = randomBytes(32).toString("hex");
await writeFile(path.join(secretsDir, "postgres-password"), `${postgresPassword}\n`, {
  mode: 0o600,
});
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
    "restore_check",
  ]);

  await pipeBufferToDocker(
    plainArchive,
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
      "cat >/tmp/restore.dump && pg_restore --no-owner --no-privileges -U postgres -d restore_check /tmp/restore.dump && rm /tmp/restore.dump",
    ],
    "isolated PostgreSQL restore failed",
  );

  const tableCount = (
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
      "restore_check",
      "-Atqc",
      "select count(*) from information_schema.tables where table_schema='public' and table_name in ('user','account','session','verification','twoFactor','admin_audit_events')",
    ])
  ).trim();

  if (tableCount !== "6") {
    throw new Error("Restored schema does not contain all expected admin tables.");
  }

  const migrationCount = (
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
      "restore_check",
      "-Atqc",
      "select count(*) from drizzle.__drizzle_migrations",
    ])
  ).trim();

  if (Number(migrationCount) < 1) {
    throw new Error("Restored migration registry is empty.");
  }

  console.log(`Backup restored in isolated environment: ${selected.manifest.backupId}`);
} finally {
  await cleanup();
}
