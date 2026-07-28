#!/usr/bin/env node
import { lstat, rm, stat } from "node:fs/promises";
import path from "node:path";

import { getOperationsPaths, listBackupManifests, projectDir } from "./lib.mjs";

const mode = process.argv[2] ?? "dry-run";
if (!["dry-run", "apply"].includes(mode)) {
  throw new Error("Usage: node scripts/ops/retention.mjs dry-run|apply");
}

const paths = await getOperationsPaths();
const manifests = await listBackupManifests(paths.manifestDir);
const sorted = manifests.sort(
  (a, b) =>
    new Date(b.manifest.createdAtUtc).getTime() - new Date(a.manifest.createdAtUtc).getTime(),
);

const keep = new Set();
for (const entry of sorted.slice(0, 7)) {
  keep.add(entry.manifest.backupId);
}

const weekBuckets = new Set();
const monthBuckets = new Set();
for (const entry of sorted) {
  const date = new Date(entry.manifest.createdAtUtc);
  const week = `${date.getUTCFullYear()}-W${Math.ceil((date.getUTCDate() + new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).getUTCDay()) / 7)}`;
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  if (weekBuckets.size < 4 && !weekBuckets.has(week)) {
    weekBuckets.add(week);
    keep.add(entry.manifest.backupId);
  }
  if (monthBuckets.size < 6 && !monthBuckets.has(month)) {
    monthBuckets.add(month);
    keep.add(entry.manifest.backupId);
  }
}

if (sorted.length > 0) {
  keep.add(sorted[0].manifest.backupId);
}

const candidates = sorted.filter((entry) => !keep.has(entry.manifest.backupId));
console.log(`Retention candidates: ${candidates.length}`);
for (const candidate of candidates) {
  console.log(`${mode === "apply" ? "delete" : "would-delete"} ${candidate.manifest.backupId}`);
}

if (mode === "apply") {
  if (process.env.PROMPTUBE_RETENTION_CONFIRM !== "delete-expired-backups") {
    throw new Error("Retention apply requires PROMPTUBE_RETENTION_CONFIRM=delete-expired-backups.");
  }
  for (const candidate of candidates) {
    const encryptedPath = path.resolve(projectDir, candidate.manifest.encryptedFile);
    const manifestPath = candidate.filePath;
    for (const target of [encryptedPath, manifestPath]) {
      const resolved = path.resolve(target);
      if (!resolved.startsWith(`${paths.baseDir}${path.sep}`)) {
        throw new Error("Retention refused to delete outside the configured backup directory.");
      }
      const linkEntry = await lstat(resolved);
      if (linkEntry.isSymbolicLink()) {
        throw new Error("Retention refused to delete a symbolic link.");
      }
      const entry = await stat(resolved);
      if (!entry.isFile()) {
        throw new Error("Retention refused to delete a non-regular file.");
      }
      await rm(resolved);
    }
  }
}
