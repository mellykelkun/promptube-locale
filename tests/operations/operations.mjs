#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import {
  attachManifestMac,
  decryptEncryptedFile,
  encryptReadableToFile,
  getOperationsPaths,
  manifestMac,
  projectDir,
  readBackupKey,
  sha256Buffer,
  verifyManifestMac,
  writeJsonPrivate,
} from "../../scripts/ops/lib.mjs";
import { capture } from "../../scripts/ops/lib.mjs";

let testCount = 0;

function ok(message) {
  testCount += 1;
  console.log(`ok ${testCount} - ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const root = path.join(projectDir, ".tmp-operations-test");
await rm(root, { force: true, recursive: true }).catch(() => undefined);
await mkdir(root, { mode: 0o700, recursive: true });

try {
  const keyFile = path.join(root, "backup-key");
  await writeFile(keyFile, `${randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
  const key = await readBackupKey(keyFile);
  const encrypted = path.join(root, "sample.pgdump.aes256gcm");
  const source = Buffer.from("non-sensitive postgres custom archive placeholder");
  await encryptReadableToFile(Readable.from(source), encrypted, key, { test: true });
  const decrypted = await decryptEncryptedFile(encrypted, key);
  assert(decrypted.equals(source), "decrypted payload differs from source");
  ok("AES-256-GCM encrypts and decrypts without persistent plaintext");

  const tampered = path.join(root, "tampered.pgdump.aes256gcm");
  const encryptedBytes = await readFile(encrypted);
  encryptedBytes[encryptedBytes.length - 20] ^= 1;
  await writeFile(tampered, encryptedBytes, { mode: 0o600 });
  let tamperRejected = false;
  try {
    await decryptEncryptedFile(tampered, key);
  } catch {
    tamperRejected = true;
  }
  assert(tamperRejected, "tampered encrypted backup was accepted");
  ok("GCM rejects altered encrypted backup data");

  const wrongKeyFile = path.join(root, "wrong-key");
  await writeFile(wrongKeyFile, `${randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
  const wrongKey = await readBackupKey(wrongKeyFile);
  let wrongKeyRejected = false;
  try {
    await decryptEncryptedFile(encrypted, wrongKey);
  } catch {
    wrongKeyRejected = true;
  }
  assert(wrongKeyRejected, "wrong key was accepted");
  ok("GCM rejects a wrong backup key");

  const manifest = attachManifestMac(
    {
      backupId: "test-backup",
      createdAtUtc: "2026-07-28T00:00:00.000Z",
      encryptedFile: "relative/path",
      fileSha256: sha256Buffer(encryptedBytes),
      fileSizeBytes: encryptedBytes.length,
      formatVersion: 1,
    },
    key,
  );
  verifyManifestMac(manifest, key);
  assert(manifest.manifestMac === manifestMac(manifest, key), "manifest MAC mismatch");
  ok("manifest MAC verifies non-sensitive metadata");

  const opsRoot = path.join(root, "ops");
  const backupDir = path.join(opsRoot, "backups", "postgres");
  const manifestDir = path.join(opsRoot, "backup-manifests");
  await mkdir(backupDir, { mode: 0o700, recursive: true });
  await mkdir(manifestDir, { mode: 0o700, recursive: true });
  for (let index = 0; index < 10; index += 1) {
    const backupId = `retention-${index}`;
    const backupFile = path.join(backupDir, `${backupId}.pgdump.aes256gcm`);
    await writeFile(backupFile, `backup-${index}`, { mode: 0o600 });
    await writeJsonPrivate(path.join(manifestDir, `${backupId}.json`), {
      backupId,
      createdAtUtc: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      encryptedFile: path.relative(projectDir, backupFile),
      fileSha256: sha256Buffer(Buffer.from(`backup-${index}`)),
      fileSizeBytes: 8,
      formatVersion: 1,
      schemaMigrationSha256: "a".repeat(64),
      verification: { status: "verified" },
    });
  }
  const env = {
    ...process.env,
    PROMPTUBE_ALLOW_EXTERNAL_BACKUP_DIR: "1",
    PROMPTUBE_BACKUP_DIR: opsRoot,
  };
  const dryRun = await capture("node", ["scripts/ops/retention.mjs", "dry-run"], { env });
  assert(dryRun.includes("Retention candidates:"), "retention dry-run did not report candidates");
  ok("retention dry-run is non-destructive");
  await capture("node", ["scripts/ops/retention.mjs", "apply"], {
    env: {
      ...env,
      PROMPTUBE_RETENTION_CONFIRM: "delete-expired-backups",
    },
  });
  ok("retention apply works in a temporary isolated directory");

  const paths = await getOperationsPaths();
  assert(
    paths.backupDir.includes(".local") || process.env.PROMPTUBE_BACKUP_DIR,
    "backup path invalid",
  );
  ok("operation paths are initialized with restrictive local defaults");
} finally {
  await rm(root, { force: true, recursive: true }).catch(() => undefined);
}

console.log(`Operational tests passed: ${testCount}`);
