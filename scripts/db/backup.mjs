#!/usr/bin/env node
import path from "node:path";

import { chmod, readFile } from "node:fs/promises";

import { ensureBackupDirectory, run, sha256, writePrivateFile } from "./lib.mjs";

const backupDir = await ensureBackupDirectory();
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupDir, `promptube-admin-${timestamp}.dump`);

await run("sh", [
  "-c",
  `umask 077
./scripts/docker-compose.sh exec -T admin-promptube-postgres sh -ec 'pg_dump -Fc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"' > "$1"`,
  "sh",
  backupFile,
]);

await chmod(backupFile, 0o600);
const backupBytes = await readFile(backupFile);
const digest = sha256(backupBytes);
await writePrivateFile(`${backupFile}.sha256`, `${digest}  ${path.basename(backupFile)}\n`);
await run(
  "sh",
  [
    "-c",
    `./scripts/docker-compose.sh exec -T admin-promptube-postgres pg_restore -l < "$1" >/dev/null`,
    "sh",
    backupFile,
  ],
  { stdio: "ignore" },
);
console.log(`Backup created: ${path.relative(process.cwd(), backupFile)}`);
console.log(`Backup SHA-256: ${digest}`);
