#!/usr/bin/env node
import { stat } from "node:fs/promises";
import path from "node:path";

import {
  capture,
  getOperationsPaths,
  listBackupManifests,
  projectDir,
  pathExists,
} from "./lib.mjs";

const secretNames = [
  "postgres-password",
  "postgres-app-password",
  "postgres-migration-password",
  "postgres-backup-password",
  "redis-password",
  "better-auth-secret",
  "backup-encryption-key",
];

const branch = (await capture("git", ["branch", "--show-current"])).trim();
const dirty = (await capture("git", ["status", "--short"])).trim();
const paths = await getOperationsPaths();
const manifests = await listBackupManifests(paths.manifestDir);
const latest = manifests.at(-1)?.manifest;

console.log(`branch=${branch}`);
console.log(`gitClean=${dirty.length === 0 ? "yes" : "no"}`);
for (const name of secretNames) {
  const filePath = path.join(projectDir, "secrets", name);
  if (!(await pathExists(filePath))) {
    console.log(`secret.${name}=missing`);
    continue;
  }
  const mode = ((await stat(filePath)).mode & 0o777).toString(8);
  console.log(`secret.${name}=present mode=${mode}`);
}
console.log(`backupDir=${path.relative(projectDir, paths.backupDir)}`);
console.log(`latestBackup=${latest ? latest.backupId : "none"}`);
console.log(`latestBackupSha256=${latest ? latest.fileSha256.slice(0, 12) : "none"}`);
console.log(
  `composeProjects=${(await capture("docker", ["compose", "ls", "--format", "json"])).trim() || "[]"}`,
);
console.log(
  `volumes=${(await capture("docker", ["volume", "ls", "--format", "{{.Name}}"]))
    .split("\n")
    .filter((line) => line.startsWith("promptube_admin_"))
    .join(",")}`,
);
console.log(
  `disk=${(await capture("df", ["-h", paths.baseDir])).split("\n").at(1)?.trim() ?? "unknown"}`,
);
