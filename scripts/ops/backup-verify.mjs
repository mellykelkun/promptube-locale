#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  assertPgRestoreCanList,
  decryptEncryptedFile,
  getOperationsPaths,
  listBackupManifests,
  projectDir,
  readBackupKey,
  sha256Buffer,
  verifyManifestMac,
} from "./lib.mjs";

const requestedId = process.argv[2];
const key = await readBackupKey();
const paths = await getOperationsPaths();
const manifests = await listBackupManifests(paths.manifestDir);

const selected = requestedId
  ? manifests.find((entry) => entry.manifest.backupId === requestedId)
  : manifests.at(-1);

if (!selected) {
  throw new Error("No backup manifest found.");
}

verifyManifestMac(selected.manifest, key);
const encryptedPath = path.resolve(projectDir, selected.manifest.encryptedFile);
const encrypted = await readFile(encryptedPath);
if (sha256Buffer(encrypted) !== selected.manifest.fileSha256) {
  throw new Error("Encrypted backup SHA-256 verification failed.");
}
const encryptedStats = await stat(encryptedPath);
if (encryptedStats.size !== selected.manifest.fileSizeBytes) {
  throw new Error("Encrypted backup size verification failed.");
}
const plainArchive = await decryptEncryptedFile(encryptedPath, key);
await assertPgRestoreCanList(plainArchive);

console.log(`Backup verified: ${selected.manifest.backupId}`);
console.log(`SHA-256: ${selected.manifest.fileSha256}`);
