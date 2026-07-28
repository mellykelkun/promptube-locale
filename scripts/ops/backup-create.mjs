#!/usr/bin/env node
import { spawn } from "node:child_process";
import { rename, stat } from "node:fs/promises";
import path from "node:path";

import {
  attachManifestMac,
  atomicWriteJson,
  backupIdNow,
  currentMigrationDigest,
  encryptReadableToFile,
  getOperationsPaths,
  projectDir,
  readBackupKey,
  relativeToProject,
  run,
  sha256Buffer,
} from "./lib.mjs";

const key = await readBackupKey();
const paths = await getOperationsPaths();
const backupId = backupIdNow("postgres");
const encryptedPath = path.join(paths.backupDir, `${backupId}.pgdump.aes256gcm`);
const manifestPath = path.join(paths.manifestDir, `${backupId}.json`);
const temporaryPath = `${encryptedPath}.tmp`;

await run("./scripts/docker-compose.sh", [
  "run",
  "--rm",
  "admin-promptube-db-migrate",
  "node",
  "scripts/ops/write-audit.mjs",
  "BACKUP_CREATED",
  "success",
  backupId,
]);

const dumpProcess = spawn(
  "./scripts/docker-compose.sh",
  [
    "exec",
    "-T",
    "admin-promptube-postgres",
    "sh",
    "-ec",
    'export PGPASSWORD="$(cat "$POSTGRES_BACKUP_PASSWORD_FILE")"; pg_dump -Fc --no-owner --no-privileges --username "$POSTGRES_BACKUP_USER" --dbname "$POSTGRES_DB"',
  ],
  {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let dumpError = "";
dumpProcess.stderr.setEncoding("utf8");
dumpProcess.stderr.on("data", (chunk) => {
  dumpError += chunk;
});

const dumpExit = new Promise((resolve, reject) => {
  dumpProcess.on("exit", resolve);
  dumpProcess.on("error", reject);
});

const crypto = await encryptReadableToFile(dumpProcess.stdout, temporaryPath, key, { backupId });
const exitCode = await dumpExit;

if (exitCode !== 0) {
  throw new Error(`pg_dump failed without exposing details. ${dumpError ? "See local logs." : ""}`);
}

await rename(temporaryPath, encryptedPath);
const encryptedBytes = await import("node:fs/promises").then(({ readFile }) =>
  readFile(encryptedPath),
);
const encryptedFile = await stat(encryptedPath);
const migrationDigest = await currentMigrationDigest();

const manifest = attachManifestMac(
  {
    application: "promptube-admin-locale",
    backupId,
    createdAtUtc: new Date().toISOString(),
    database: "promptube_admin",
    encryptedFile: relativeToProject(encryptedPath),
    encryption: {
      algorithm: crypto.algorithm,
      format: "PTBK1",
      tag: crypto.tag,
    },
    environment: "local",
    fileSha256: sha256Buffer(encryptedBytes),
    fileSizeBytes: encryptedFile.size,
    formatVersion: 1,
    manifestPath: relativeToProject(manifestPath),
    postgresFormat: "custom",
    postgresMajor: "18",
    schemaMigrationSha256: migrationDigest,
    verification: {
      status: "created",
    },
  },
  key,
);

await atomicWriteJson(manifestPath, manifest);

await run("node", ["scripts/ops/backup-verify.mjs", backupId], { stdio: "ignore" });
const verifiedManifest = attachManifestMac(
  {
    ...manifest,
    verification: {
      status: "verified",
      verifiedAtUtc: new Date().toISOString(),
    },
  },
  key,
);
await atomicWriteJson(manifestPath, verifiedManifest);
await run("./scripts/docker-compose.sh", [
  "run",
  "--rm",
  "admin-promptube-db-migrate",
  "node",
  "scripts/ops/write-audit.mjs",
  "BACKUP_VERIFIED",
  "success",
  backupId,
]);

console.log(`Encrypted backup created: ${backupId}`);
console.log(`Manifest: ${relativeToProject(manifestPath)}`);
console.log(`SHA-256: ${verifiedManifest.fileSha256}`);
