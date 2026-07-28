import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  lstat,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

export const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const postgresImage =
  "postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e";

const encryptedMagic = Buffer.from("PTBK1\n", "utf8");

export function relativeToProject(filePath) {
  return path.relative(projectDir, filePath);
}

export function sha256Buffer(data) {
  return createHash("sha256").update(data).digest("hex");
}

export async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function assertSafeDirectory(directory, { create = true } = {}) {
  if (await pathExists(directory)) {
    const linkEntry = await lstat(directory);
    if (linkEntry.isSymbolicLink()) {
      throw new Error("Operational path must not be a symbolic link.");
    }
    const entry = await stat(directory);
    if (!entry.isDirectory()) {
      throw new Error("Operational path is not a directory.");
    }
  } else if (create) {
    await mkdir(directory, { mode: 0o700, recursive: true });
  } else {
    throw new Error("Operational directory does not exist.");
  }

  const resolved = path.resolve(directory);
  const projectResolved = path.resolve(projectDir);
  const allowExternal = process.env.PROMPTUBE_ALLOW_EXTERNAL_BACKUP_DIR === "1";
  if (
    !allowExternal &&
    resolved !== projectResolved &&
    !resolved.startsWith(`${projectResolved}${path.sep}`)
  ) {
    throw new Error("External backup directories require PROMPTUBE_ALLOW_EXTERNAL_BACKUP_DIR=1.");
  }

  await chmod(directory, 0o700);
  return resolved;
}

export async function getOperationsPaths() {
  const baseDir = await assertSafeDirectory(
    process.env.PROMPTUBE_BACKUP_DIR
      ? path.resolve(process.env.PROMPTUBE_BACKUP_DIR)
      : path.join(projectDir, ".local"),
  );
  const backupDir = await assertSafeDirectory(path.join(baseDir, "backups", "postgres"));
  const manifestDir = await assertSafeDirectory(path.join(baseDir, "backup-manifests"));
  const restoreTestDir = await assertSafeDirectory(path.join(baseDir, "restore-tests"));
  const reportsDir = await assertSafeDirectory(path.join(baseDir, "reports"));

  return {
    backupDir,
    baseDir,
    manifestDir,
    reportsDir,
    restoreTestDir,
  };
}

export async function readHexSecret(secretPath) {
  const linkEntry = await lstat(secretPath);
  if (linkEntry.isSymbolicLink()) {
    throw new Error("Secret path must not be a symbolic link.");
  }
  const entry = await stat(secretPath);
  if (!entry.isFile()) {
    throw new Error("Secret path must be a regular file.");
  }
  if ((entry.mode & 0o777) !== 0o600) {
    throw new Error("Secret file must have mode 600.");
  }
  const value = (await readFile(secretPath, "utf8")).trim();
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error("Secret file must contain 32 bytes encoded as 64 hexadecimal characters.");
  }
  return Buffer.from(value, "hex");
}

export async function readBackupKey(
  secretPath = path.join(projectDir, "secrets", "backup-encryption-key"),
) {
  return readHexSecret(secretPath);
}

export function manifestMac(manifest, key) {
  const unsigned = { ...manifest };
  delete unsigned.manifestMac;
  const payload = JSON.stringify(unsigned);
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function attachManifestMac(manifest, key) {
  return {
    ...manifest,
    manifestMac: manifestMac(manifest, key),
  };
}

export function verifyManifestMac(manifest, key) {
  if (!manifest.manifestMac || manifest.manifestMac !== manifestMac(manifest, key)) {
    throw new Error("Backup manifest MAC verification failed.");
  }
}

export async function writeJsonPrivate(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await chmod(filePath, 0o600);
}

export async function encryptReadableToFile(readable, destination, key, metadata = {}) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const header = Buffer.from(
    `${encryptedMagic.toString("utf8")}${JSON.stringify({
      algorithm: "AES-256-GCM",
      iv: iv.toString("base64url"),
      metadata,
      version: 1,
    })}\n\n`,
    "utf8",
  );
  const handle = await open(destination, "wx", 0o600);
  await handle.write(header);
  await handle.close();

  const output = createWriteStream(destination, { flags: "a", mode: 0o600 });
  await pipeline(readable, cipher, output);
  const tag = cipher.getAuthTag();
  const appendHandle = await open(destination, "a", 0o600);
  await appendHandle.write(tag);
  await appendHandle.close();
  await chmod(destination, 0o600);

  return {
    algorithm: "AES-256-GCM",
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url"),
  };
}

export async function decryptEncryptedFile(filePath, key) {
  const encrypted = await readFile(filePath);
  if (!encrypted.subarray(0, encryptedMagic.length).equals(encryptedMagic)) {
    throw new Error("Unsupported backup encryption format.");
  }
  const separator = encrypted.indexOf(Buffer.from("\n\n", "utf8"), encryptedMagic.length);
  if (separator < 0) {
    throw new Error("Encrypted backup header is incomplete.");
  }
  const headerJson = encrypted.subarray(encryptedMagic.length, separator).toString("utf8");
  const header = JSON.parse(headerJson);
  if (header.version !== 1 || header.algorithm !== "AES-256-GCM") {
    throw new Error("Unsupported encrypted backup header.");
  }
  const body = encrypted.subarray(separator + 2);
  if (body.length < 17) {
    throw new Error("Encrypted backup body is incomplete.");
  }
  const ciphertext = body.subarray(0, -16);
  const tag = body.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(header.iv, "base64url"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectDir,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

export function capture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectDir,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
    child.on("error", reject);
  });
}

export function captureBuffer(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectDir,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout.push(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
    child.on("error", reject);
  });
}

export async function assertPgRestoreCanList(plainArchive) {
  await pipeBufferToDocker(
    plainArchive,
    [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--tmpfs",
      "/work:rw,noexec,nosuid,size=96m",
      postgresImage,
      "sh",
      "-ec",
      "cat >/work/archive.dump && pg_restore -l /work/archive.dump >/dev/null",
    ],
    "pg_restore list failed",
  );
}

export function pipeBufferToDocker(buffer, args, errorMessage) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      cwd: projectDir,
      stdio: ["pipe", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${errorMessage}: ${stderr.trim()}`));
    });
    child.on("error", reject);
    child.stdin.end(buffer);
  });
}

export async function listBackupManifests(manifestDir) {
  const entries = await readdir(manifestDir).catch(() => []);
  const manifests = [];
  for (const entry of entries.filter((name) => name.endsWith(".json")).sort()) {
    const filePath = path.join(manifestDir, entry);
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    manifests.push({ filePath, manifest: parsed });
  }
  return manifests;
}

export async function removeFileIfExists(filePath) {
  if (await pathExists(filePath)) {
    await rm(filePath, { force: false });
  }
}

export async function atomicWriteJson(filePath, data) {
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await writeJsonPrivate(temporaryPath, data);
  await rename(temporaryPath, filePath);
  await chmod(filePath, 0o600);
}

export function backupIdNow(prefix = "backup") {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}`;
}

export async function currentMigrationDigest() {
  const migration = await readFile(
    path.join(projectDir, "drizzle", "0000_init_admin_identity.sql"),
  );
  return sha256Buffer(migration);
}
