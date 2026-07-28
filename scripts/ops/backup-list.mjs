#!/usr/bin/env node
import { getOperationsPaths, listBackupManifests } from "./lib.mjs";

const paths = await getOperationsPaths();
const manifests = await listBackupManifests(paths.manifestDir);

if (manifests.length === 0) {
  console.log("No encrypted PostgreSQL backup manifest found.");
} else {
  for (const { manifest } of manifests) {
    console.log(
      [
        manifest.backupId,
        manifest.createdAtUtc,
        `${manifest.fileSizeBytes}B`,
        manifest.schemaMigrationSha256.slice(0, 12),
        manifest.verification?.status ?? "unknown",
      ].join(" "),
    );
  }
}
