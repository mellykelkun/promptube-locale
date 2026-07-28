#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import path from "node:path";

import { ensureBackupDirectory, run } from "./lib.mjs";

const POSTGRES_IMAGE =
  "postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e";

const backupDir = await ensureBackupDirectory();
const backups = (await readdir(backupDir)).filter((file) => file.endsWith(".dump")).sort();

if (backups.length === 0) {
  throw new Error("No backup dump found for restore test.");
}

const latestBackup = path.join(backupDir, backups.at(-1));
const containerName = `promptube-admin-restore-test-${process.pid}-${Date.now()}`;

async function stopContainer() {
  await run("docker", ["stop", "--time", "5", containerName], { stdio: "ignore" }).catch(
    () => undefined,
  );
  await run("docker", ["rm", containerName], { stdio: "ignore" }).catch(() => undefined);
}

try {
  await run("docker", [
    "run",
    "--rm",
    "--detach",
    "--name",
    containerName,
    "--network",
    "none",
    "--tmpfs",
    "/var/lib/postgresql:rw,size=256m",
    "--mount",
    `type=bind,source=${latestBackup},target=/tmp/promptube-admin-backup.dump,readonly`,
    "--env",
    "POSTGRES_PASSWORD=restore-test-password",
    POSTGRES_IMAGE,
  ]);

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await run(
        "docker",
        ["exec", containerName, "pg_isready", "-h", "/var/run/postgresql", "-U", "postgres"],
        {
          stdio: "ignore",
        },
      );
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  if (!ready) {
    throw new Error("Temporary restore PostgreSQL container did not become ready.");
  }

  await run("docker", ["exec", containerName, "createdb", "-U", "postgres", "restore_check"], {
    stdio: "ignore",
  });
  await run(
    "docker",
    [
      "exec",
      containerName,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      "restore_check",
      "/tmp/promptube-admin-backup.dump",
    ],
    { stdio: "ignore" },
  );
  await run(
    "docker",
    ["exec", containerName, "psql", "-U", "postgres", "-d", "restore_check", "-Atqc", "select 1"],
    { stdio: "ignore" },
  );

  console.log(
    "Backup archive restored successfully in an isolated temporary PostgreSQL container.",
  );
} finally {
  await stopContainer();
}
