#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { chmod, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  capture,
  decryptEncryptedFile,
  encryptReadableToFile,
  getOperationsPaths,
  projectDir,
  readBackupKey,
  run,
} from "./lib.mjs";

const projectName = "promptube_admin_rotation_test";
const composeFile = path.join(projectDir, "compose.rotation.yaml");
const paths = await getOperationsPaths();
const workDir = path.join(paths.restoreTestDir, `rotation-${process.pid}-${Date.now()}`);
const secretsDir = path.join(workDir, "secrets");
const envFile = path.join(workDir, "rotation.env");

function secret() {
  return randomBytes(32).toString("hex");
}

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
const redisSecretPath = path.join(secretsDir, "redis-password");
const postgresBootstrap = secret();
const postgresAppOld = secret();
const postgresAppNew = secret();
const postgresMigrationOld = secret();
const postgresMigrationNew = secret();
const redisOld = secret();
const redisNew = secret();
const backupOld = secret();
const backupNew = secret();

await writeFile(path.join(secretsDir, "postgres-password"), `${postgresBootstrap}\n`, {
  mode: 0o600,
});
await writeFile(redisSecretPath, `${redisOld}\n`, { mode: 0o600 });
await writeFile(path.join(secretsDir, "backup-old"), `${backupOld}\n`, { mode: 0o600 });
await writeFile(path.join(secretsDir, "backup-new"), `${backupNew}\n`, { mode: 0o600 });
await writeFile(envFile, `ROTATION_TEST_SECRETS_DIR=${secretsDir}\n`, { mode: 0o600 });

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
  ]);

  const psql = async (user, password, sql, expectSuccess = true) => {
    const args = [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      envFile,
      "--file",
      composeFile,
      "exec",
      "-T",
      "admin-rotation-postgres",
      "sh",
      "-ec",
      `PGPASSWORD="$1" psql -U "$2" -d rotation_check -v ON_ERROR_STOP=1 -c "$3" >/dev/null`,
      "sh",
      password,
      user,
      sql,
    ];
    try {
      await capture("docker", args);
      if (!expectSuccess) {
        throw new Error("Expected PostgreSQL authentication failure did not happen.");
      }
    } catch (error) {
      if (expectSuccess) {
        throw error;
      }
    }
  };

  const redisPing = async (password, expectSuccess = true) => {
    const args = [
      "compose",
      "--project-name",
      projectName,
      "--env-file",
      envFile,
      "--file",
      composeFile,
      "exec",
      "-T",
      "admin-rotation-redis",
      "sh",
      "-ec",
      'REDISCLI_AUTH="$1" redis-cli --no-auth-warning ping | grep -qx PONG',
      "sh",
      password,
    ];
    try {
      await capture("docker", args);
      if (!expectSuccess) {
        throw new Error("Expected Redis authentication failure did not happen.");
      }
    } catch (error) {
      if (expectSuccess) {
        throw error;
      }
    }
  };

  await psql(
    "postgres",
    postgresBootstrap,
    `create role promptube_rotation_app login password '${postgresAppOld}';
     create role promptube_rotation_migration login password '${postgresMigrationOld}';`,
  );
  await psql("promptube_rotation_app", postgresAppOld, "select 1");
  await psql(
    "postgres",
    postgresBootstrap,
    `alter role promptube_rotation_app password '${postgresAppNew}'`,
  );
  await psql("promptube_rotation_app", postgresAppOld, "select 1", false);
  await psql("promptube_rotation_app", postgresAppNew, "select 1");
  await psql(
    "postgres",
    postgresBootstrap,
    `alter role promptube_rotation_migration password '${postgresMigrationNew}'`,
  );
  await psql("promptube_rotation_migration", postgresMigrationOld, "select 1", false);
  await psql("promptube_rotation_migration", postgresMigrationNew, "select 1");

  const redisTemporary = `${redisSecretPath}.tmp`;
  await writeFile(redisTemporary, `${redisNew}\n`, { mode: 0o600 });
  await chmod(redisTemporary, 0o600);
  await rename(redisTemporary, redisSecretPath);
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
    "--force-recreate",
    "--no-deps",
    "--wait",
    "--wait-timeout",
    "120",
    "admin-rotation-redis",
  ]);
  let redisReady = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await redisPing(redisNew);
      redisReady = true;
      break;
    } catch {
      await setTimeout(500);
    }
  }
  if (!redisReady) {
    throw new Error("Redis did not accept the rotated secret after restart.");
  }
  let oldRedisRejected = false;
  try {
    await redisPing(redisOld);
  } catch {
    oldRedisRejected = true;
  }
  if (!oldRedisRejected) {
    throw new Error("Old Redis password was accepted after rotation.");
  }
  await redisPing(redisNew);

  const oldKey = await readBackupKey(path.join(secretsDir, "backup-old"));
  const newKey = await readBackupKey(path.join(secretsDir, "backup-new"));
  const oldEncrypted = path.join(workDir, "old.pgdump.aes256gcm");
  const newEncrypted = path.join(workDir, "new.pgdump.aes256gcm");
  const archive = Buffer.from("operation backup rotation test archive");
  const oldStream = await import("node:stream").then(({ Readable }) => Readable.from(archive));
  await encryptReadableToFile(oldStream, oldEncrypted, oldKey, { rotation: "old" });
  await decryptEncryptedFile(oldEncrypted, oldKey);
  let wrongKeyRejected = false;
  try {
    await decryptEncryptedFile(oldEncrypted, newKey);
  } catch {
    wrongKeyRejected = true;
  }
  if (!wrongKeyRejected) {
    throw new Error("Old encrypted backup was accepted by the new key.");
  }
  const newStream = await import("node:stream").then(({ Readable }) => Readable.from(archive));
  await encryptReadableToFile(newStream, newEncrypted, newKey, { rotation: "new" });
  await decryptEncryptedFile(newEncrypted, newKey);

  console.log("Secret rotation test succeeded in isolated PostgreSQL/Redis environment.");
} finally {
  await cleanup();
}
