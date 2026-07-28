#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { projectDir } from "./lib.mjs";

const drizzleDir = path.join(projectDir, "drizzle");
const entries = await readdir(drizzleDir, { withFileTypes: true }).catch(() => []);
const sqlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => path.join(drizzleDir, entry.name));

if (sqlFiles.length === 0) {
  throw new Error("No SQL migration file found.");
}

for (const file of sqlFiles) {
  const sql = await readFile(file, "utf8");
  if (/\b(drop|truncate)\b/i.test(sql)) {
    throw new Error(`Forbidden destructive SQL statement found in ${path.basename(file)}.`);
  }
  if (/promptube-prod|infrastructure_/i.test(sql)) {
    throw new Error(
      `Migration references a forbidden external resource in ${path.basename(file)}.`,
    );
  }
}

console.log(`Checked ${sqlFiles.length} SQL migration file(s).`);
